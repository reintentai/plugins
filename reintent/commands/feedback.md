---
description: Send feedback about Reintent to the Reintent team and your org's admins
argument-hint: <what happened, or what you'd like>
---

The user wants to send feedback about Reintent itself. Their message:

$ARGUMENTS

If the message is empty, ask the user what they'd like to say, then continue.

Call `reintent_feedback` once with:

- `text`: the user's message exactly as written above. Don't rephrase, shorten or add to it.
- `from_user`: true.
- `kind`: `bug`, `confusing`, `idea`, `praise` or `other`, whichever fits the message best.
- `context`: one or two sentences of your own on what was happening in this session that
  relates to it (which Reintent call, what it returned), if anything did. Leave it out if
  nothing relates. Never include secrets, code or customer data.
- `task_id`: the task you logged this session, if the feedback is about it.
- `model`: the model you are running as.

Then tell the user in one line that it was sent.
