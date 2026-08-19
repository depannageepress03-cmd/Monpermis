/**
 * Tests unitaires purs (Node, sans RN).
 * npm run test
 */
import assert from 'node:assert/strict'
import { normalizePhone, validatePassword, validatePhone } from '../src/utils/validation.ts'
import { guessOperator } from '../src/utils/guessOperator.ts'
import {
  isChapterQuizUnlocked,
  isChapterUnlocked,
  isCourseUnlocked,
} from '../src/utils/unlock.ts'
import { sanitizeCmsHtml } from '../src/utils/sanitizeHtml.ts'
import { getQuestionTranscript, getRevisionPracticeTranscript } from '../src/data/codeRoute/questionTranscripts.ts'

function computeModuleAmount(module, unitPrice, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1)
  let amount = Math.round(Number(unitPrice) || 0) * qty
  if (module === 'conduite_heures' && qty >= 2) amount = Math.max(0, amount - 1000)
  return amount
}

let passed = 0
function ok(name, fn) {
  try {
    fn()
    passed += 1
    console.log('✓', name)
  } catch (error) {
    console.error('✗', name)
    console.error(' ', error.message)
    process.exitCode = 1
  }
}

ok('validatePassword rejects short', () => {
  assert.equal(validatePassword('Ab1'), 'Minimum 8 caractères')
})
ok('validatePassword rejects weak', () => {
  assert.match(String(validatePassword('abcdefgh')), /majuscule|chiffre|Doit/i)
})
ok('validatePassword accepts strong', () => {
  assert.equal(validatePassword('Abcdefg1'), undefined)
})
ok('normalizePhone strips +229', () => {
  assert.equal(normalizePhone('+2290147880143'), '0147880143')
})
ok('validatePhone ok', () => {
  assert.equal(validatePhone('0147880143'), undefined)
})
ok('guessOperator mtn', () => {
  assert.equal(guessOperator('0150123456'), 'mtn')
})
ok('guessOperator moov', () => {
  assert.equal(guessOperator('0155123456'), 'moov')
})
ok('computeModuleAmount discount 2h', () => {
  assert.equal(computeModuleAmount('conduite_heures', 5000, 2), 9000)
})
ok('computeModuleAmount code flat', () => {
  assert.equal(computeModuleAmount('code', 10000, 1), 10000)
})
ok('isChapterUnlocked first', () => {
  assert.equal(isChapterUnlocked(0, undefined, new Set()), true)
})
ok('isChapterUnlocked locked', () => {
  assert.equal(isChapterUnlocked(1, 'prev', new Set()), false)
})
ok('isCourseUnlocked sequential', () => {
  assert.equal(isCourseUnlocked(1, 'c0', new Set(['c0'])), true)
})
ok('getQuestionTranscript formats spoken options', () => {
  const text = getQuestionTranscript(2, 1)
  assert.match(text, /véhicules prioritaires/i)
  assert.match(text, /\nA\. /)
})
ok('getQuestionTranscript missing is empty', () => {
  assert.equal(getQuestionTranscript(99, 1), '')
})
ok('practice transcript prefers prompt.transcript', () => {
  assert.equal(
    getRevisionPracticeTranscript({ text: 'stem', transcript: 'audio text' }),
    'audio text',
  )
})
ok('practice transcript looks up by question id', () => {
  const text = getRevisionPracticeTranscript({ text: '' }, { id: 'hc-ch2-q01' })
  assert.match(text, /véhicules prioritaires/i)
})
ok('practice transcript looks up chapter 4', () => {
  const text = getRevisionPracticeTranscript({ text: '' }, { id: 'hc-ch4-q01' })
  assert.match(text, /tourner à droite/i)
})
ok('isChapterQuizUnlocked all courses', () => {
  assert.equal(isChapterQuizUnlocked(['a', 'b'], new Set(['a', 'b'])), true)
})
ok('sanitizeCmsHtml strips script', () => {
  const out = sanitizeCmsHtml('<p>Hi</p><script>alert(1)</script>')
  assert.equal(out.includes('script'), false)
  assert.equal(out.includes('<p>Hi</p>'), true)
})
ok('sanitizeCmsHtml strips onclick', () => {
  const out = sanitizeCmsHtml('<p onclick="x()">Hi</p>')
  assert.equal(out.includes('onclick'), false)
})

console.log(`\n${passed} tests passed`)
if (process.exitCode) process.exit(1)
