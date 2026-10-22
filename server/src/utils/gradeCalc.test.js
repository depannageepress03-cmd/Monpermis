import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkAttemptStats,
  checkSummary,
  computeAttemptStats,
  computeCourseProgress,
  formatNumberRanges,
  pickCountedAttempts,
  summarizeRows,
} from './gradeCalc.js'

const answered = (n, correct) =>
  Array.from({ length: n }, (_, i) => ({
    questionId: `q${i + 1}`,
    answerIds: ['a'],
    isCorrect: i < correct,
  }))

test('exemple du cahier des charges : 40 questions, 30 traitées (24 justes, 6 fausses)', () => {
  const stats = computeAttemptStats({ questionCount: 40, responses: answered(30, 24), completed: false })
  assert.equal(stats.total, 40)
  assert.equal(stats.treated, 30)
  assert.equal(stats.correct, 24)
  assert.equal(stats.incorrect, 6)
  assert.equal(stats.unanswered, 10)
  assert.equal(stats.failed, 16)
  assert.equal(stats.note, 12)
  assert.equal(stats.completed, false)
  assert.deepEqual(checkAttemptStats(stats, { coefficient: 1 }), [])
})

test('une question zappée (aucune réponse cochée) est non traitée, donc comptée comme ratée', () => {
  const responses = [
    { questionId: 'q1', answerIds: ['a'], isCorrect: true },
    { questionId: 'q2', answerIds: [], isCorrect: false },
  ]
  const stats = computeAttemptStats({ questionCount: 20, responses, completed: true })
  assert.equal(stats.treated, 1)
  assert.equal(stats.unanswered, 19)
  assert.equal(stats.failed, 19)
  assert.equal(stats.note, 1)
})

test('examen terminé 20/20 et 0/20', () => {
  assert.equal(computeAttemptStats({ questionCount: 20, responses: answered(20, 20), completed: true }).note, 20)
  const zero = computeAttemptStats({ questionCount: 20, responses: answered(20, 0), completed: true })
  assert.equal(zero.note, 0)
  assert.equal(zero.incorrect, 20)
})

test('doublons de réponse à la même question ignorés', () => {
  const responses = [
    { questionId: 'q1', answerIds: ['a'], isCorrect: true },
    { questionId: 'q1', answerIds: ['b'], isCorrect: false },
  ]
  const stats = computeAttemptStats({ questionCount: 20, responses, completed: false })
  assert.equal(stats.treated, 1)
  assert.equal(stats.correct, 1)
})

test('sujet sans aucune réponse et non terminé : non évalué (pas assimilé à zéro)', () => {
  const stats = computeAttemptStats({ questionCount: 20, responses: [], completed: false })
  assert.equal(stats.evaluated, false)
  assert.equal(stats.unanswered, 20)
})

test('incohérences détectées', () => {
  const bad = { total: 20, treated: 25, correct: 26, incorrect: 0, unanswered: -5, failed: 0, completed: true }
  const codes = checkAttemptStats(bad, { coefficient: 0, storedCorrect: 10 }).map((i) => i.code)
  assert.ok(codes.includes('treated_gt_total'))
  assert.ok(codes.includes('correct_gt_treated'))
  assert.ok(codes.includes('correct_plus_incorrect'))
  assert.ok(codes.includes('invalid_coefficient'))
  assert.ok(codes.includes('stored_score_mismatch'))
})

const row = (attemptId, examNumber, correct, extra = {}) => {
  const stats = computeAttemptStats({ questionCount: 20, responses: answered(correct, correct), completed: true })
  return { attemptId, examNumber, coefficient: 1, lastAt: '2026-01-01', ...stats, ...extra }
}

test('moyenne simple, meilleure et plus faible note', () => {
  const rows = [row('a', 1, 10), row('b', 2, 16), row('c', 3, 4)]
  const counted = pickCountedAttempts(rows)
  const summary = summarizeRows(rows.map((r) => ({ ...r, counted: counted.has(r.attemptId) })))
  assert.equal(summary.average, 10)
  assert.equal(summary.bestNote, 16)
  assert.equal(summary.lowestNote, 4)
  assert.equal(summary.evaluatedCount, 3)
  assert.deepEqual(checkSummary(summary), [])
})

test('moyenne pondérée par les coefficients', () => {
  const rows = [row('a', 1, 10, { coefficient: 1 }), row('b', 2, 16, { coefficient: 3 })]
  const summary = summarizeRows(rows.map((r) => ({ ...r, counted: true })))
  assert.equal(summary.average, 14.5)
  assert.equal(summary.coefficientSum, 4)
})

test('plusieurs tentatives du même examen : seule la meilleure compte', () => {
  const rows = [row('a', 1, 8), row('b', 1, 14), row('c', 2, 12)]
  const counted = pickCountedAttempts(rows)
  assert.deepEqual([...counted].sort(), ['b', 'c'])
})

test('sujet non évalué exclu de la moyenne ; moyenne nulle sans sujet évalué', () => {
  const unevaluated = {
    attemptId: 'x',
    examNumber: 5,
    ...computeAttemptStats({ questionCount: 20, responses: [], completed: false }),
    coefficient: 1,
  }
  const counted = pickCountedAttempts([unevaluated])
  assert.equal(counted.size, 0)
  const summary = summarizeRows([{ ...unevaluated, counted: false }])
  assert.equal(summary.average, null)
  assert.equal(summary.evaluatedCount, 0)
})

test('coefficient invalide : sujet exclu de la moyenne', () => {
  const rows = [row('a', 1, 10), row('b', 2, 20, { coefficient: 0 })]
  const summary = summarizeRows(rows.map((r) => ({ ...r, counted: true })))
  assert.equal(summary.average, 10)
})

test('sujet non terminé compté selon ses bonnes réponses', () => {
  const unfinished = {
    attemptId: 'u',
    examNumber: 1,
    ...computeAttemptStats({ questionCount: 20, responses: answered(10, 8), completed: false }),
    coefficient: 1,
  }
  const summary = summarizeRows([{ ...unfinished, counted: true }])
  assert.equal(summary.unfinishedCount, 1)
  assert.equal(summary.completedCount, 0)
  assert.equal(summary.average, 8)
  assert.equal(summary.totalUnanswered, 10)
})

test('formatNumberRanges', () => {
  assert.equal(formatNumberRanges([3, 7, 12, 13, 14, 15]), '3, 7, 12-15')
  assert.equal(formatNumberRanges([1, 2]), '1, 2')
  assert.equal(formatNumberRanges([]), '')
})

const lessons = (n, chapterId = 'c1') =>
  Array.from({ length: n }, (_, i) => ({
    chapterId,
    chapterName: 'Chap',
    chapterOrder: 1,
    courseId: `l${i + 1}`,
    title: `Leçon ${i + 1}`,
    order: i,
  }))

const progressOf = (done, opened = [], tests = []) => ({
  completed: new Map(done.map((id) => [id, '2026-02-01'])),
  opened: new Map([...done, ...opened].map((id) => [id, '2026-01-30'])),
  testsDone: new Set(tests),
})

test('progression : 30 leçons terminées sur 40 = 75 %', () => {
  const all = lessons(40)
  const done = all.slice(0, 30).map((l) => l.courseId)
  const p = computeCourseProgress(all, progressOf(done))
  assert.equal(p.percent, 75)
  assert.equal(p.completed, 30)
  assert.equal(p.remaining.length, 10)
  assert.equal(p.status, 'in_progress')
})

test('progression : statuts non commencé / en cours / terminé / validé / à vérifier', () => {
  const all = lessons(3)
  assert.equal(computeCourseProgress(all, progressOf([])).status, 'not_started')
  assert.equal(computeCourseProgress(all, progressOf([], ['l1'])).status, 'in_progress')
  assert.equal(computeCourseProgress(all, progressOf(['l1', 'l2', 'l3'])).status, 'completed')
  assert.equal(computeCourseProgress(all, progressOf(['l1', 'l2', 'l3'], [], ['c1'])).status, 'validated')
  assert.equal(computeCourseProgress([], progressOf([])).status, 'to_verify')
})

test('progression : une leçon ouverte mais non terminée est « en cours », pas terminée', () => {
  const p = computeCourseProgress(lessons(3), progressOf(['l1'], ['l2']))
  assert.equal(p.completed, 1)
  assert.equal(p.inProgress, 1)
  assert.equal(p.notStarted, 1)
  assert.equal(p.followed, 2)
})
