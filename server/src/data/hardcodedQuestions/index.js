import {
  CHAPITRE_03_QUESTIONS,
  matchesChapitre03,
} from './chapitre03.js'
import {
  CHAPITRE_06_QUESTIONS,
  matchesChapitre06,
} from './chapitre06.js'
import {
  CHAPITRE_07_QUESTIONS,
  matchesChapitre07,
} from './chapitre07.js'
import {
  CHAPITRE_08_QUESTIONS,
  matchesChapitre08,
} from './chapitre08.js'
import {
  CHAPITRE_09_QUESTIONS,
  matchesChapitre09,
} from './chapitre09.js'
import {
  CHAPITRE_16_QUESTIONS,
  matchesChapitre16,
} from './chapitre16.js'
import {
  CHAPITRE_17_QUESTIONS,
  matchesChapitre17,
} from './chapitre17.js'
import {
  CHAPITRE_18_QUESTIONS,
  matchesChapitre18,
} from './chapitre18.js'
import {
  CHAPITRE_19_QUESTIONS,
  matchesChapitre19,
} from './chapitre19.js'
import {
  CHAPITRE_20_QUESTIONS,
  matchesChapitre20,
} from './chapitre20.js'

/** Banques en dur enregistrées (ordre décroissant pour matching explicite). */
export const HARDCODED_CHAPTER_BANKS = [
  {
    order: 20,
    match: matchesChapitre20,
    questions: CHAPITRE_20_QUESTIONS,
  },
  {
    order: 19,
    match: matchesChapitre19,
    questions: CHAPITRE_19_QUESTIONS,
  },
  {
    order: 18,
    match: matchesChapitre18,
    questions: CHAPITRE_18_QUESTIONS,
  },
  {
    order: 17,
    match: matchesChapitre17,
    questions: CHAPITRE_17_QUESTIONS,
  },
  {
    order: 16,
    match: matchesChapitre16,
    questions: CHAPITRE_16_QUESTIONS,
  },
  {
    order: 9,
    match: matchesChapitre09,
    questions: CHAPITRE_09_QUESTIONS,
  },
  {
    order: 8,
    match: matchesChapitre08,
    questions: CHAPITRE_08_QUESTIONS,
  },
  {
    order: 7,
    match: matchesChapitre07,
    questions: CHAPITRE_07_QUESTIONS,
  },
  {
    order: 6,
    match: matchesChapitre06,
    questions: CHAPITRE_06_QUESTIONS,
  },
  {
    order: 3,
    match: matchesChapitre03,
    questions: CHAPITRE_03_QUESTIONS,
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
