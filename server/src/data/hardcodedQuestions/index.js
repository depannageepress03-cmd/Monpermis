import {
  CHAPITRE_20_QUESTIONS,
  matchesChapitre20,
} from './chapitre20.js'
import {
  CHAPITRE_21_QUESTIONS,
  matchesChapitre21,
} from './chapitre21.js'

/** Banques en dur enregistrées (ordre décroissant pour matching explicite). */
export const HARDCODED_CHAPTER_BANKS = [
  {
    order: 21,
    match: matchesChapitre21,
    questions: CHAPITRE_21_QUESTIONS,
  },
  {
    order: 20,
    match: matchesChapitre20,
    questions: CHAPITRE_20_QUESTIONS,
  },
]

export function findBankForChapter(chapter) {
  return HARDCODED_CHAPTER_BANKS.find((bank) => bank.match(chapter)) || null
}

export function findHardcodedQuestionInBanks(questionId) {
  const id = String(questionId || '')
  for (const bank of HARDCODED_CHAPTER_BANKS) {
    const q = bank.questions.find((item) => item.id === id)
    if (q) return { question: q, bank }
  }
  return null
}

export {
  toAdminHardcodedQuestion,
  toPublicHardcodedQuestion,
} from './serialize.js'
