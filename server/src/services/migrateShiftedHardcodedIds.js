import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'

/**
 * Les banques chapitre15.js → chapitre19.js portaient les ids hc-ch16 → hc-ch20
 * (décalés d’un cran). Les tentatives enregistrées avant le correctif gardent
 * ces anciens ids : on les ramène au vrai chapitre, une seule fois par document
 * (drapeau hcIdsV2 posé dans la même écriture → relançable sans double décalage).
 */
const LEGACY_ID = /^hc-ch(1[6-9]|20)-q(\d+)(-[a-z])?$/i

export function remapLegacyHardcodedId(id) {
  const value = String(id ?? '')
  const match = value.match(LEGACY_ID)
  if (!match) return value
  return `hc-ch${Number(match[1]) - 1}-q${match[2]}${match[3] || ''}`
}

export async function migrateShiftedHardcodedIds() {
  const collection = PracticeExamAttempt.collection
  const cursor = collection.find(
    { hcIdsV2: { $ne: true } },
    { projection: { questionIds: 1, responses: 1 } },
  )

  let migrated = 0
  for await (const doc of cursor) {
    const questionIds = (doc.questionIds || []).map(remapLegacyHardcodedId)
    const responses = (doc.responses || []).map((response) => ({
      ...response,
      questionId: remapLegacyHardcodedId(response.questionId),
      answerIds: (response.answerIds || []).map(remapLegacyHardcodedId),
    }))
    await collection.updateOne(
      { _id: doc._id, hcIdsV2: { $ne: true } },
      { $set: { questionIds, responses, hcIdsV2: true } },
    )
    migrated += 1
  }
  return { migrated }
}
