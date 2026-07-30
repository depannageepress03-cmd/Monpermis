/** Accès libre au rythme de l’élève (après abonnement / code promo module). */

export function isChapterUnlocked(
  _chapterIndex: number,
  _previousChapterId: string | undefined,
  _completedTestIds: Set<string>,
) {
  return true
}

export function isChapterQuizUnlocked(_courseIds: string[], _completedCourseIds: Set<string>) {
  return true
}

/** Toutes les questions de révision sont accessibles. */
export function isChapterQuestionsUnlocked(_chapterUnlocked: boolean) {
  return true
}

/** Le sujet test est accessible sans prérequis de cours. */
export function isChapterTestSubjectUnlocked(
  _chapterUnlocked: boolean,
  _courseIds: string[],
  _completedCourseIds: Set<string>,
) {
  return true
}

/** Conservé pour stats / parcours ; n’est plus un verrou d’accès. */
export function areAllRevisionCoursesCompleted(
  chapters: { id: string; courses: { id: string }[] }[],
  completedCourseIdsByChapter: Record<string, Set<string>>,
) {
  if (chapters.length === 0) return false
  return chapters.every((chapter) => {
    const courseIds = chapter.courses.map((course) => course.id)
    if (courseIds.length === 0) return true
    const done = completedCourseIdsByChapter[chapter.id] ?? new Set()
    return courseIds.every((id) => done.has(id))
  })
}

export function isCourseUnlocked(
  _courseIndex: number,
  _previousCourseId: string | undefined,
  _completedCourseIds: Set<string>,
) {
  return true
}

export function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  if (m <= 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}
