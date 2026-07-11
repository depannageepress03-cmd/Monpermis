/** Helpers de déblocage progressif (cours → quiz → chapitre suivant). */

export function isChapterUnlocked(
  chapterIndex: number,
  previousChapterId: string | undefined,
  completedTestIds: Set<string>,
) {
  if (chapterIndex <= 0) return true
  if (!previousChapterId) return true
  return completedTestIds.has(previousChapterId)
}

export function isChapterQuizUnlocked(courseIds: string[], completedCourseIds: Set<string>) {
  if (courseIds.length === 0) return false
  return courseIds.every((id) => completedCourseIds.has(id))
}

/** Toutes les questions de révision sont accessibles dès que le chapitre est ouvert. */
export function isChapterQuestionsUnlocked(chapterUnlocked: boolean) {
  return chapterUnlocked
}

/** Le sujet test (examen du chapitre) exige que tous les cours du chapitre soient terminés. */
export function isChapterTestSubjectUnlocked(
  chapterUnlocked: boolean,
  courseIds: string[],
  completedCourseIds: Set<string>,
) {
  return chapterUnlocked && isChapterQuizUnlocked(courseIds, completedCourseIds)
}

/** Les examens test globaux exigent que tous les cours de tous les chapitres soient terminés. */
export function areAllRevisionCoursesCompleted(
  chapters: { id: string; courses: { id: string }[] }[],
  completedCourseIdsByChapter: Record<string, Set<string>>,
) {
  if (chapters.length === 0) return false
  return chapters.every((chapter) =>
    isChapterQuizUnlocked(
      chapter.courses.map((course) => course.id),
      completedCourseIdsByChapter[chapter.id] ?? new Set(),
    ),
  )
}

export function isCourseUnlocked(
  courseIndex: number,
  previousCourseId: string | undefined,
  completedCourseIds: Set<string>,
) {
  if (courseIndex <= 0) return true
  if (!previousCourseId) return true
  return completedCourseIds.has(previousCourseId)
}

export function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  if (m <= 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}
