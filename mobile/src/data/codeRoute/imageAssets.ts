/** Images embarquées — quiz hors ligne. N° image = N° question. */
export const CODE_IMAGE_MODULES: Record<number, Record<number, number>> = {
  1: {
    3: require('../../../assets/code-images/chapitre-1/3.png'),
    4: require('../../../assets/code-images/chapitre-1/4.png'),
    6: require('../../../assets/code-images/chapitre-1/6.png'),
    14: require('../../../assets/code-images/chapitre-1/14.png'),
    15: require('../../../assets/code-images/chapitre-1/15.png'),
    16: require('../../../assets/code-images/chapitre-1/16.png'),
    18: require('../../../assets/code-images/chapitre-1/18.png'),
    19: require('../../../assets/code-images/chapitre-1/19.png'),
    20: require('../../../assets/code-images/chapitre-1/20.png'),
    22: require('../../../assets/code-images/chapitre-1/22.png'),
    33: require('../../../assets/code-images/chapitre-1/33.png'),
    36: require('../../../assets/code-images/chapitre-1/36.png'),
  },
  3: {
    2: require('../../../assets/code-images/chapitre-3/2.png'),
    6: require('../../../assets/code-images/chapitre-3/6.png'),
    8: require('../../../assets/code-images/chapitre-3/8.png'),
  },
  8: {
    22: require('../../../assets/code-images/chapitre-8/22.png'),
    23: require('../../../assets/code-images/chapitre-8/23.png'),
    31: require('../../../assets/code-images/chapitre-8/31.png'),
    32: require('../../../assets/code-images/chapitre-8/32.png'),
    33: require('../../../assets/code-images/chapitre-8/33.png'),
    34: require('../../../assets/code-images/chapitre-8/34.png'),
  },
  9: {
    1: require('../../../assets/code-images/chapitre-9/1.png'),
    25: require('../../../assets/code-images/chapitre-9/25.png'),
    26: require('../../../assets/code-images/chapitre-9/26.png'),
    27: require('../../../assets/code-images/chapitre-9/27.png'),
    28: require('../../../assets/code-images/chapitre-9/28.png'),
    29: require('../../../assets/code-images/chapitre-9/29.png'),
  },
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
