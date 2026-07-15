// plan-state — read-only state digest for a Plan (PLAN.md).
//
// Zero dependencies, single ES module. Invoke as: `node plan-state.mjs [flags]`.
// It NEVER writes: it parses PLAN.md, joins it against the declared change
// engine's ground truth, and prints a compact digest the agent acts on. The
// agent still owns every transition and every edit. If parsing or the engine
// query fails, it degrades to a plan-only (or empty) digest — never crashes.
//
// Flags:
//   --validate     drift-focused digest; exit 1 if drift is found
//   --json         emit the same data as a machine object
//   --plan <path>  use an explicit PLAN.md instead of searching
//   --cwd <dir>    directory to search from (default: process.cwd())
//   -h, --help     usage
//
// Design source of truth: ../../DESIGN.md (artifact shape, R1–R7, state table).
// Parsing is deliberately forgiving (DESIGN.md: "no strict schema").

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// ── Engine registry (the seam) ──────────────────────────────────────────────
// The plan header declares its engine; we drive whatever is declared, defaulting
// to OpenSpec. Engine name is normalized to a known key — never interpolated raw
// into a shell — so a stray header value can't run arbitrary commands.
const ENGINES = {
  openspec: {
    label: 'OpenSpec',
    listCmd: 'openspec list --json',
    archiveDir: join('openspec', 'changes', 'archive'),
    // Classify an active-list entry into a plan lifecycle state.
    classifyListed: (c) => (c.status === 'complete' ? 'applied' : 'proposed'),
    tasksOf: (c) =>
      typeof c.totalTasks === 'number' && c.totalTasks > 0
        ? `${c.completedTasks ?? 0}/${c.totalTasks}`
        : null,
    parseList: (stdout) => {
      const data = JSON.parse(stdout)
      const changes = Array.isArray(data?.changes) ? data.changes : []
      return changes.map((c) => ({ name: c.name, raw: c }))
    },
  },
}

function engineKey(engineField) {
  const t = (engineField || '').toLowerCase()
  if (t.includes('openspec')) return 'openspec'
  return 'openspec' // default; never hard-fail on an unknown engine
}

// ── Args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { validate: false, json: false, plan: null, cwd: process.cwd(), help: false }
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]
    if (v === '--validate') a.validate = true
    else if (v === '--json') a.json = true
    else if (v === '--plan') a.plan = argv[++i]
    else if (v === '--cwd') a.cwd = argv[++i]
    else if (v === '-h' || v === '--help') a.help = true
  }
  return a
}

const USAGE = `plan-state — read-only Plan state digest

Usage: node plan-state.mjs [--validate] [--json] [--plan <path>] [--cwd <dir>]

  --validate     drift-focused digest; exit 1 if drift is found
  --json         emit the digest as a machine object
  --plan <path>  use an explicit PLAN.md
  --cwd <dir>    directory to search from
  -h, --help     this help

Read-only: parses PLAN.md and queries the declared engine; never edits anything.`

// ── Locate PLAN.md ──────────────────────────────────────────────────────────
function findPlan(startDir, explicit) {
  if (explicit) return existsSync(explicit) ? resolve(explicit) : null
  let dir = resolve(startDir)
  for (;;) {
    const candidate = join(dir, 'PLAN.md')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null // filesystem root
    dir = parent
  }
}

// ── Parse PLAN.md (forgiving) ───────────────────────────────────────────────
const DASH = /\s+[—–-]\s+/ // em / en / hyphen, surrounded by spaces

function readLines(path) {
  let text = readFileSync(path, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // strip BOM
  return text.split(/\r?\n/) // CRLF-tolerant
}

// Header is prose "frontmatter": `**Key:** value` pairs, `·`-separated, in the
// first lines before the first `## ` heading.
function parseHeader(lines) {
  const header = {}
  const re = /\*\*([^:*]+):\*\*\s*([^·]*)/g
  for (const line of lines) {
    if (/^##\s/.test(line)) break
    let m
    while ((m = re.exec(line)) !== null) {
      const key = m[1].trim().toLowerCase()
      header[key] = m[2].trim()
    }
  }
  return header
}

function checkboxState(line) {
  const m = /^\s*[-*]\s*\[([ xX~])\]/.exec(line)
  if (!m) return null
  const c = m[1].toLowerCase()
  return c === 'x' ? 'x' : c === '~' ? '~' : ' '
}

// A phase heading: `## Phase <id> — <title>` (any dash, or none).
function phaseHeading(line) {
  const m = /^##\s+Phase\s+(\S+)\s*(?:[—–-]\s*(.*))?$/.exec(line.trim())
  if (!m) return null
  return { id: m[1], title: (m[2] || '').trim() }
}

// Split a `**Carried by:** a, b — proposed` line into { names[], declared }.
function parseCarriedBy(value) {
  const parts = value.split(DASH)
  const declared = parts.length > 1 ? parts.slice(1).join(' ').trim().toLowerCase() : ''
  const namesRaw = parts[0]
  const names = namesRaw
    .split(',')
    .map((s) => s.trim())
    // keep change-id-ish tokens; drop labels/placeholders/prose
    .map((s) => (/^[<`]/.test(s) ? '' : s.replace(/`/g, '').trim()))
    .filter((s) => s && /^[A-Za-z0-9][\w.-]*$/.test(s))
  return { names, declared }
}

function normalizeDeclared(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('archiv')) return 'archived'
  if (t.includes('applied')) return 'applied'
  if (t.includes('not yet') || t.includes('not-yet')) return 'not yet proposed'
  if (t.includes('propos')) return 'proposed'
  return t ? 'unknown' : 'not yet proposed'
}

// Phase status from its `**Status:**` line + deliverable checkboxes.
function phaseState(statusLine, deliverables) {
  const s = (statusLine || '').toLowerCase()
  const done = /\b(done|complete|completed|landed|shipped)\b/.test(s) || /\[x\]/.test(s)
  const dated = /\d{4}-\d{2}-\d{2}/.test(s) // driver stamps a date on close
  if (done || dated) return 'x'
  const anyProgress = deliverables.some((d) => d === '~' || d === 'x')
  const notStarted = /not started/.test(s)
  if (notStarted && !anyProgress) return ' '
  if (anyProgress) return '~'
  return ' '
}

function parsePlan(path) {
  const lines = readLines(path)
  const header = parseHeader(lines)
  const phases = []
  const warnings = []
  let cur = null

  const flush = () => {
    if (!cur) return
    cur.state = phaseState(cur.statusLine, cur.deliverables)
    phases.push(cur)
    cur = null
  }

  for (const line of lines) {
    const head = phaseHeading(line)
    if (head) {
      flush()
      cur = { id: head.id, title: head.title, deliverables: [], statusLine: '', carried: [] }
      continue
    }
    if (!cur) continue
    if (/^##\s/.test(line)) {
      flush() // a non-phase section ends the current phase block
      continue
    }
    const cb = checkboxState(line)
    if (cb !== null) cur.deliverables.push(cb)
    const sm = /^\s*\*\*Status:\*\*\s*(.*)$/.exec(line)
    if (sm) cur.statusLine = sm[1].trim()
    const cm = /^\s*\*\*Carried by:\*\*\s*(.*)$/.exec(line)
    if (cm) cur.carried.push(parseCarriedBy(cm[1].trim()))
  }
  flush()

  if (phases.length === 0) warnings.push('no phases parsed from PLAN.md')
  return { header, phases, warnings, path }
}

// ── Query the engine (read-only, degrades gracefully) ───────────────────────
function queryEngine(engine, cwd) {
  const result = { available: false, byName: new Map(), archived: new Set(), note: null }
  // PLAN_STATE_LIST_CMD overrides the engine query — used by the test suite to
  // inject fixture JSON hermetically (no engine binary required).
  const listCmd = process.env.PLAN_STATE_LIST_CMD || engine.listCmd
  try {
    const proc = spawnSync(listCmd, {
      cwd,
      shell: true, // resolves PATH / .cmd on Windows; command is a fixed constant
      encoding: 'utf8',
      timeout: 15000,
    })
    if (proc.error || proc.status !== 0 || !proc.stdout || !proc.stdout.trim().startsWith('{')) {
      result.note = 'engine query returned no JSON'
    } else {
      for (const c of engine.parseList(proc.stdout)) result.byName.set(c.name, c.raw)
      result.available = true
    }
  } catch {
    result.note = 'engine query failed'
  }
  // Archived changes: dir names under the engine's archive path, date-prefix stripped.
  try {
    const dir = join(cwd, engine.archiveDir)
    if (existsSync(dir)) {
      for (const name of readdirSync(dir)) {
        result.archived.add(name.replace(/^\d{4}-\d{2}-\d{2}-/, ''))
      }
      result.available = result.available || true // archive dir alone is signal enough
    }
  } catch {
    /* ignore */
  }
  return result
}

// Join one carried change name to its true lifecycle state.
function classifyChange(name, declared, engine, eng) {
  if (eng.byName.has(name)) {
    const raw = eng.byName.get(name)
    return { state: engine.classifyListed(raw), tasks: engine.tasksOf(raw), verified: true }
  }
  if (eng.archived.has(name)) return { state: 'archived', tasks: null, verified: true }
  if (!eng.available) return { state: declared, tasks: null, verified: false }
  // Engine has no record. Legit for a not-yet-proposed change; drift otherwise.
  if (declared === 'not yet proposed') return { state: 'not yet proposed', tasks: null, verified: true }
  return { state: declared, tasks: null, verified: false, missing: true }
}

// ── Compute digest ──────────────────────────────────────────────────────────
function compute(plan, engine, eng) {
  const phases = plan.phases.map((p) => {
    const changes = []
    for (const cb of p.carried) {
      if (cb.names.length === 0) {
        changes.push({ name: cb.declared ? '(unnamed)' : '(none)', declared: normalizeDeclared(cb.declared), state: normalizeDeclared(cb.declared), tasks: null, verified: false })
        continue
      }
      for (const name of cb.names) {
        const declared = normalizeDeclared(cb.declared)
        const c = classifyChange(name, declared, engine, eng)
        changes.push({ name, declared, ...c })
      }
    }
    return { id: p.id, title: p.title, state: p.state, changes }
  })

  // Position: first phase not done, within it first change not archived.
  let position = null
  for (let i = 0; i < phases.length; i++) {
    if (phases[i].state === 'x') continue
    const change = phases[i].changes.find((c) => c.state !== 'archived') || phases[i].changes[0] || null
    position = { index: i, phase: phases[i], change }
    break
  }

  const next = recommend(phases, position)
  const drift = detectDrift(phases)
  return { header: plan.header, phases, position, next, drift, engine: eng }
}

function recommend(phases, position) {
  if (phases.length === 0) return { action: 'create or populate the plan', mode: 'confirm' }
  if (!position) return { action: 'archive the plan (all phases done)', mode: 'confirm' }
  const { phase, change } = position
  if (!change) return { action: `add a carrying change to Phase ${phase.id}`, mode: 'confirm' }
  const remaining = phase.changes.filter((c) => c.state !== 'archived')
  switch (change.state) {
    case 'not yet proposed':
      return { action: `propose ${change.name} (or explore first)`, mode: 'confirm' }
    case 'proposed':
      return { action: `apply ${change.name}`, mode: 'confirm' }
    case 'applied':
      return { action: `archive ${change.name}`, mode: 'auto-chain' }
    case 'archived':
      if (remaining.length > 0)
        return { action: `advance to ${remaining[0].name} → propose`, mode: 'auto-chain then stop' }
      return { action: `close Phase ${phase.id} (flip done, stamp Status)`, mode: 'auto-chain' }
    default:
      return { action: `resolve ${change.name} (state: ${change.state})`, mode: 'confirm' }
  }
}

function detectDrift(phases) {
  const drift = []
  for (const p of phases) {
    for (const c of p.changes) {
      if (c.missing)
        drift.push(`Phase ${p.id}: "${c.name}" declared ${c.declared} but engine has no such change`)
      if (c.verified && c.declared && c.declared !== 'unknown' && c.declared !== c.state)
        drift.push(`Phase ${p.id}: "${c.name}" plan says ${c.declared}, engine says ${c.state}`)
      if (p.state === 'x' && c.verified && c.state !== 'archived')
        drift.push(`Phase ${p.id} is done but "${c.name}" is ${c.state}, not archived`)
      if (p.state !== 'x' && c.state === 'archived')
        drift.push(`Phase ${p.id} not done but "${c.name}" is archived`)
    }
  }
  return drift
}

// ── Render ──────────────────────────────────────────────────────────────────
const MARK = { x: '[x]', '~': '[~]', ' ': '[ ]' }

function renderDigest(d, plan, opts) {
  const out = []
  const h = d.header
  const program = h.program || '(unnamed)'
  const status = h.status || '?'
  const engLabel = d.engine.available
    ? ENGINES[engineKey(h.engine)].label
    : `${ENGINES[engineKey(h.engine)].label} (unavailable — plan-declared states)`
  out.push(`PLAN: ${program} · status: ${status} · engine: ${engLabel}`)

  if (d.position) {
    const p = d.position.phase
    out.push(`phase → Phase ${p.id} of ${d.phases.length} "${p.title}" ${MARK[p.state]}`)
  } else if (d.phases.length > 0) {
    out.push(`phase → all ${d.phases.length} phases done`)
  }

  if (d.phases.length > 0) {
    out.push('phases:')
    const rows = d.phases.map((p) => {
      const label = `${p.id} ${p.title}`.trim()
      const changeStr = p.changes
        .map((c) => `${c.name} — ${c.state}${c.tasks ? ` (${c.tasks})` : ''}`)
        .join('; ') || '(no change named)'
      return { mark: MARK[p.state], label, changeStr }
    })
    const w = Math.min(40, Math.max(...rows.map((r) => r.label.length)))
    for (const r of rows) out.push(`  ${r.mark} ${r.label.padEnd(w)}  ${r.changeStr}`)
  }

  out.push(`next: ${d.next.action}  (mode: ${d.next.mode})`)

  if (opts.validate || d.drift.length > 0) {
    if (d.drift.length === 0) out.push('drift: none')
    else {
      out.push(`drift: ${d.drift.length}`)
      for (const line of d.drift) out.push(`  - ${line}`)
    }
  }
  if (!d.engine.available)
    out.push('note: engine unavailable — lifecycle states are plan-declared, not verified')
  for (const wln of plan.warnings) out.push(`note: ${wln}`)
  return out.join('\n')
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(USAGE + '\n')
    return 0
  }

  const planPath = findPlan(args.cwd, args.plan)
  if (!planPath) {
    const msg = { plan: 'none', reason: `no PLAN.md found under ${resolve(args.cwd)}`, next: 'create a plan' }
    if (args.json) process.stdout.write(JSON.stringify(msg, null, 2) + '\n')
    else process.stdout.write(`PLAN: none — no PLAN.md found under ${resolve(args.cwd)}\nnext: create a plan (there is no active plan)\n`)
    return 0
  }

  const plan = parsePlan(planPath)
  const key = engineKey(plan.header.engine)
  const engine = ENGINES[key]
  const eng = queryEngine(engine, dirname(planPath))
  const digest = compute(plan, engine, eng)

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          path: planPath,
          header: digest.header,
          phases: digest.phases,
          position: digest.position ? { index: digest.position.index, phaseId: digest.position.phase.id, change: digest.position.change?.name ?? null } : null,
          next: digest.next,
          drift: digest.drift,
          engineAvailable: eng.available,
          warnings: plan.warnings,
        },
        null,
        2,
      ) + '\n',
    )
  } else {
    process.stdout.write(renderDigest(digest, plan, args) + '\n')
  }

  if (args.validate && digest.drift.length > 0) return 1
  return 0
}

process.exit(main())
