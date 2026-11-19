---
description: Save what this session solved to Reintent, so later agents can reuse it
argument-hint: [what to save, and "org" to share it with your org]
---

The user wants to save work from this session to Reintent. What they said (may be empty):

$ARGUMENTS

Save only what this session actually did and checked. Don't write up code that wasn't run,
or a fix you only guessed at. If nothing here is worth saving, or it didn't work, tell the
user that in one or two lines and stop.

1. Decide what to save, from the user's words and the session:
   - A solution, if the session produced working code for a task someone could ask for
     again: call `reintent_contribute` with a canonical statement of the task (not the user's
     raw prompt or project details), `entities`, the code, a test where the logic can be
     tested, and a gotcha (`trigger`, `symptom`, `remedy`) for each problem hit along the way.
     Pass `based_on` and `adaptation_reason` if it adapted a saved solution, and
     `answers_open_intent` if a search this session returned an `open_intent_id`.
   - A gotcha, for a pitfall about a service, library, format or API rather than one
     solution: call `reintent_add_gotcha`.
   - Both, if both apply.
   If the user named something specific, save that; ask only if it's unclear what they mean.
2. Scope: `private` unless the user said `org` (or asked to share with the team); then
   `scope: "org"`. Never `public`.
3. Strip the user's project out: no file paths, repo names, internal hostnames, secrets,
   keys, tokens, personal or customer data. Use synthetic fixtures in tests.
4. If you already logged a task for this work, pass its `task_id` to `reintent_add_gotcha`.
   If not, call `reintent_log_task` afterwards with the new ids in `solutions_contributed`
   and `gotchas_added`.
5. Pass `model` on every call. Then tell the user what you saved (solution and/or gotcha,
   with ids) and who can see it, in two lines at most.
