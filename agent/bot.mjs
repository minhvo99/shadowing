// Telegram → `claude -p` (skill ship-request) → PR into dev → PR link back on Telegram.
// Runs on your machine: `pnpm agent`. Needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env.local and `gh auth login`.
// Each request gets its own git worktree off origin/dev, so your working copy is never touched.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

const HERE = import.meta.dirname
const REPO = path.dirname(HERE)
const BASE = 'dev'
const { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT = '', MAX_BUDGET_USD = '5', MAX_TURNS = '80' } = process.env
if (!TOKEN) {
  console.error('Set TELEGRAM_BOT_TOKEN in .env.local (create a bot with @BotFather)')
  process.exit(2)
}

const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())
const say = (text, extra) => tg('sendMessage', { chat_id: CHAT, text, disable_web_page_preview: true, ...extra })
const git = (...args) => spawnSync('git', args, { cwd: REPO, encoding: 'utf8' })

const task = readFileSync(path.join(HERE, 'task.md'), 'utf8')
const schema = readFileSync(path.join(HERE, 'result-schema.json'), 'utf8')
// Hooks point at this checkout, not the worktree, so a request can't rewrite its own guard.
const hook = (file) => [{ type: 'command', command: JSON.stringify(path.join(HERE, file)) }]
const settings = JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: hook('guard.sh') }], Stop: [{ hooks: hook('test-gate.sh') }] } })
const TOOLS = ['Skill', 'Agent', 'Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob']

const claude = (cwd, request) =>
  new Promise((resolve) => {
    const env = { ...process.env }
    delete env.TELEGRAM_BOT_TOKEN
    const args = [
      '-p',
      '--permission-mode',
      'dontAsk',
      '--tools',
      TOOLS.join(','),
      '--allowedTools',
      ...TOOLS,
      '--settings',
      settings,
      '--strict-mcp-config',
      '--mcp-config',
      '{"mcpServers":{}}',
      '--output-format',
      'stream-json',
      '--verbose',
      '--json-schema',
      schema,
      '--max-budget-usd',
      MAX_BUDGET_USD,
      '--max-turns',
      MAX_TURNS,
      task.replace('{{REQUEST}}', request), // last: the variadic flags above would swallow it
    ]
    const child = spawn('claude', args, { cwd, env, stdio: ['ignore', 'pipe', 'inherit'] })
    let result
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      let m
      try {
        m = JSON.parse(line)
      } catch {
        return
      }
      if (m.type === 'result') result = m
      else if (m.type === 'assistant')
        for (const c of m.message.content)
          if (c.type === 'tool_use') console.log('  ▸', c.name, String(c.input.command ?? c.input.file_path ?? c.input.description ?? c.input.skill ?? '').slice(0, 100))
    })
    child.on('close', () => resolve(result))
  })

const ICON = { pr_opened: '✅', needs_clarification: '❓', rejected: '🚫' }

async function handle(request) {
  await say(`⏳ Nhận việc: ${request}`)
  const dir = mkdtempSync(path.join(tmpdir(), 'shadowing-agent-'))
  try {
    git('fetch', 'origin', BASE)
    if (git('worktree', 'add', '--detach', dir, `origin/${BASE}`).status) throw new Error('git worktree add failed')
    if (spawnSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: dir, stdio: 'inherit' }).status) throw new Error('pnpm install failed')
    const t0 = Date.now()
    const out = await claude(dir, request)
    const meta = `⏱ ${((Date.now() - t0) / 60000).toFixed(1)} phút · 💸 $${out?.total_cost_usd?.toFixed(2) ?? '?'}`
    const r = out?.structured_output
    if (!r) return await say(`⚠️ Agent không trả kết quả hợp lệ${out?.is_error ? `: ${String(out.result).slice(0, 300)}` : ''}\n${meta}`)
    const text = [`${ICON[r.action] ?? ''} ${r.summary}`, r.question, r.pr_url, meta].filter(Boolean).join('\n\n')
    await say(text, r.pr_url ? { reply_markup: { inline_keyboard: [[{ text: '🔗 Review PR', url: r.pr_url }]] } } : undefined)
  } catch (e) {
    await say(`⚠️ ${e.message}`)
  } finally {
    git('worktree', 'remove', '--force', dir)
  }
}

// ponytail: one request at a time; later messages wait in Telegram's queue (kept 24h). Parallel runs if that gets slow.
let offset = 0
console.log(`[agent] polling Telegram for ${REPO}`)
for (;;) {
  const { result: updates = [] } = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] }).catch(() => new Promise((r) => setTimeout(() => r({}), 5000)))
  for (const u of updates) {
    offset = u.update_id + 1
    const msg = u.message
    if (!msg?.text) continue
    // Only your chat may give orders. First run without TELEGRAM_CHAT_ID: message the bot to learn your id.
    if (String(msg.chat.id) !== CHAT) {
      if (!CHAT) await tg('sendMessage', { chat_id: msg.chat.id, text: `TELEGRAM_CHAT_ID=${msg.chat.id}` })
      continue
    }
    if (msg.text.startsWith('/')) continue // Telegram commands like /start aren't requests
    await handle(msg.text)
  }
}
