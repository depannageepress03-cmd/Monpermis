import { Chapter } from '../models/Chapter.js'
import { ConduiteChapter } from '../models/ConduiteChapter.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_PASS_SCORE,
  isPracticeExamPassed,
} from './practiceExam.js'
import { publishedCourses } from './progress.js'

function courseProgressMap(user) {
  const map = new Map()
  for (const entry of user.completedCourses || []) {
    map.set(`${entry.chapterId}:${entry.courseId}`, entry)
  }
  return map
}

function testProgressMap(user) {
  const map = new Map()
  for (const entry of user.completedTests || []) {
    map.set(String(entry.chapterId), entry)
  }
  return map
}

function buildChapterJourney(chapter, courseMap, testMap, previousTestDone, track) {
  const courses = publishedCourses(chapter).map((course) => {
    const key = `${chapter._id}:${course._id}`
    const done = courseMap.get(key)
    return {
      id: String(course._id),
      title: course.title,
      order: course.order ?? 0,
      completed: Boolean(done),
      completedAt: done?.completedAt ?? null,
    }
  })

  const coursesCompleted = courses.filter((course) => course.completed).length
  const coursesTotal = courses.length
  const allCoursesDone = coursesTotal > 0 && coursesCompleted === coursesTotal
  const testEntry = testMap.get(String(chapter._id))
  const testDone = Boolean(testEntry)
  const chapterUnlocked = previousTestDone

  let status = 'locked'
  if (chapterUnlocked) {
    if (track === 'revision' && testDone) status = 'test_done'
    else if (allCoursesDone) status = track === 'revision' ? 'ready_for_test' : 'chapter_done'
    else if (coursesCompleted > 0) status = 'in_progress'
    else status = 'not_started'
  }

  const nextCourse = courses.find((course) => !course.completed) ?? null

  return {
    id: String(chapter._id),
    name: chapter.name,
    order: chapter.order ?? 0,
    unlocked: chapterUnlocked,
    status,
    courses,
    coursesCompleted,
    coursesTotal,
    quizUnlocked: allCoursesDone,
    test:
      track === 'revision'
        ? {
            completed: testDone,
            correct: testEntry?.correct ?? null,
            total: testEntry?.total ?? null,
            completedAt: testEntry?.completedAt ?? null,
            scoreLabel:
              testDone && testEntry
                ? `${testEntry.correct}/${testEntry.total}`
                : null,
          }
        : null,
    nextCourse,
  }
}

function findCurrentStop(chapters, track) {
  for (const chapter of chapters) {
    if (!chapter.unlocked) continue
    if (track === 'revision' && chapter.test?.completed) continue
    if (track === 'conduite' && chapter.status === 'chapter_done') continue

    if (chapter.nextCourse) {
      return {
        track,
        type: 'course',
        chapterId: chapter.id,
        chapterName: chapter.name,
        courseId: chapter.nextCourse.id,
        courseTitle: chapter.nextCourse.title,
        label: `Cours en cours : ${chapter.nextCourse.title} (${chapter.name})`,
      }
    }

    if (track === 'revision' && chapter.quizUnlocked && !chapter.test?.completed) {
      return {
        track,
        type: 'test',
        chapterId: chapter.id,
        chapterName: chapter.name,
        courseId: null,
        courseTitle: null,
        label: `Sujet test à passer : ${chapter.name}`,
      }
    }
  }

  if (chapters.length === 0) return null
  return {
    track,
    type: 'done',
    chapterId: null,
    chapterName: null,
    courseId: null,
    courseTitle: null,
    label: track === 'revision' ? 'Parcours code terminé' : 'Parcours conduite terminé',
  }
}

export async function buildLearnerJourney(user) {
  const [revisionDocs, conduiteDocs] = await Promise.all([
    Chapter.find({ published: true }).sort({ order: 1, createdAt: 1 }),
    ConduiteChapter.find({ published: true }).sort({ order: 1, createdAt: 1 }),
  ])

  const courseMap = courseProgressMap(user)
  const testMap = testProgressMap(user)

  let previousRevisionDone = true
  const revisionChapters = revisionDocs.map((chapter) => {
    const item = buildChapterJourney(
      chapter,
      courseMap,
      testMap,
      previousRevisionDone,
      'revision',
    )
    previousRevisionDone = Boolean(item.test?.completed)
    return item
  })

  let previousConduiteDone = true
  const conduiteChapters = conduiteDocs
    .map((chapter) => {
      const publicChapter = chapter.toPublicJSON?.() ?? chapter
      if ((publicChapter.courses || []).length === 0 && publishedCourses(chapter).length === 0) {
        return null
      }
      const item = buildChapterJourney(
        chapter,
        courseMap,
        testMap,
        previousConduiteDone,
        'conduite',
      )
      previousConduiteDone = item.status === 'chapter_done'
      return item
    })
    .filter(Boolean)

  const testScores = revisionChapters
    .filter((chapter) => chapter.test?.completed)
    .map((chapter) => ({
      chapterId: chapter.id,
      chapterName: chapter.name,
      correct: chapter.test.correct,
      total: chapter.test.total,
      scoreLabel: chapter.test.scoreLabel,
      completedAt: chapter.test.completedAt,
    }))

  const practiceAttempts = await PracticeExamAttempt.find({
    userId: user._id,
    status: 'completed',
  }).sort({ examNumber: 1, completedAt: -1 })

  const bestPractice = new Map()
  for (const attempt of practiceAttempts) {
    const current = bestPractice.get(attempt.examNumber)
    if (!current || attempt.correct > current.correct) {
      bestPractice.set(attempt.examNumber, attempt)
    }
  }

  const practiceExamScores = [...bestPractice.values()]
    .sort((a, b) => a.examNumber - b.examNumber)
    .map((attempt) => attempt.toScoreJSON())

  return {
    code: {
      chapters: revisionChapters,
      currentStop: findCurrentStop(revisionChapters, 'revision'),
      chaptersDone: revisionChapters.filter((c) => c.test?.completed).length,
      chaptersTotal: revisionChapters.length,
    },
    conduite: {
      chapters: conduiteChapters,
      currentStop: findCurrentStop(conduiteChapters, 'conduite'),
      chaptersDone: conduiteChapters.filter((c) => c.status === 'chapter_done').length,
      chaptersTotal: conduiteChapters.length,
    },
    testScores,
    practiceExams: {
      examTotal: PRACTICE_EXAM_COUNT,
      passScore: PRACTICE_EXAM_PASS_SCORE,
      completedCount: practiceExamScores.length,
      passedCount: practiceExamScores.filter((s) => isPracticeExamPassed(s.correct)).length,
      scores: practiceExamScores,
    },
  }
}
