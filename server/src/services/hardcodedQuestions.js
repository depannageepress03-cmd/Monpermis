import {
  findBankForChapter,
  findHardcodedQuestionInBanks,
  toAdminHardcodedQuestion,
  toPublicHardcodedQuestion,
} from '../data/hardcodedQuestions/index.js'
import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'

/**
 * @returns {null | object[]} banque complète (avec isCorrect) ou null si non hardcodé
 */
export function getHardcodedQuestionsForChapter(chapter) {
  const bank = findBankForChapter(chapter)
  return bank ? bank.questions : null
}

export function findHardcodedQuestionById(questionId) {
  return findHardcodedQuestionInBanks(questionId)?.question || null
}

export function listHardcodedQuestionsPublic(chapter) {
  const bank = getHardcodedQuestionsForChapter(chapter)
  if (!bank) return null
  const chapterId = String(chapter._id || chapter.id)
  return bank.map((q) => toPublicHardcodedQuestion(q, chapterId))
}

export function listHardcodedQuestionsAdmin(chapter) {
  const bank = getHardcodedQuestionsForChapter(chapter)
  if (!bank) return null
  const chapterId = String(chapter._id || chapter.id)
  return bank.map((q) => toAdminHardcodedQuestion(q, chapterId))
}

export function findHardcodedQuestion(chapter, questionId) {
  const bank = getHardcodedQuestionsForChapter(chapter)
  if (!bank) return null
  return bank.find((q) => String(q.id) === String(questionId)) || null
}

export function checkHardcodedAnswers(chapter, questionId, answerIds) {
  const question = findHardcodedQuestion(chapter, questionId)
  if (!question) return null

  const correctIds = new Set(
    (question.answers || [])
      .filter((answer) => answer.isCorrect)
      .map((answer) => String(answer.id)),
  )
  const selectedIds = new Set((answerIds || []).map((id) => String(id)))

  const isCorrect =
    correctIds.size === selectedIds.size &&
    [...correctIds].every((id) => selectedIds.has(id))

  return {
    isCorrect,
    correctAnswerIds: [...correctIds],
  }
}

/** Forme compatible pickQuestionsForSubject / examens (id + chapterId). */
export function hardcodedAsQuestionDocs(chapter) {
  const bank = getHardcodedQuestionsForChapter(chapter)
  if (!bank) return null
  const chapterId = chapter._id || chapter.id
  return bank.map((q) => ({
    _id: q.id,
    id: q.id,
    chapterId,
    order: q.order,
    published: true,
    prompt: q.prompt,
    answers: q.answers,
    toPublicJSON() {
      return toPublicHardcodedQuestion(q, chapterId)
    },
    toAdminJSON() {
      return toAdminHardcodedQuestion(q, chapterId)
    },
  }))
}

async function resolveChapterMongoId(order) {
  const n = Number(order)
  if (!Number.isFinite(n)) return null
  const chapter = await Chapter.findOne({
    $or: [
      { order: n },
      { name: new RegExp(`chapitre\\s*#?\\s*${n}\\b`, 'i') },
      { name: new RegExp(`^${n}([\\s.\\-–:]|$)`) },
    ],
  }).select('_id')
  return chapter?._id || null
}

/**
 * Charge des questions par id (Mongo ObjectId ou id hardcodé hc-ch…-…).
 * Conserve l’ordre de `ids`.
 */
export async function loadQuestionsByIds(ids) {
  const list = (ids || []).map((id) => String(id))
  const mongoIds = []
  const hardcodedEntries = []
  const byId = new Map()
  const chapterIdByOrder = new Map()

  for (const id of list) {
    const found = findHardcodedQuestionInBanks(id)
    if (found) hardcodedEntries.push({ id, ...found })
    else if (/^[a-f\d]{24}$/i.test(id)) mongoIds.push(id)
  }

  for (const entry of hardcodedEntries) {
    const order = entry.question.chapterOrder || entry.bank.order
    if (!chapterIdByOrder.has(order)) {
      chapterIdByOrder.set(order, await resolveChapterMongoId(order))
    }
    const chapterId = chapterIdByOrder.get(order) || entry.question.chapterKey
    const hc = entry.question
    byId.set(entry.id, {
      ...hc,
      _id: hc.id,
      chapterId,
      published: true,
      toPublicJSON() {
        return toPublicHardcodedQuestion(hc, chapterId)
      },
      toAdminJSON() {
        return toAdminHardcodedQuestion(hc, chapterId)
      },
    })
  }

  if (mongoIds.length) {
    const fromDb = await Question.find({ _id: { $in: mongoIds } })
    for (const q of fromDb) {
      byId.set(String(q._id), q)
    }
  }

  return list.map((id) => byId.get(id)).filter(Boolean)
}
