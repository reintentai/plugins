#!/usr/bin/env node
// Stop hook: if this session fetched a Reintent solution and never reported how it went,
// ask the agent once to report before it stops. Nothing depends on this hook; the server
// also reminds on later calls. It reads only the local transcript and sends nothing.

import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
// Already reminded in this stop cycle: let the agent stop.
if (input.stop_hook_active || !input.transcript_path) process.exit(0);

let lines;
try {
  lines = readFileSync(input.transcript_path, "utf8").split("\n");
} catch {
  process.exit(0);
}

const fetched = new Set();
const reported = new Set();
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
    const id = part.input?.implementation_id;
    if (typeof id !== "string") continue;
    if (part.name.endsWith("reintent_get")) fetched.add(id);
    if (part.name.endsWith("reintent_report_outcome")) reported.add(id);
  }
}

const owed = [...fetched].filter((id) => !reported.has(id));
if (owed.length === 0) process.exit(0);

console.log(
  JSON.stringify({
    decision: "block",
    reason:
      `You used Reintent solution(s) ${owed.join(", ")} this session without reporting how they went. ` +
      "If you know the outcome, call reintent_report_outcome for each (with the real test command and exit " +
      "code if you ran tests). If you don't know yet, say so briefly and stop.",
  }),
);
