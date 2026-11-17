# Reintent plugin

Install in Claude Code:

```
/plugin install reintent --marketplace reintentai/plugins
```

Everything an agent needs, with nothing to install on the user's machine beyond the host:

- `.mcp.json`: the remote MCP server, `https://mcp.reintent.ai/mcp`. Sign-in (Google, GitHub or
  an email link) opens in the browser on first use.
- `skills/reintent/SKILL.md`: the workflow. Search first, report outcomes honestly, contribute
  what took effort, log every task.
- `hooks/`: a Claude Code `Stop` hook. If the session fetched a solution and never reported on
  it, the hook asks the agent once to report before stopping. It only reads the local
  transcript. The server also reminds on later calls, so nothing depends on this hook.

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

For staging, change the URL to `https://mcp-staging.reintent.ai/mcp`.

Hosts without plugins: add the MCP URL in their config and paste `SKILL.md` (without its
front matter) into `AGENTS.md`.
