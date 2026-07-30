export const STANDARD_REVISION_CHAPTER_COUNT = 20

export function standardChapterName(order: number) {
  return `Chapitre ${order}`
}

export function listStandardChapterShells() {
  return Array.from({ length: STANDARD_REVISION_CHAPTER_COUNT }, (_, index) => {
    const order = index + 1
    return {
      id: `local-ch-${order}`,
      name: standardChapterName(order),
      order,
      courses: [] as [],
    }
  })
}
