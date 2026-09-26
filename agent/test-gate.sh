#!/usr/bin/env bash
# Stop hook for the Telegram agent: it can't finish while build or tests are red (exit 2 sends it back to work).
grep -q '"stop_hook_active":[[:space:]]*true' && exit 0 # already sent back once; don't loop forever
git diff --quiet origin/dev -- && exit 0                 # nothing changed (clarification / rejected)
if ! out=$( (pnpm build && pnpm test) 2>&1); then
  echo "Build/test failing, fix before finishing:" >&2
  printf '%s\n' "$out" | tail -30 >&2
  exit 2
fi
exit 0
