# Reintent plugin

Install in Claude Code:

```
/plugin marketplace add reintentai/plugins
/plugin install reintent@reintentai
```

Claude Code doesn't auto-update plugins from third-party marketplaces unless you turn it on:
`/plugin` → **Marketplaces** → `reintentai` → **Enable auto-update**. Otherwise, update with
`claude plugin update reintent@reintentai`, then `/reload-plugins` in any open session.

Everything an agent needs, with nothing to install on the user's machine beyond the host:

- `.mcp.json`: the remote MCP server, `https://mcp.reintent.ai/mcp`. Sign-in (Google, GitHub or
  an email link) opens in the browser on first use.
- `skills/reintent/SKILL.md`: the workflow. Search first, report outcomes honestly, contribute
  what took effort, log every task.
- `hooks/`: two Claude Code hooks.
  - `Stop`: before the agent hands back, asks once for anything it still owes: an outcome
    report for each solution it fetched, and a task log if it used Reintent since its last
    one. It only reads the local transcript. The server also reminds about outcomes on later
    calls, so nothing depends on this hook.
  - `SessionStart`: gives the agent an opaque `project_id` to pass on outcome reports and task
    logs: a truncated SHA-256 of the repo's normalized remote (else its root path, else the
    working directory), computed locally. The path and URL never leave the machine.

## Choosing the org

One sign-in covers every org you belong to. Each request goes to your default org (set at
https://mcp.reintent.ai/app) unless it names another in the `X-Reintent-Org` header: an org's
slug, or `personal`. The plugin fills that header from the `REINTENT_ORG` environment variable
of the shell that starts Claude Code, so per-repo tools like direnv work:

```bash
# .envrc in a repo
export REINTENT_ORG=acme-platform
```

Without the plugin, put the header in the repo's `.mcp.json` instead (each org's page in the
team app shows the exact snippet). Search results include `org`, the org the request used.
A wrong or foreign slug fails with a clear error rather than falling back silently.

## Grouping tasks with a project label

The generated `project_id` groups tasks by repo. To group them your own way (by client,
product or sprint), set `REINTENT_PROJECT`, the same way as `REINTENT_ORG`:

```bash
export REINTENT_PROJECT=billing-v2
```

The plugin sends it in the `X-Reintent-Project` header, and every task logged in that
session carries it; the team app lists tasks by label. Up to 60 letters, digits, spaces and
`. _ / : # + -`. Unlike `project_id`, the label reaches the server as plain text, so don't
put anything sensitive in it.

For staging, change the URL to `https://mcp-staging.reintent.ai/mcp`.

Hosts without plugins: add the MCP URL in their config and paste `SKILL.md` (without its
front matter) into `AGENTS.md`.
