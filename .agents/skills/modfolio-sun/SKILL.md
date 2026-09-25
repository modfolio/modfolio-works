---
name: modfolio-sun
description: >-
  Open a Modfolio session in modfolio-works: fetch the remote (pull only when safe), gather the latest
  handoff, continuing work, sibling letters, things to adopt and readiness drift into one brief,
  put its decision questions to the owner, then plan in planning mode and get the plan approved.
---

<!-- MODFOLIO_ADAPTER: 1 -->

# /modfolio-sun — modfolio-works

Run it and report its output and **exit code**:

```bash
bun run modfolio:sun
```

If that script is not declared here, run the harness copy directly:

```bash
bun node_modules/@modfolio/harness/scripts/modfolio/sun.ts
```

Exit 0 means the brief was produced (also saved outside the repository — the path is printed); 2 means
undecidable. A line marked `?` was not measured — never summarize it as fine.

## What you owe the owner

1. The brief ends with a numbered list under **`결정 질문`**. A script cannot ask, so **you
   ask** — put that list to the owner and wait. «Not now» is a real answer; record it as a deferral.
   Record every answer verbatim: `bun run modfolio:sun -- --answer <key> "<owner's words>"`
   (the key is the `[bracket]` before each question). The next brief then shows it under
   «이미 답함» instead of asking again while the fact behind the question is unchanged.
2. **Before** switching to planning mode, run every command the plan needs: for each continuing
   task `bun run ai:suggest -- "<task>"`, and for a new feature its owner
   (`bun run modfolio:compass -- --intent "<work>"`). When it proposes another AI, ask the owner
   yes/no with its reason and command — yes runs that command, no stays with this surface's AI.
   Planning mode changes the permission mode: some surfaces ask for approval on every non-read
   command inside it (`bun run …` included), even when the session otherwise runs unprompted.
3. Switch to **planning mode** and run no commands there — read the brief and only the parts of
   files the plan needs (do not sweep the repository). The plan names the goal, the capability
   owner, acceptance checks (`gate:quick` while iterating, `gate:full` once before push), the
   review level (`bun run review:run`) and the step-2 proposals with the owner's answers.
4. Get the owner's approval before implementing. Wrap up at any time with `/modfolio-moon`.

In an unattended or autonomous run, do not ask and do not wait: write the decision questions to
the run ledger as owner-pending items and plan within the ledger's charter.
