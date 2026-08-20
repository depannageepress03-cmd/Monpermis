import {
  CHAPITRE_01_QUESTIONS,
  matchesChapitre01,
} from './chapitre01.js'
import {
  CHAPITRE_02_QUESTIONS,
  matchesChapitre02,
} from './chapitre02.js'
import {
  CHAPITRE_03_QUESTIONS,
  matchesChapitre03,
} from './chapitre03.js'
import {
  CHAPITRE_04_QUESTIONS,
  matchesChapitre04,
} from './chapitre04.js'
import {
  CHAPITRE_05_QUESTIONS,
  matchesChapitre05,
} from './chapitre05.js'
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
  CHAPITRE_10_QUESTIONS,
  matchesChapitre10,
} from './chapitre10.js'
import {
  CHAPITRE_11_QUESTIONS,
  matchesChapitre11,
} from './chapitre11.js'
import {
  CHAPITRE_12_QUESTIONS,
  matchesChapitre12,
} from './chapitre12.js'
import {
  CHAPITRE_13_QUESTIONS,
  matchesChapitre13,
} from './chapitre13.js'
import {
  CHAPITRE_14_QUESTIONS,
  matchesChapitre14,
} from './chapitre14.js'
import {
  CHAPITRE_15_QUESTIONS,
  matchesChapitre15,
} from './chapitre15.js'
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

/**
 * Source de vérité questions Code (admin + API apprenant).
 * Après modification d’un chapitre ici, régénérer le fallback hors-ligne :
 *   npm run generate:learner-banks --prefix server
 *   npm run check:banks-sync --prefix server
 */
/** Banques en dur enregistrées (ordre décroissant pour matching explicite). */
export const HARDCODED_CHAPTER_BANKS = [
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
    order: 15,
    match: matchesChapitre15,
    questions: CHAPITRE_15_QUESTIONS,
  },
  {
    order: 14,
    match: matchesChapitre14,
    questions: CHAPITRE_14_QUESTIONS,
  },
  {
    order: 13,
    match: matchesChapitre13,
    questions: CHAPITRE_13_QUESTIONS,
  },
  {
    order: 12,
    match: matchesChapitre12,
    questions: CHAPITRE_12_QUESTIONS,
  },
  {
    order: 11,
    match: matchesChapitre11,
    questions: CHAPITRE_11_QUESTIONS,
  },
  {
    order: 10,
    match: matchesChapitre10,
    questions: CHAPITRE_10_QUESTIONS,
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
    order: 5,
    match: matchesChapitre05,
    questions: CHAPITRE_05_QUESTIONS,
  },
  {
    order: 4,
    match: matchesChapitre04,
    questions: CHAPITRE_04_QUESTIONS,
  },
  {
    order: 3,
    match: matchesChapitre03,
    questions: CHAPITRE_03_QUESTIONS,
  },
  {
    order: 2,
    match: matchesChapitre02,
    questions: CHAPITRE_02_QUESTIONS,
  },
  {
    order: 1,
    match: matchesChapitre01,
    questions: CHAPITRE_01_QUESTIONS,
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
