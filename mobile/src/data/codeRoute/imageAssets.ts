/** Images embarquées — quiz hors ligne. N° image = N° question. */
export const CODE_IMAGE_MODULES: Record<number, Record<number, number>> = {
  16: {
    1: require('../../../assets/code-images/chapitre-16/1.png'),
    2: require('../../../assets/code-images/chapitre-16/2.png'),
    3: require('../../../assets/code-images/chapitre-16/3.png'),
    8: require('../../../assets/code-images/chapitre-16/8.png'),
  },
  18: {
    1: require('../../../assets/code-images/chapitre-18/1.png'),
  },
}

export function getCodeImageModule(chapterOrder: number, imageIndex: number): number | null {
  return CODE_IMAGE_MODULES[chapterOrder]?.[imageIndex] ?? null
}
