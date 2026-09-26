// QA E2E — bootstrap : base mémoire + API réelle + seed, reste en vie
// (géré par Playwright webServer). Jamais la prod.
// Les helpers vivent sous server/tests (résolution node_modules locale).
import { startMemoryMongo } from '../server/tests/helpers/mongo.mjs'
import { startTestServer } from '../server/tests/helpers/server.mjs'
import { connectTestDb, models } from '../server/tests/helpers/db.mjs'
import * as seed from '../server/tests/helpers/seed.mjs'

const uri = await startMemoryMongo()
await connectTestDb(uri)
const base = await startTestServer(uri)

await seed.seedAdmin()

const learnerEmail = 'e2e@test.local'
await seed.seedLearner({ email: learnerEmail, phone: '0100990001', soldeHeures: 0 })
const learner = await models.User.findOne({ email: learnerEmail })
learner.password = 'E2eTest1234'
await learner.save()
await seed.grantCodeAccess(learner._id, 30)
await seed.grantConduiteHours(learner._id, 2)

const moniteur = await seed.seedMoniteur({ firstName: 'E2e', lastName: 'Moniteur', phone: '0199888777' })
await seed.seedCreneaux(moniteur._id, 7)

console.log(`QA E2E READY base=${base} learner=${learnerEmail}`)
await new Promise(() => {})
