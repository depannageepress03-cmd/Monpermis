// QA — lance l'API réelle (node src/index.js) en processus enfant,
// sur base mémoire + env de test. Ne touche jamais server/.env.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QA_PORT, qaEnv } from './env.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

let child = null

async function waitHealth(base, timeoutMs = 90000) {
  const start = Date.now()
  for (;;) {
    try {
      const res = await fetch(`${base}/api/health`)
      if (res.ok) return
    } catch {
      /* pas encore prêt */
    }
    if (Date.now() - start > timeoutMs) throw new Error('API de test non démarrée')
    await new Promise((r) => setTimeout(r, 500))
  }
}

export async function startTestServer(mongoUri) {
  child = spawn('node', ['src/index.js'], {
    cwd: root,
    env: qaEnv(mongoUri),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (d) => process.stdout.write(`[api-qa] ${d}`))
  child.stderr.on('data', (d) => process.stderr.write(`[api-qa] ${d}`))
  const base = `http://localhost:${QA_PORT}`
  await waitHealth(base)
  return base
}

export async function stopTestServer() {
  if (child) {
    child.kill('SIGTERM')
    child = null
  }
}
