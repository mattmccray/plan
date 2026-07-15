// Tests for plan-state.mjs. Hermetic: no engine binary needed — the engine
// query is stubbed via PLAN_STATE_LIST_CMD (a node one-liner that echoes fixture
// JSON). Run: `node --test` from this directory (or `node --test skills/plan/bin`).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const SCRIPT = new URL('./plan-state.mjs', import.meta.url).pathname

// Build a temp project: PLAN.md + optional archived change dirs. Returns dir.
function project({ plan, archived = [], crlf = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'plan-state-'))
  const body = crlf ? plan.replace(/\n/g, '\r\n') : plan
  writeFileSync(join(dir, 'PLAN.md'), body)
  for (const name of archived) mkdirSync(join(dir, 'openspec', 'changes', 'archive', name), { recursive: true })
  return dir
}

// Stub the engine list query with fixture JSON via a node one-liner.
function listStub(changes) {
  const json = JSON.stringify({ changes })
  // process.execPath is the node binary; -e prints the fixture to stdout.
  return `${JSON.stringify(process.execPath)} -e ${JSON.stringify(`process.stdout.write(${JSON.stringify(json)})`)}`
}

function run(dir, { args = [], listCmd } = {}) {
  const env = { ...process.env }
  if (listCmd !== undefined) env.PLAN_STATE_LIST_CMD = listCmd
  else delete env.PLAN_STATE_LIST_CMD
  const proc = spawnSync(process.execPath, [SCRIPT, '--cwd', dir, ...args], { encoding: 'utf8', env })
  return { out: proc.stdout, code: proc.status }
}

const HEADER = `# Demo — Plan

**Program:** demo · **Status:** active · **Engine:** OpenSpec (\`openspec/changes/\`)
**Started:** 2026-01-01 · **Completed:** —
`

function phase(id, title, { status = 'not started', deliverable = '[ ] x', carried }) {
  return `\n## Phase ${id} — ${title}\n\n**Goal.** g.\n\n- ${deliverable}\n\n**Status:** ${status}\n\n**Carried by:** ${carried}\n`
}

test('fresh plan — all not yet proposed → propose first', () => {
  const dir = project({
    plan: HEADER + phase(0, 'One', { carried: 'alpha — not yet proposed' }) + phase(1, 'Two', { carried: 'beta — not yet proposed' }),
  })
  const { out } = run(dir, { listCmd: listStub([]) })
  assert.match(out, /phase → Phase 0 of 2 "One"/)
  assert.match(out, /next: propose alpha/)
  rmSync(dir, { recursive: true, force: true })
})

test('proposed change (partial tasks) → apply, shows task count', () => {
  const dir = project({ plan: HEADER + phase(0, 'One', { carried: 'alpha — proposed' }) })
  const { out } = run(dir, { listCmd: listStub([{ name: 'alpha', completedTasks: 3, totalTasks: 8, status: 'in-progress' }]) })
  assert.match(out, /alpha — proposed \(3\/8\)/)
  assert.match(out, /next: apply alpha/)
  rmSync(dir, { recursive: true, force: true })
})

test('applied change (engine complete) → archive, auto-chain', () => {
  const dir = project({ plan: HEADER + phase(0, 'One', { carried: 'alpha — proposed' }) })
  const { out } = run(dir, { listCmd: listStub([{ name: 'alpha', completedTasks: 5, totalTasks: 5, status: 'complete' }]) })
  assert.match(out, /alpha — applied/)
  assert.match(out, /next: archive alpha  \(mode: auto-chain\)/)
  rmSync(dir, { recursive: true, force: true })
})

test('archived change (absent from list, in archive dir) → close phase', () => {
  const dir = project({
    plan: HEADER + phase(0, 'One', { status: 'done — 2026-02-02 — landed', deliverable: '[x] x', carried: 'alpha — archived' }) + phase(1, 'Two', { carried: 'beta — not yet proposed' }),
    archived: ['2026-02-02-alpha'],
  })
  const { out } = run(dir, { listCmd: listStub([]) })
  assert.match(out, /\[x\] 0 One/)
  assert.match(out, /phase → Phase 1 of 2 "Two"/) // position advanced past done phase
  assert.match(out, /next: propose beta/)
  rmSync(dir, { recursive: true, force: true })
})

test('multi-change phase — advance to next change when first archived', () => {
  const dir = project({
    plan: HEADER + phase(0, 'One', { status: 'in progress', deliverable: '[~] x', carried: 'alpha, beta — archived' }),
    archived: ['2026-02-02-alpha'],
  })
  // alpha archived (dir), beta still active/proposed
  const { out } = run(dir, { listCmd: listStub([{ name: 'beta', completedTasks: 0, totalTasks: 4, status: 'in-progress' }]) })
  assert.match(out, /alpha — archived/)
  assert.match(out, /beta — proposed/)
  assert.match(out, /next: apply beta/) // first non-archived change in the phase
  rmSync(dir, { recursive: true, force: true })
})

test('all phases done → suggest archiving the plan', () => {
  const dir = project({
    plan: HEADER + phase(0, 'One', { status: 'done — 2026-02-02', deliverable: '[x] x', carried: 'alpha — archived' }),
    archived: ['2026-02-02-alpha'],
  })
  const { out } = run(dir, { listCmd: listStub([]) })
  assert.match(out, /phase → all 1 phases done/)
  assert.match(out, /next: archive the plan/)
  rmSync(dir, { recursive: true, force: true })
})

test('drift — done phase whose change is still active', () => {
  const dir = project({ plan: HEADER + phase(0, 'One', { status: 'done — 2026-02-02', deliverable: '[x] x', carried: 'alpha — applied' }) })
  const { out, code } = run(dir, { args: ['--validate'], listCmd: listStub([{ name: 'alpha', completedTasks: 5, totalTasks: 5, status: 'complete' }]) })
  assert.match(out, /drift: \d+/)
  assert.match(out, /Phase 0 is done but "alpha" is applied, not archived/)
  assert.equal(code, 1) // --validate exits nonzero on drift
  rmSync(dir, { recursive: true, force: true })
})

test('drift — plan claims a state the engine cannot verify', () => {
  const dir = project({ plan: HEADER + phase(0, 'One', { carried: 'ghost — applied' }) })
  const { out } = run(dir, { args: ['--validate'], listCmd: listStub([]) })
  assert.match(out, /"ghost" declared applied but engine has no such change/)
  rmSync(dir, { recursive: true, force: true })
})

test('CRLF line endings parse identically', () => {
  const dir = project({ plan: HEADER + phase(0, 'One', { carried: 'alpha — proposed' }), crlf: true })
  const { out } = run(dir, { listCmd: listStub([{ name: 'alpha', completedTasks: 1, totalTasks: 2, status: 'in-progress' }]) })
  assert.match(out, /next: apply alpha/)
  rmSync(dir, { recursive: true, force: true })
})

test('missing engine — plan-only digest, exit 0, degradation note', () => {
  const dir = project({ plan: HEADER + phase(0, 'One', { carried: 'alpha — proposed' }) })
  const bogus = `${JSON.stringify(process.execPath)} -e "process.exit(1)"` // engine "fails"
  const { out, code } = run(dir, { listCmd: bogus })
  assert.match(out, /engine unavailable/)
  assert.match(out, /alpha — proposed/) // falls back to plan-declared state
  assert.equal(code, 0) // never crashes
  rmSync(dir, { recursive: true, force: true })
})

test('no PLAN.md → offers create, exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'plan-state-empty-'))
  const { out, code } = run(dir, { listCmd: listStub([]) })
  assert.match(out, /PLAN: none/)
  assert.match(out, /next: create a plan/)
  assert.equal(code, 0)
  rmSync(dir, { recursive: true, force: true })
})
