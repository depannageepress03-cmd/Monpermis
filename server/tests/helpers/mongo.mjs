// QA — MongoDB isolée en mémoire. Aucune connexion Atlas.
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongo = null

export async function startMemoryMongo() {
  mongo = await MongoMemoryServer.create()
  return mongo.getUri('monpermis-qa')
}

export async function stopMemoryMongo() {
  if (mongo) {
    await mongo.stop()
    mongo = null
  }
}
