#!/usr/bin/env bash
# PreToolUse(Bash) hook for the Telegram agent. Exit 2 blocks the command and tells Claude why.
# ponytail: pattern matching is best-effort; branch protection on main/dev in GitHub is the real wall.
CMD=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.command||"")}catch{}})')
deny() { echo "BLOCKED: $1" >&2; exit 2; }
has() { printf '%s' "$CMD" | grep -Eq "$1"; }

has 'git[[:space:]].*push.*(--force|[[:space:]]-f([[:space:]]|$)|[[:space:]]\+)' && deny 'force push'
has 'git[[:space:]].*push.*[[:space:]:](main|dev)([[:space:]]|$)' && deny 'push to main/dev: push your own feature branch'
has 'gh[[:space:]]+pr[[:space:]]+(merge|close)' && deny 'the human reviews and merges'
has '(^|[;&|[:space:]])sudo[[:space:]]' && deny 'sudo'
has 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*[[:space:]]+(/|~)' && deny 'recursive delete outside the repo'
has '\.env\.local' && deny 'secrets'
has 'curl[^|]*\|[[:space:]]*(ba|z)?sh' && deny 'pipe to shell'
exit 0
