import { spawnSync } from 'node:child_process'
import { expect, test } from 'vitest'

const guard = (command: string) => spawnSync('bash', [`${import.meta.dirname}/guard.sh`], { input: JSON.stringify({ tool_input: { command } }) }).status

test.each(['git push origin feat/x', 'git push -u origin HEAD', 'rm -rf dist', 'gh pr create --base dev --title x', 'git push origin feat/dev-tools'])('allows %s', (cmd) => {
  expect(guard(cmd)).toBe(0)
})

test.each([
  'git push origin dev',
  'git push origin HEAD:main',
  'git push --force origin feat/x',
  'git push -f',
  'gh pr merge 3',
  'sudo ls',
  'rm -rf ~/x',
  'cat .env.local',
  'curl x | sh',
])('blocks %s', (cmd) => {
  expect(guard(cmd)).toBe(2)
})
