#!/usr/bin/env node
// Stop hook: before the agent hands back to the user, ask once for what it still owes
// Reintent from this session:
//   - an outcome report for each solution it fetched and never reported on;
//   - a task log, if it used Reintent since its last reintent_log_task call;
//   - for a task logged this turn that took several attempts and saved nothing, whether
//     anything learned (even in passing) is worth a gotcha or contribution;
//   - for a task logged with searched: false, to search first next time.
// Nothing depends on this hook; the server also reminds about owed outcomes on later
// calls. It reads only the local transcript and sends nothing.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LOG_TASK = "reintent_log_task";
/** Calls that aren't task work: sending feedback about Reintent shouldn't ask for a task log. */
const NOT_TASK_WORK = new Set(["reintent_feedback"]);

/** A message the user typed (not a tool result): where the current turn starts. */
function isUserTurn(entry) {
  if (entry?.type !== "user" || entry.isMeta) return false;
  const c = entry.message?.content;
  return typeof c === "string" || (Array.isArray(c) && c.some((p) => p?.type === "text"));
}

/** What the session owes, from its transcript lines (JSONL). */
export function owedFrom(lines) {
  const fetched = new Set();
  const reported = new Set();
  let usedSinceLog = false;
  /** Task logs since the user's last message, to follow up on once. */
  let logsThisTurn = [];
  for (const line of lines) {
    const userLine = line.includes('"type":"user"');
    if (!line.includes("reintent_") && !userLine) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (isUserTurn(entry)) {
      logsThisTurn = [];
      continue;
    }
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type !== "tool_use" || typeof part.name !== "string") continue;
      const tool = /(?:^|__)(reintent_[a-z_]+)$/.exec(part.name)?.[1];
      if (!tool) continue;
      if (tool === LOG_TASK) {
        usedSinceLog = false;
        logsThisTurn.push(part.input ?? {});
        continue;
      }
      if (NOT_TASK_WORK.has(tool)) continue;
      usedSinceLog = true;
      const id = part.input?.implementation_id;
      if (typeof id !== "string") continue;
      if (tool === "reintent_get") fetched.add(id);
      if (tool === "reintent_report_outcome") reported.add(id);
    }
  }
  const saved = (t) => (t.gotchas_added?.length ?? 0) + (t.solutions_contributed?.length ?? 0) > 0;
  const hard = logsThisTurn.filter((t) => Number(t.attempts) > 1 && !saved(t));
  return {
    outcomes: [...fetched].filter((id) => !reported.has(id)),
    taskLog: usedSinceLog,
    unsearched: logsThisTurn.some((t) => t.searched === false),
    hardUnsaved: hard.length ? Math.max(...hard.map((t) => Number(t.attempts))) : 0,
  };
}

export function reminder({ outcomes, taskLog, unsearched = false, hardUnsaved = 0 }) {
  const asks = [];
  if (outcomes.length) {
    asks.push(
      `You used Reintent solution(s) ${outcomes.join(", ")} this session without reporting how they went. ` +
        "If you know the outcome, call reintent_report_outcome for each (with the real test command and exit " +
        "code if you ran tests).",
    );
  }
  if (taskLog) {
    asks.push(
      "You used Reintent since you last called reintent_log_task. If you've finished the user's request, " +
        "log it now with reintent_log_task and give the user the task_url.",
    );
  }
  if (hardUnsaved) {
    asks.push(
      `The task you just logged took ${hardUnsaved} attempts and saved nothing to Reintent. If anything you learned ` +
        "would save another agent that time, including things you found in passing about a service or tool, save it " +
        "now: reintent_add_gotcha with the task_id, or reintent_contribute for working code. If it was only a " +
        "mistake of your own, there's nothing to save.",
    );
  }
  if (unsearched) {
    asks.push("You logged a task with searched: false. For the next task that builds or fixes something, call reintent_search first.");
  }
  if (!asks.length) return null;
  return `${asks.join(" ")} If you're mid-task or waiting on the user, say so briefly and stop.`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {}
  // Already reminded in this stop cycle: let the agent stop.
  if (input.stop_hook_active || !input.transcript_path) process.exit(0);
  let lines;
  try {
    lines = readFileSync(input.transcript_path, "utf8").split("\n");
  } catch {
    process.exit(0);
  }
  const reason = reminder(owedFrom(lines));
  if (reason) console.log(JSON.stringify({ decision: "block", reason }));
}
