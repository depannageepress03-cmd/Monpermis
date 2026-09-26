// QA — code de la route : hub, chapitres, QCM (juste/faux, sans fuite),
// examen blanc complet (score exact, idempotent), verrou sans accès.
import { describe, expect, it } from 'vitest'
import { api, useQaWorld } from './helpers/world.mjs'
import { models } from './helpers/db.mjs'
import { QA_PASSWORD, seedLearner, grantCodeAccess, seedCodeContent } from './helpers/seed.mjs'

useQaWorld()

async function loginAs(email) {
  const { status, json } = await api('/api/auth/login', {
    method: 'POST',
    body: { identifier: email, password: QA_PASSWORD, client: 'mobile' },
  })
  expect(status).toBe(200)
  return json.data.token
}

describe('verrouillage', () => {
  it('sans accès code → 403', async () => {
    await seedLearner({ email: 'qa.locked@test.local', phone: '0100000041' })
    const token = await loginAs('qa.locked@test.local')
    const { status } = await api('/api/content/revision/chapters', { token })
    expect(status).toBe(403)
  })
})

describe('qcm', () => {
  it('hub + questions sans fuite de correction, check juste/faux exact', async () => {
    await seedCodeContent()
    await seedLearner({ email: 'qa.qcm@test.local', phone: '0100000042' })
    const { User } = models
    await grantCodeAccess((await User.findOne({ email: 'qa.qcm@test.local' }))._id)
    const token = await loginAs('qa.qcm@test.local')

    const hub = await api('/api/content/revision/chapters', { token })
    expect(hub.status).toBe(200)
    const chapters = hub.json.data.chapters || hub.json.data
    expect(chapters.length).toBeGreaterThan(0)

    // Prend le premier chapitre adossé à une banque codée (questions réelles).
    let chapterId = null
    let publicQuestions = []
    for (const c of chapters) {
      const id = c.id || c._id
      const q = await api(`/api/content/revision/chapters/${id}/questions`, { token })
      if (q.status === 200 && (q.json.data.questions || []).length > 0) {
        chapterId = id
        publicQuestions = q.json.data.questions
        break
      }
    }
    expect(chapterId).toBeTruthy()
    expect(JSON.stringify(publicQuestions)).not.toMatch(/"isCorrect":true/)

    // Réponse juste puis fausse via la banque serveur (vérité de référence).
    const { getHardcodedQuestionsForChapter } = await import(
      '../src/services/hardcodedQuestions.js'
    )
    const { Chapter } = models
    const chapterDoc = await Chapter.findById(chapterId)
    const bank = getHardcodedQuestionsForChapter(chapterDoc)
    expect(bank.length).toBeGreaterThan(0)
    const [first] = bank
    const goodIds = first.answers.filter((a) => a.isCorrect).map((a) => String(a.id ?? a._id ?? a.label))
    const badIds = first.answers.filter((a) => !a.isCorrect).map((a) => String(a.id ?? a._id ?? a.label))
    expect(goodIds.length).toBeGreaterThan(0)
    expect(badIds.length).toBeGreaterThan(0)

    const good = await api(`/api/content/revision/chapters/${chapterId}/questions/check`, {
      method: 'POST',
      token,
      body: { questionId: String(first.id ?? first._id), answerIds: goodIds },
    })
    expect(good.status).toBe(200)
    expect(good.json.data.correct ?? good.json.data.isCorrect).toBe(true)

    const bad = await api(`/api/content/revision/chapters/${chapterId}/questions/check`, {
      method: 'POST',
      token,
      body: { questionId: String(first.id ?? first._id), answerIds: badIds.slice(0, 1) },
    })
    expect(bad.status).toBe(200)
    expect(bad.json.data.correct ?? bad.json.data.isCorrect).toBe(false)

    const invalid = await api(`/api/content/revision/chapters/${chapterId}/questions/check`, {
      method: 'POST',
      token,
      body: { questionId: 'nope', answerIds: [] },
    })
    // B2 corrigé : id invalide → 404 propre (plus de 500 CastError).
    expect(invalid.status).toBe(404)
  })
})

describe('examen blanc', () => {
  it('examen complet : score exact, double complete idempotent, score persisté', async () => {
    await seedLearner({ email: 'qa.examfull@test.local', phone: '0100000043' })
    const { User, Question } = models
    await grantCodeAccess((await User.findOne({ email: 'qa.examfull@test.local' }))._id)
    const token = await loginAs('qa.examfull@test.local')

    const started = await api('/api/content/revision/practice-exams/10/start', {
      method: 'POST',
      token,
    })
    expect([200, 201]).toContain(started.status)
    const attemptId =
      started.json.data.attempt?.id || started.json.data.attemptId || started.json.data.id
    expect(attemptId).toBeTruthy()

    const detail = await api(`/api/content/revision/practice-exams/attempts/${attemptId}`, {
      token,
    })
    expect(detail.status).toBe(200)
    const attempt = detail.json.data.attempt
    const questions = attempt.questions || []
    expect(questions.length).toBe(20)

    const { findHardcodedQuestionById } = await import(
      '../src/services/hardcodedQuestions.js'
    )
    // B6 (rapport) : certaines questions de banque n'ont AUCUNE bonne réponse
    // renseignée (ex. hc-ch13-q13) → on répond juste quand c'est possible et
    // on vérifie que le score égale le nombre de questions « répondables ».
    let answerable = 0
    for (const q of questions) {
      const bankQ = findHardcodedQuestionById(q.id || q._id)
      expect(bankQ).toBeTruthy()
      const goodLabels = new Set(
        bankQ.answers.filter((a) => a.isCorrect).map((a) => a.label),
      )
      const clientAnswers = q.answers || []
      const ids = clientAnswers
        .filter((a) => goodLabels.has(a.label))
        .map((a) => String(a.id ?? a._id))
      if (goodLabels.size > 0) {
        expect(ids.length).toBeGreaterThan(0)
        answerable += 1
      }
      const checked = await api(
        `/api/content/revision/practice-exams/attempts/${attemptId}/check`,
        {
          method: 'POST',
          token,
          body: {
            questionId: String(q.id || q._id),
            answerIds: ids.length > 0 ? ids : [String(clientAnswers[0]?.id)],
          },
        },
      )
      expect(checked.status).toBe(200)
      if (goodLabels.size > 0) expect(checked.json.data.isCorrect).toBe(true)
    }

    const done1 = await api(`/api/content/revision/practice-exams/attempts/${attemptId}/complete`, {
      method: 'POST',
      token,
    })
    expect(done1.status).toBe(200)
    expect(done1.json.data.attempt.correct).toBe(answerable)
    expect(done1.json.data.attempt.total).toBe(20)

    const done2 = await api(`/api/content/revision/practice-exams/attempts/${attemptId}/complete`, {
      method: 'POST',
      token,
    })
    expect(done2.status).toBe(200)
    expect(done2.json.data.attempt.correct).toBe(answerable)

    const scores = await api('/api/content/revision/practice-exams/scores', { token })
    expect(scores.status).toBe(200)
    const list = scores.json.data.scores || scores.json.data
    expect(list.some((s) => s.correct === answerable)).toBe(true)
  })
})
