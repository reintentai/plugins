#!/usr/bin/env node
// UserPromptSubmit hook: until the agent searches Reintent for the current task, add one
// line to each user message reminding it to search before building. It goes quiet after a
// reintent_search, and starts again after the next reintent_log_task (a new task).
// It reads only the local transcript and sends nothing.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const REMINDER =
  "Reintent: if this request builds, fixes or debugs something non-trivial, call reintent_search before you " +
  "start (skip it for questions, chat or trivial edits).";

/** True when no reintent_search has happened since the last task log (or ever). */
export function needsSearch(lines) {
  let searched = false;
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
      if (tool === "reintent_search") searched = true;
      if (tool === "reintent_log_task") searched = false;
    }
  }
  return !searched;
}

/** The context to add for this prompt, or null. Slash commands bring their own instructions. */
export function contextFor(prompt, lines) {
  if (typeof prompt === "string" && prompt.trimStart().startsWith("/")) return null;
  return needsSearch(lines) ? REMINDER : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {}
  let lines = [];
  try {
    if (input.transcript_path) lines = readFileSync(input.transcript_path, "utf8").split("\n");
  } catch {}
  const context = contextFor(input.prompt, lines);
  if (context) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context } }));
  }
}
