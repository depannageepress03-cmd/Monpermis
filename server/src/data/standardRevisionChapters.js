/** Les 19 chapitres de révision code — catalogue figé (pas de création admin). */

export const STANDARD_REVISION_CHAPTER_COUNT = 19

export function standardRevisionChapterName(order) {
  return `Chapitre ${order}`
}

export function listStandardRevisionChapters() {
  return Array.from({ length: STANDARD_REVISION_CHAPTER_COUNT }, (_, index) => {
    const order = index + 1
    return {
      order,
      name: standardRevisionChapterName(order),
    }
  })
}
