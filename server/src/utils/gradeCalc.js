/**
 * Calculs de notes, de moyenne et de progression pédagogique — fonctions pures
 * (aucun accès base de données) pour rester vérifiables et testables.
 *
 * Règles :
 * - une question est « traitée » si l'apprenant a coché au moins une réponse ;
 * - une question zappée (aucune réponse cochée) ou jamais atteinte est « non traitée » ;
 * - total ratées = incorrectes + non traitées ;
 * - note /20 = correctes ÷ questions totales × 20 (toutes les questions pèsent pareil,
 *   une question à réponses multiples n'est juste que si l'ensemble exact est coché —
 *   règle déjà appliquée par le serveur à l'enregistrement de chaque réponse).
 */

export const SCORE_SCALE = 20

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function isValidCoefficient(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0
}

/**
 * @param {{ questionCount: number, responses: {questionId?: string, answerIds?: string[], isCorrect?: boolean}[], completed: boolean }} input
 */
export function computeAttemptStats({ questionCount, responses, completed }) {
  const total = Math.max(0, Number(questionCount) || 0)

  // Une seule réponse par question (la première enregistrée fait foi).
  const seen = new Set()
  const unique = []
  for (const response of responses || []) {
    const key = String(response?.questionId ?? `#${unique.length}`)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(response)
  }

  const treatedList = unique.filter((r) => Array.isArray(r.answerIds) && r.answerIds.length > 0)
  const treated = treatedList.length
  const correct = treatedList.filter((r) => r.isCorrect).length
  const incorrect = treated - correct
  const unanswered = total - treated
  const failed = incorrect + unanswered
  const note = total > 0 ? round2((correct / total) * SCORE_SCALE) : null

  return {
    total,
    treated,
    correct,
    incorrect,
    unanswered,
    failed,
    note,
    completed: Boolean(completed),
    // Un sujet est « évalué » s'il est terminé ou si au moins une réponse a été donnée.
    evaluated: Boolean(completed) || treated > 0,
  }
}

/**
 * Contrôles de cohérence d'un sujet. `stored` = valeurs enregistrées indépendamment (facultatif).
 * @returns {{code: string, message: string}[]}
 */
export function checkAttemptStats(stats, { coefficient, storedCorrect } = {}) {
  const issues = []
  const push = (code, message) => issues.push({ code, message })

  if (stats.treated > stats.total) {
    push('treated_gt_total', `Questions traitées (${stats.treated}) supérieures au total (${stats.total}).`)
  }
  if (stats.correct > stats.treated) {
    push('correct_gt_treated', `Réponses correctes (${stats.correct}) supérieures aux questions traitées (${stats.treated}).`)
  }
  if (stats.correct + stats.incorrect !== stats.treated) {
    push(
      'correct_plus_incorrect',
      `Correctes (${stats.correct}) + incorrectes (${stats.incorrect}) ≠ traitées (${stats.treated}).`,
    )
  }
  if (stats.total !== stats.treated + stats.unanswered) {
    push('total_mismatch', `Total (${stats.total}) ≠ traitées (${stats.treated}) + non traitées (${stats.unanswered}).`)
  }
  if (stats.failed !== stats.incorrect + stats.unanswered) {
    push('failed_mismatch', `Ratées (${stats.failed}) ≠ incorrectes (${stats.incorrect}) + non traitées (${stats.unanswered}).`)
  }
  if (coefficient !== undefined && !isValidCoefficient(coefficient)) {
    push('invalid_coefficient', `Coefficient invalide (${coefficient}).`)
  }
  if (stats.completed && storedCorrect !== undefined && storedCorrect !== null && storedCorrect !== stats.correct) {
    push(
      'stored_score_mismatch',
      `Note enregistrée (${storedCorrect}) différente du recalcul (${stats.correct}) à partir des réponses.`,
    )
  }
  return issues
}

/**
 * Parmi plusieurs tentatives d'un même examen, seule la meilleure note compte dans la moyenne
 * (même règle que les « notes » côté application). Égalité → la plus récente.
 * @param {{attemptId: string, examNumber: number, evaluated: boolean, note: number|null, lastAt?: string|Date}[]} rows
 * @returns {Set<string>} ids des tentatives retenues
 */
export function pickCountedAttempts(rows) {
  const best = new Map()
  for (const row of rows) {
    if (!row.evaluated || row.note === null) continue
    const current = best.get(row.examNumber)
    if (!current) {
      best.set(row.examNumber, row)
      continue
    }
    const newer = new Date(row.lastAt || 0).getTime() > new Date(current.lastAt || 0).getTime()
    if (row.note > current.note || (row.note === current.note && newer)) {
      best.set(row.examNumber, row)
    }
  }
  return new Set([...best.values()].map((row) => row.attemptId))
}

/**
 * Synthèse sur les sujets retenus (`counted`). Un sujet non évalué n'est jamais assimilé à 0.
 * Moyenne = Σ(note × coef) ÷ Σ(coef) ; avec coefficients égaux = moyenne simple.
 * Un coefficient invalide exclut le sujet de la moyenne (et est signalé ailleurs).
 */
export function summarizeRows(rows) {
  const counted = rows.filter((row) => row.counted)
  const weighted = counted.filter((row) => row.note !== null && isValidCoefficient(row.coefficient))

  const weightSum = weighted.reduce((sum, row) => sum + Number(row.coefficient), 0)
  const average =
    weighted.length > 0 && weightSum > 0
      ? round2(weighted.reduce((sum, row) => sum + row.note * Number(row.coefficient), 0) / weightSum)
      : null

  const notes = weighted.map((row) => row.note)
  const sum = (key) => counted.reduce((total, row) => total + row[key], 0)

  return {
    attemptsListed: rows.length,
    evaluatedCount: counted.length,
    completedCount: counted.filter((row) => row.completed).length,
    unfinishedCount: counted.filter((row) => !row.completed).length,
    totalQuestions: sum('total'),
    totalCorrect: sum('correct'),
    totalIncorrect: sum('incorrect'),
    totalUnanswered: sum('unanswered'),
    totalFailed: sum('failed'),
    coefficientSum: round2(weightSum),
    average,
    bestNote: notes.length ? Math.max(...notes) : null,
    lowestNote: notes.length ? Math.min(...notes) : null,
  }
}

export function checkSummary(summary) {
  const issues = []
  if (summary.average !== null && summary.evaluatedCount === 0) {
    issues.push({ code: 'average_without_subject', message: 'Moyenne calculée sans sujet évalué.' })
  }
  return issues
}

/** 1-based → « 3, 7, 12-15 » */
export function formatNumberRanges(numbers) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b)
  const parts = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1
    parts.push(j - i >= 2 ? `${sorted[i]}-${sorted[j]}` : sorted.slice(i, j + 1).join(', '))
    i = j + 1
  }
  return parts.join(', ')
}

export const COURSE_STATUS_LABELS = {
  not_started: 'Cours non commencé',
  in_progress: 'Cours en cours',
  completed: 'Cours terminé',
  validated: 'Cours intégralement validé',
  to_verify: 'Progression à vérifier',
}

/**
 * Progression dans le cours du Code de la route.
 *
 * @param {{chapterId: string, chapterName: string, chapterOrder: number, courseId: string, title: string, order: number}[]} lessons
 *        leçons obligatoires = cours publiés du programme
 * @param {{completed: Map<string, Date|string>, opened: Map<string, Date|string>, testsDone: Set<string>}} progress
 *        clés = identifiant de la leçon (courseId, unique) ; testsDone = chapitres dont le sujet test est validé
 */
export function computeCourseProgress(lessons, progress) {
  const key = (lesson) => String(lesson.courseId)
  const total = lessons.length

  const items = lessons.map((lesson) => {
    const completedAt = progress.completed.get(key(lesson)) ?? null
    const openedAt = progress.opened.get(key(lesson)) ?? null
    const isCompleted = progress.completed.has(key(lesson))
    const isOpened = progress.opened.has(key(lesson))
    const chapterValidated = progress.testsDone.has(String(lesson.chapterId))
    let state = 'not_started'
    if (isCompleted) state = 'completed'
    else if (isOpened) state = 'in_progress'
    return {
      ...lesson,
      state,
      openedAt,
      completedAt,
      // Pas de validation par leçon : une leçon est « validée » quand elle est terminée
      // ET que le sujet test de son chapitre a été validé.
      validated: isCompleted && chapterValidated,
    }
  })

  const completed = items.filter((l) => l.state === 'completed').length
  const inProgress = items.filter((l) => l.state === 'in_progress').length
  const notStarted = items.filter((l) => l.state === 'not_started').length
  const validated = items.filter((l) => l.validated).length
  const percent = total > 0 ? Math.round((completed / total) * 100) : null

  const chaptersWithLessons = [...new Set(lessons.map((l) => String(l.chapterId)))]
  const allChaptersValidated =
    chaptersWithLessons.length > 0 && chaptersWithLessons.every((id) => progress.testsDone.has(id))

  let status
  if (total === 0) status = 'to_verify'
  else if (completed === total) status = allChaptersValidated ? 'validated' : 'completed'
  else if (completed === 0 && inProgress === 0) status = 'not_started'
  else status = 'in_progress'

  const issues = []
  if (completed > total) {
    issues.push({
      code: 'lessons_done_gt_total',
      message: `Leçons terminées (${completed}) supérieures au total (${total}).`,
    })
  }
  if (total === 0) {
    issues.push({ code: 'no_lessons', message:
        'Aucune leçon obligatoire : aucune notion publiée n’est rangée dans un chapitre du programme (onglet Cours). Progression impossible à déterminer.' })
  }

  return {
    total,
    followed: completed + inProgress,
    completed,
    inProgress,
    notStarted,
    validated,
    percent,
    status,
    statusLabel: COURSE_STATUS_LABELS[status],
    chaptersTotal: chaptersWithLessons.length,
    chaptersValidated: chaptersWithLessons.filter((id) => progress.testsDone.has(id)).length,
    lessons: items,
    remaining: items.filter((l) => l.state !== 'completed'),
    issues,
  }
}
