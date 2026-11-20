#!/usr/bin/env node
// SessionStart hook: give the agent an opaque project id to pass as `project_id` on
// Reintent outcome reports and task logs. Reintent uses it only to notice which tasks
// keep turning up together in one project.
//
// Privacy: everything happens on this machine. The id is a truncated SHA-256 of the
// repo's identity (its normalized origin remote, else its root path, else the working
// directory). The path and URL are never printed or sent; this hook makes no network calls.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** One form for the same repo however it was cloned: host/owner/repo, lowercase, no credentials. */
export function normalizeRemote(remote) {
  const r = String(remote ?? "").trim();
  if (!r) return null;
  let host;
  let path;
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/\/)(.+)$/.exec(r); // git@github.com:owner/repo.git
  if (scp) {
    [, host, path] = scp;
  } else {
    try {
      const u = new URL(r);
      if (u.protocol === "file:") return null;
      host = u.hostname;
      path = u.pathname;
    } catch {
      return null;
    }
  }
  path = path.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
  return host && path ? `${host}/${path}`.toLowerCase() : null;
}

export function projectId(identity) {
  return createHash("sha256").update(`reintent-project-v1\0${identity}`).digest("hex").slice(0, 32);
}

function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function identityFor(cwd) {
  const remote = normalizeRemote(git(cwd, ["remote", "get-url", "origin"]));
  if (remote) return `remote:${remote}`;
  const root = git(cwd, ["rev-parse", "--show-toplevel"]);
  return `path:${root || cwd}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {}
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const id = projectId(identityFor(cwd));
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          `Reintent project_id for this project: ${id}. Pass it as project_id on reintent_search, ` +
          "reintent_report_outcome and reintent_log_task, and on reintent_add_gotcha with project_only: true for a " +
          "pitfall true only of this codebase. It is an opaque hash computed on this machine.",
      },
    }),
  );
}
