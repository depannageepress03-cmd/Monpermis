import { MIN_COURSE_SECONDS } from '../models/User.js'

export function publishedCourses(chapter) {
  return [...(chapter.courses || [])]
    .filter((course) => course.published)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function publishedCourseIds(chapter) {
  return publishedCourses(chapter).map((course) => String(course._id))
}

export function allChapterCoursesCompleted(user, chapter) {
  const ids = publishedCourseIds(chapter)
  if (ids.length === 0) return false
  return ids.every((courseId) => user.hasCompletedCourse(chapter._id, courseId))
}

export function allRevisionCoursesCompleted(user, chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) return false
  return chapters.every((chapter) => allChapterCoursesCompleted(user, chapter))
}

export function isCourseSequentiallyUnlocked(user, chapter, courseId) {
  const ids = publishedCourseIds(chapter)
  const target = String(courseId)
  const index = ids.indexOf(target)
  if (index < 0) return false
  if (index === 0) return true
  return ids.slice(0, index).every((id) => user.hasCompletedCourse(chapter._id, id))
}

export function serializeProgress(user, chapterId = null) {
  const completedCourses = chapterId
    ? (user.completedCourses || []).filter((entry) => entry.chapterId === String(chapterId))
    : user.completedCourses || []

  const completedTests = chapterId
    ? (user.completedTests || []).filter((entry) => entry.chapterId === String(chapterId))
    : user.completedTests || []

  const courseSessions = chapterId
    ? (user.courseSessions || []).filter((entry) => entry.chapterId === String(chapterId))
    : user.courseSessions || []

  return {
    minCourseSeconds: MIN_COURSE_SECONDS,
    completedCourses: completedCourses.map((entry) => ({
      chapterId: entry.chapterId,
      courseId: entry.courseId,
      completedAt: entry.completedAt,
    })),
    completedTests: completedTests.map((entry) => ({
      chapterId: entry.chapterId,
      correct: entry.correct,
      total: entry.total,
      completedAt: entry.completedAt,
    })),
    courseSessions: courseSessions.map((entry) => ({
      chapterId: entry.chapterId,
      courseId: entry.courseId,
      openedAt: entry.openedAt,
      secondsRemaining: user.getCourseUnlockSeconds(entry.chapterId, entry.courseId),
    })),
  }
}
