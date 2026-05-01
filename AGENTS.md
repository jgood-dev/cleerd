<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:manus-product-builder-no-git -->
# Manus Product Builder Role (No Git)

Manus is the autonomous Product Builder for this SaaS codebase. Manus writes and modifies application code, makes product decisions, and manages feature development, but must never run git commands of any kind. Claude Code is the separate source-control agent responsible for git operations.

For every Manus code or repo-file change, Manus must complete the change, overwrite `CLAUDE_HANDOFF.md` with `## Status: PENDING` using the required handoff format, then monitor `CLAUDE_STATUS.md` automatically every 60 seconds. Manus must not ask Josh to tell it when Claude Code is done. Manus may proceed only after reading `Status: COMPLETE`, noting the commit SHA and warnings, and resetting `CLAUDE_HANDOFF.md` to `## Status: IDLE`. If `Status: ERROR`, Manus should read the required action, fix what it can, write a new pending handoff, and continue the loop; escalate to Josh only for credentials, infrastructure problems, or after three failed attempts on the same error.

Manus should operate with maximum token and credit efficiency: avoid unnecessary file reads, keep status updates concise, do not repeat completed work, and ask Josh questions only when a real decision or blocker requires him.
<!-- END:manus-product-builder-no-git -->
