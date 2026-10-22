import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTranscript, transcriptProblems } from './transcriptParse.js'
import { PRACTICE_EXAM_COUNT, PRACTICE_EXAM_SIZE } from './practiceExam.js'
import { pickFreshExamQuestions } from '../services/practiceExams.js'

test('80 sujets d’examen', () => {
  assert.equal(PRACTICE_EXAM_COUNT, 80)
  assert.equal(PRACTICE_EXAM_SIZE, 20)
})

test('transcription complète : énoncé + une ligne par réponse', () => {
  const raw = 'Quelle est la vitesse ?\nA. 50 km/h\nB. 90 km/h\nC. 110 km/h\n'
  assert.deepEqual(parseTranscript(raw).options, { A: '50 km/h', B: '90 km/h', C: '110 km/h' })
  assert.deepEqual(transcriptProblems(raw, ['A', 'B', 'C']), [])
})

test('transcription brute en un seul bloc (sans lignes de réponses) : refusée', () => {
  const raw = "Si j'arrive le premier, a, je balise, oui, b, je balise, non."
  const problems = transcriptProblems(raw, ['A', 'B'])
  assert.ok(problems.includes('réponse A absente'))
  assert.ok(problems.includes('réponse B absente'))
})

test('transcription vide ou énoncé manquant : refusée', () => {
  assert.deepEqual(transcriptProblems('', ['A']), ['transcription vide'])
  assert.ok(transcriptProblems('A. Oui\nB. Non', ['A', 'B']).includes('énoncé vide ou trop court'))
})

test('réponse proposée mais absente de la transcription : refusée', () => {
  assert.ok(transcriptProblems('Question valable ?\nA. Oui\nB. Non', ['A', 'B', 'C']).includes('réponse C absente'))
})

const bank = (chapters, perChapter) =>
  Array.from({ length: chapters * perChapter }, (_, i) => ({
    _id: `q${i}`,
    chapterId: `c${i % chapters}`,
  }))

test('un tirage donne 20 questions distinctes', () => {
  const picked = pickFreshExamQuestions(bank(10, 30), [])
  assert.equal(picked.length, 20)
  assert.equal(new Set(picked.map((q) => q._id)).size, 20)
})

test('les questions déjà vues sont écartées tant qu’il en reste assez de neuves', () => {
  const b = bank(10, 30) // 300 questions
  const seen = new Set()
  for (let round = 0; round < 10; round += 1) {
    const picked = pickFreshExamQuestions(b, seen)
    for (const q of picked) {
      assert.ok(!seen.has(q._id), 'question déjà vue proposée alors que des neuves existent')
      seen.add(q._id)
    }
  }
  assert.equal(seen.size, 200)
})

test('banque épuisée : on retire dans toute la banque au lieu de bloquer', () => {
  const b = bank(5, 6) // 30 questions
  const picked = pickFreshExamQuestions(b, b.map((q) => q._id))
  assert.equal(picked.length, 20)
})

test('deux tirages successifs diffèrent', () => {
  const b = bank(10, 30)
  const a = pickFreshExamQuestions(b, []).map((q) => q._id).sort().join(',')
  const c = pickFreshExamQuestions(b, []).map((q) => q._id).sort().join(',')
  assert.notEqual(a, c)
})

import { answerKeyProblems } from './answerKey.js'
import { UNCERTAIN_QUESTIONS } from '../data/hardcodedQuestions/uncertain.js'
import { checkExamEligibility } from '../services/examEligibility.js'

const ans = (...flags) => flags.map((isCorrect, i) => ({ label: 'ABCDE'[i], isCorrect }))

test('clé de réponses fiable : au moins une bonne, pas toutes', () => {
  assert.deepEqual(answerKeyProblems(ans(false, true, false)), [])
  assert.deepEqual(answerKeyProblems(ans(true, false, true)), [])
})

test('aucune bonne réponse enregistrée : question non sûre', () => {
  assert.deepEqual(answerKeyProblems(ans(false, false)), ['aucune bonne réponse enregistrée'])
})

test('toutes les réponses bonnes : à confirmer, donc non sûre', () => {
  assert.ok(answerKeyProblems(ans(true, true, true)).some((p) => p.includes('toutes les réponses')))
})

test('moins de deux réponses : non sûre', () => {
  assert.ok(answerKeyProblems(ans(true)).includes('moins de deux réponses'))
})

test('question signalée « à confirmer » : écartée même avec une clé valide', () => {
  const id = Object.keys(UNCERTAIN_QUESTIONS)[0]
  const result = checkExamEligibility({ id, prompt: { imageUrls: [] }, answers: ans(true, false, false) })
  assert.equal(result.ok, false)
  assert.ok(result.reasons.includes('signalée à confirmer'))
})

test('une vraie question sûre du projet est éligible (audio, transcription, clé)', () => {
  const ok = checkExamEligibility({ id: 'hc-ch1-q01', prompt: { imageUrls: [] }, answers: ans(false, true, false) })
  assert.equal(ok.ok, true, ok.reasons.join(' ; '))
})

test('question sans bonne réponse du projet (ch12 q2) : écartée', () => {
  const r = checkExamEligibility({ id: 'hc-ch12-q02', prompt: { imageUrls: [] }, answers: ans(false, false) })
  assert.equal(r.ok, false)
})

import { referencesImage } from './transcriptParse.js'

test('énoncé qui renvoie à une image : détecté', () => {
  for (const stem of [
    'Dans cette situation, je suis bien placé ?',
    'Je peux dépasser ce véhicule ?',
    'Ce panneau est implanté :',
    'À cette intersection, j’ai la priorité de passage ?',
    'Sur cette image, le véhicule bleu doit :',
  ]) assert.equal(referencesImage(stem), true, stem)
})

test('énoncé qui se comprend seul : non détecté', () => {
  for (const stem of [
    'Quelle est la vitesse maximale en agglomération ?',
    'Lorsque vous voyez de profil l’agent réglementant la circulation, que faire ?',
    'En quoi consiste le stationnement ?',
  ]) assert.equal(referencesImage(stem), false, stem)
})
