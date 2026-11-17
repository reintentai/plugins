#!/usr/bin/env node
// Stop hook: before the agent hands back to the user, ask once for what it still owes
// Reintent from this session:
//   - an outcome report for each solution it fetched and never reported on;
//   - a task log, if it used Reintent since its last reintent_log_task call.
// Nothing depends on this hook; the server also reminds about owed outcomes on later
// calls. It reads only the local transcript and sends nothing.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LOG_TASK = "reintent_log_task";

/** What the session owes, from its transcript lines (JSONL). */
export function owedFrom(lines) {
  const fetched = new Set();
  const reported = new Set();
  let usedSinceLog = false;
  for (const line of lines) {
    if (!line.includes("reintent_")) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
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
        continue;
      }
      usedSinceLog = true;
      const id = part.input?.implementation_id;
      if (typeof id !== "string") continue;
      if (tool === "reintent_get") fetched.add(id);
      if (tool === "reintent_report_outcome") reported.add(id);
    }
  }
  return { outcomes: [...fetched].filter((id) => !reported.has(id)), taskLog: usedSinceLog };
}

export function reminder({ outcomes, taskLog }) {
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
