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
ok('sanitizeCmsHtml strips svg onload', () => {
  const out = sanitizeCmsHtml('<p>Hi</p><svg onload="alert(1)"><circle r="5"/></svg>')
  assert.equal(out.includes('onload'), false)
  assert.equal(out.includes('<svg'), false)
  assert.equal(out.includes('<p>Hi</p>'), true)
})
ok('sanitizeCmsHtml strips encoded javascript href', () => {
  const out = sanitizeCmsHtml('<a href="&#106;avascript:alert(1)">x</a>')
  assert.equal(out.toLowerCase().includes('javascript'), false)
})
ok('sanitizeCmsHtml strips data: href', () => {
  const out = sanitizeCmsHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
  assert.equal(out.includes('data:text/html'), false)
})
ok('sanitizeCmsHtml strips protocol-relative href', () => {
  const out = sanitizeCmsHtml('<a href="//evil.com/phish">x</a>')
  assert.equal(out.includes('//evil.com'), false)
})
ok('sanitizeCmsHtml strips style attribute', () => {
  const out = sanitizeCmsHtml('<p style="background:url(javascript:alert(1))">Hi</p>')
  assert.equal(out.includes('style='), false)
  assert.equal(out.includes('Hi'), true)
})
ok('sanitizeCmsHtml strips form/formaction', () => {
  const out = sanitizeCmsHtml('<form action="/x"><button formaction="javascript:alert(1)">go</button></form>')
  assert.equal(out.includes('<form'), false)
  assert.equal(out.includes('formaction'), false)
})
ok('sanitizeCmsHtml keeps legit formatting and https links', () => {
  const out = sanitizeCmsHtml('<p><strong>Hi</strong> <a href="https://example.com/a">voir</a></p>')
  assert.equal(out.includes('<strong>Hi</strong>'), true)
  assert.equal(out.includes('https://example.com/a'), true)
})

console.log(`\n${passed} tests passed`)
if (process.exitCode) process.exit(1)
