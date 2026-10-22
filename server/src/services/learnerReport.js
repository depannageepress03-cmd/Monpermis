import { Chapter } from '../models/Chapter.js'
import { PracticeExam } from '../models/PracticeExam.js'
import { RevisionCourse } from '../models/RevisionCourse.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import { LearnerTrackEvent } from '../models/LearnerTrackEvent.js'
import { User } from '../models/User.js'
import { STANDARD_REVISION_CHAPTER_COUNT } from '../data/standardRevisionChapters.js'
import { PRACTICE_EXAM_PASS_SCORE, PRACTICE_EXAM_SIZE } from '../utils/practiceExam.js'
import { publishedCourses } from '../utils/progress.js'
import {
  checkAttemptStats,
  checkSummary,
  computeAttemptStats,
  computeCourseProgress,
  pickCountedAttempts,
  summarizeRows,
} from '../utils/gradeCalc.js'
import { loadQuestionsByIds } from './hardcodedQuestions.js'

/** Au-delà de ce délai sans réponse, une tentative non terminée est considérée comme arrêtée en chemin. */
export const ATTEMPT_IDLE_MS = 20 * 60 * 1000

export function attemptOutcome(attempt, now = Date.now()) {
  if (attempt.status === 'completed') return 'completed'
  const last = new Date(attempt.updatedAt || attempt.createdAt).getTime()
  return now - last > ATTEMPT_IDLE_MS ? 'stopped' : 'in_progress'
}

/**
 * Leçons obligatoires = ce que l'élève voit dans l'application : les notions publiées
 * (collection RevisionCourse) rattachées aux chapitres 1…N, plus d'éventuels cours publiés
 * encore embarqués dans un chapitre (ancien format).
 */
export async function loadLessonCatalog() {
  const [chapters, notions] = await Promise.all([
    Chapter.find({ order: { $gte: 1, $lte: STANDARD_REVISION_CHAPTER_COUNT } }).sort({ order: 1, createdAt: 1 }),
    RevisionCourse.find({ published: true }).sort({ order: 1, createdAt: 1 }),
  ])
  const chapterById = new Map(chapters.map((chapter) => [String(chapter._id), chapter]))

  const lessons = []
  const seen = new Set()
  const push = (chapter, course) => {
    const courseId = String(course._id)
    if (seen.has(courseId)) return
    seen.add(courseId)
    lessons.push({
      chapterId: String(chapter._id),
      chapterName: chapter.name,
      chapterOrder: chapter.order ?? 0,
      courseId,
      title: course.title,
      order: course.order ?? 0,
    })
  }

  for (const notion of notions) {
    const chapter = notion.chapter ? chapterById.get(String(notion.chapter)) : null
    if (chapter) push(chapter, notion)
  }
  for (const chapter of chapters) {
    for (const course of publishedCourses(chapter)) push(chapter, course)
  }

  return lessons.sort((a, b) => a.chapterOrder - b.chapterOrder || a.order - b.order)
}

export function buildCourseProgress(user, lessons) {
  // La progression peut être stockée sous « standalone » (notions) ou sous l'id du chapitre
  // (ancien format) : l'identifiant de leçon est unique, on s'appuie donc dessus.
  const completed = new Map()
  for (const entry of user.completedCourses || []) {
    completed.set(String(entry.courseId), entry.completedAt ?? null)
  }
  const opened = new Map()
  for (const entry of user.courseSessions || []) {
    opened.set(String(entry.courseId), entry.openedAt ?? null)
  }
  const testsDone = new Set((user.completedTests || []).map((entry) => String(entry.chapterId)))

  const progress = computeCourseProgress(lessons, { completed, opened, testsDone })

  // Cours terminés par l'élève mais qui ne figurent plus dans le programme publié.
  const catalogKeys = new Set(lessons.map((l) => String(l.courseId)))
  const orphanCompleted = [...completed.keys()].filter((key) => !catalogKeys.has(key)).length

  return { ...progress, orphanCompleted }
}

async function loadExamMeta() {
  const exams = await PracticeExam.find().select('examNumber author sceneName coefficient').lean()
  return new Map(
    exams.map((exam) => [
      exam.examNumber,
      {
        author: String(exam.author || '').trim(),
        sceneName: String(exam.sceneName || '').trim(),
        coefficient: exam.coefficient ?? 1,
      },
    ]),
  )
}

/** Numéros (1-based) des questions fausses / non traitées d'une tentative. */
function questionNumbers(attempt) {
  const byQuestion = new Map((attempt.responses || []).map((r) => [String(r.questionId), r]))
  const wrong = []
  const unanswered = []
  ;(attempt.questionIds || []).forEach((rawId, index) => {
    const r = byQuestion.get(String(rawId))
    const treated = Boolean(r && Array.isArray(r.answerIds) && r.answerIds.length > 0)
    if (!treated) unanswered.push(index + 1)
    else if (!r.isCorrect) wrong.push(index + 1)
  })
  return { wrong, unanswered }
}

export function buildAttemptRow(attempt, meta, now = Date.now()) {
  const completed = attempt.status === 'completed'
  const questionCount = (attempt.questionIds || []).length || attempt.total || PRACTICE_EXAM_SIZE
  const stats = computeAttemptStats({ questionCount, responses: attempt.responses, completed })
  const coefficient = meta?.coefficient ?? 1
  const numbers = questionNumbers(attempt)
  const issues = checkAttemptStats(stats, {
    coefficient,
    storedCorrect: completed ? attempt.correct : undefined,
  })

  return {
    attemptId: String(attempt._id),
    examNumber: attempt.examNumber,
    subject: `Examen blanc n° ${attempt.examNumber}`,
    category: 'Code de la route',
    author: meta?.author || '',
    sceneName: meta?.sceneName || '',
    composedAt: attempt.createdAt ?? null,
    completedAt: attempt.completedAt ?? null,
    lastAt: attempt.updatedAt ?? attempt.createdAt ?? null,
    outcome: attemptOutcome(attempt, now),
    status: completed ? 'completed' : 'not_completed',
    statusLabel: completed ? 'Terminé' : 'Non terminé',
    ...stats,
    coefficient,
    passed: completed ? stats.correct >= PRACTICE_EXAM_PASS_SCORE : null,
    wrongNumbers: numbers.wrong,
    unansweredNumbers: numbers.unanswered,
    issues,
    counted: false,
  }
}

/** Lignes de registre + synthèse pour un ensemble de tentatives d'UN SEUL apprenant. */
export function buildExamRegister(attempts, metaByNumber, now = Date.now()) {
  const rows = attempts
    .map((attempt) => buildAttemptRow(attempt, metaByNumber.get(attempt.examNumber), now))
    .sort((a, b) => new Date(a.composedAt || 0) - new Date(b.composedAt || 0))

  const counted = pickCountedAttempts(rows)
  for (const row of rows) row.counted = counted.has(row.attemptId)

  const summary = summarizeRows(rows)
  const issues = [
    ...checkSummary(summary),
    ...rows.flatMap((row) =>
      row.issues.map((issue) => ({ ...issue, message: `${row.subject} : ${issue.message}` })),
    ),
  ]
  return { rows, summary, issues }
}

/** Informations obligatoires manquantes pour la fiche PDF — jamais complétées par une valeur inventée. */
export function findMissingInfo(learner, rows) {
  const missing = []
  if (!`${learner.firstName || ''} ${learner.lastName || ''}`.trim()) {
    missing.push({ field: 'name', label: 'Nom et prénoms de l’élève' })
  }
  const seen = new Set()
  for (const row of rows) {
    if (seen.has(row.examNumber)) continue
    seen.add(row.examNumber)
    if (!row.sceneName) {
      missing.push({
        field: 'sceneName',
        examNumber: row.examNumber,
        label: `Nom de la scène / épreuve — ${row.subject}`,
      })
    }
    if (!row.author) {
      missing.push({
        field: 'author',
        examNumber: row.examNumber,
        label: `Nom de l’auteur du sujet — ${row.subject}`,
      })
    }
  }
  return missing
}

function learnerIdentity(user) {
  return {
    id: String(user._id),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || '',
    registeredAt: user.createdAt ?? null,
    isActive: user.isActive !== false,
  }
}

/** Rapport complet d'UN apprenant (toutes les données viennent de cet apprenant uniquement). */
export async function buildLearnerReport(user) {
  const [attempts, metaByNumber, lessons] = await Promise.all([
    PracticeExamAttempt.find({ userId: user._id }).sort({ createdAt: 1 }).lean(),
    loadExamMeta(),
    loadLessonCatalog(),
  ])

  const register = buildExamRegister(attempts, metaByNumber)
  const course = buildCourseProgress(user, lessons)
  const learner = learnerIdentity(user)

  return {
    generatedAt: new Date().toISOString(),
    learner,
    exams: {
      passScore: PRACTICE_EXAM_PASS_SCORE,
      questionsPerExam: PRACTICE_EXAM_SIZE,
      rows: register.rows,
      summary: register.summary,
      issues: register.issues,
    },
    course,
    missingInfo: findMissingInfo(learner, register.rows),
  }
}

/** Classement de tous les apprenants par moyenne générale (pondérée). */
export async function buildRanking() {
  const [users, attempts, metaByNumber, lessons] = await Promise.all([
    User.find()
      .select('firstName lastName email phone isActive createdAt completedCourses courseSessions completedTests')
      .limit(2000)
      .lean(),
    PracticeExamAttempt.find()
      .select('userId examNumber status correct total questionIds responses.questionId responses.answerIds responses.isCorrect createdAt updatedAt completedAt')
      .lean(),
    loadExamMeta(),
    loadLessonCatalog(),
  ])

  const attemptsByUser = new Map()
  for (const attempt of attempts) {
    const key = String(attempt.userId)
    if (!attemptsByUser.has(key)) attemptsByUser.set(key, [])
    attemptsByUser.get(key).push(attempt)
  }

  const now = Date.now()
  const entries = users.map((user) => {
    const register = buildExamRegister(attemptsByUser.get(String(user._id)) || [], metaByNumber, now)
    const course = buildCourseProgress(user, lessons)
    return {
      userId: String(user._id),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      isActive: user.isActive !== false,
      average: register.summary.average,
      evaluatedCount: register.summary.evaluatedCount,
      completedCount: register.summary.completedCount,
      unfinishedCount: register.summary.unfinishedCount,
      bestNote: register.summary.bestNote,
      lowestNote: register.summary.lowestNote,
      anomalies: register.issues.length,
      course: {
        status: course.status,
        statusLabel: course.statusLabel,
        completed: course.completed,
        total: course.total,
        percent: course.percent,
      },
    }
  })

  entries.sort((a, b) => {
    if (a.average === null && b.average === null) return a.lastName.localeCompare(b.lastName, 'fr')
    if (a.average === null) return 1
    if (b.average === null) return -1
    return b.average - a.average || b.evaluatedCount - a.evaluatedCount
  })

  // Rang : ex æquo = même rang ; sans moyenne = pas de rang.
  let lastAverage = null
  let lastRank = 0
  entries.forEach((entry, index) => {
    if (entry.average === null) {
      entry.rank = null
      return
    }
    if (entry.average !== lastAverage) {
      lastRank = index + 1
      lastAverage = entry.average
    }
    entry.rank = lastRank
  })

  return { entries, passScore: PRACTICE_EXAM_PASS_SCORE, lessonsTotal: lessons.length }
}

/**
 * Détail question par question d'une tentative : réponses choisies, bonnes réponses, temps de réflexion.
 * Utilisé par l'activité apprenants et la fiche élève.
 */
export async function buildAttemptQuestions(attempt) {
  const attemptId = String(attempt._id)
  const [questions, answerEvents] = await Promise.all([
    loadQuestionsByIds(attempt.questionIds || []),
    LearnerTrackEvent.find({
      'context.attemptId': attemptId,
      event: { $in: ['exam_answer', 'exam_skip'] },
    })
      .sort({ createdAt: 1 })
      .select('context payload createdAt')
      .lean(),
  ])

  const questionById = new Map(questions.map((q) => [String(q.id || q._id), q]))
  const responseById = new Map((attempt.responses || []).map((r) => [String(r.questionId), r]))
  const eventByQuestion = new Map()
  for (const ev of answerEvents) {
    const qid = ev.context?.questionId ? String(ev.context.questionId) : ''
    if (qid && !eventByQuestion.has(qid)) eventByQuestion.set(qid, ev)
  }

  return (attempt.questionIds || []).map((rawId, index) => {
    const questionId = String(rawId)
    const raw = questionById.get(questionId)
    const q = raw && typeof raw.toAdminJSON === 'function' ? raw.toAdminJSON() : raw
    const response = responseById.get(questionId)
    const ev = eventByQuestion.get(questionId)
    const selected = new Set((response?.answerIds || []).map(String))
    let state = 'unanswered'
    if (response) {
      if (selected.size === 0) state = 'skipped'
      else state = response.isCorrect ? 'correct' : 'wrong'
    }
    const answers = (q?.answers || []).map((a) => {
      const id = String(a._id || a.id)
      return {
        id,
        label: a.label,
        text: a.text || '',
        audioUrl: a.audioUrl || '',
        isCorrect: Boolean(a.isCorrect),
        selected: selected.has(id),
      }
    })
    return {
      index,
      questionId,
      found: Boolean(q),
      // Le corrigé de référence manque : la correction reste à confirmer.
      correctionAvailable: answers.some((a) => a.isCorrect),
      chapterOrder: raw?.chapterOrder ?? null,
      questionNumber: raw?.order ?? null,
      prompt: {
        text: q?.prompt?.text || '',
        audioUrl: q?.prompt?.audioUrl || '',
        imageUrls: Array.isArray(q?.prompt?.imageUrls) ? q.prompt.imageUrls : [],
      },
      answers,
      state,
      isCorrect: response ? Boolean(response.isCorrect) : null,
      elapsedMs: typeof ev?.payload?.elapsedMs === 'number' ? ev.payload.elapsedMs : null,
      answeredAt: ev?.createdAt || null,
    }
  })
}
