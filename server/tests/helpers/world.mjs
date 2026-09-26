// QA — monde partagé : le setup global (vitest globalSetup) a déjà
// démarré base mémoire + API ; ici on lit les coordonnées et on
// connecte mongoose pour seed/assertions.
import fs from 'node:fs'
import { afterAll, beforeAll } from 'vitest'
import { TMP_FILE } from '../global-setup.mjs'
import { connectTestDb, disconnectTestDb } from './db.mjs'

export let BASE = ''
export let MONGO_URI = ''

export function useQaWorld() {
  beforeAll(async () => {
    const world = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'))
    BASE = world.base
    MONGO_URI = world.uri
    await connectTestDb(MONGO_URI)
  }, 60000)

  afterAll(async () => {
    await disconnectTestDb()
  }, 30000)
}

export async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* corps vide */
  }
  return { status: res.status, json, headers: res.headers }
}
