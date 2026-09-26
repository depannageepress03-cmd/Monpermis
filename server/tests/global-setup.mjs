// QA — démarrage unique (base mémoire + API) pour tous les fichiers de test.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startMemoryMongo, stopMemoryMongo } from './helpers/mongo.mjs'
import { startTestServer, stopTestServer } from './helpers/server.mjs'

export const TMP_FILE = path.join(os.tmpdir(), 'monpermis-qa-world.json')

export async function setup() {
  const uri = await startMemoryMongo()
  const base = await startTestServer(uri)
  fs.writeFileSync(TMP_FILE, JSON.stringify({ uri, base }))
  return async () => {
    await stopTestServer()
    await stopMemoryMongo()
    try {
      fs.unlinkSync(TMP_FILE)
    } catch {
      /* déjà supprimé */
    }
  }
}
