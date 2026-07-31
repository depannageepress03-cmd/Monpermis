/** URLs Vite des images embarquées (hors ligne après premier chargement). N° = question. */
import img1_3 from '../../assets/code-images/chapitre-1/3.png?url'
import img1_4 from '../../assets/code-images/chapitre-1/4.png?url'
import img1_6 from '../../assets/code-images/chapitre-1/6.png?url'
import img1_14 from '../../assets/code-images/chapitre-1/14.png?url'
import img1_15 from '../../assets/code-images/chapitre-1/15.png?url'
import img1_16 from '../../assets/code-images/chapitre-1/16.png?url'
import img1_18 from '../../assets/code-images/chapitre-1/18.png?url'
import img1_19 from '../../assets/code-images/chapitre-1/19.png?url'
import img1_20 from '../../assets/code-images/chapitre-1/20.png?url'
import img1_22 from '../../assets/code-images/chapitre-1/22.png?url'
import img1_33 from '../../assets/code-images/chapitre-1/33.png?url'
import img1_36 from '../../assets/code-images/chapitre-1/36.png?url'
import img3_2 from '../../assets/code-images/chapitre-3/2.png?url'
import img3_6 from '../../assets/code-images/chapitre-3/6.png?url'
import img3_8 from '../../assets/code-images/chapitre-3/8.png?url'
import img8_22 from '../../assets/code-images/chapitre-8/22.png?url'
import img8_23 from '../../assets/code-images/chapitre-8/23.png?url'
import img8_31 from '../../assets/code-images/chapitre-8/31.png?url'
import img8_32 from '../../assets/code-images/chapitre-8/32.png?url'
import img8_33 from '../../assets/code-images/chapitre-8/33.png?url'
import img8_34 from '../../assets/code-images/chapitre-8/34.png?url'
import img9_1 from '../../assets/code-images/chapitre-9/1.png?url'
import img9_25 from '../../assets/code-images/chapitre-9/25.png?url'
import img9_26 from '../../assets/code-images/chapitre-9/26.png?url'
import img9_27 from '../../assets/code-images/chapitre-9/27.png?url'
import img9_28 from '../../assets/code-images/chapitre-9/28.png?url'
import img9_29 from '../../assets/code-images/chapitre-9/29.png?url'
import img16_1 from '../../assets/code-images/chapitre-16/1.png?url'
import img16_2 from '../../assets/code-images/chapitre-16/2.png?url'
import img16_3 from '../../assets/code-images/chapitre-16/3.png?url'
import img16_8 from '../../assets/code-images/chapitre-16/8.png?url'
import img18_1 from '../../assets/code-images/chapitre-18/1.png?url'

const MAP: Record<number, Record<number, string>> = {
  1: {
    3: new URL('../../../assets/code-images/chapitre-1/3.png', import.meta.url).href,
    4: new URL('../../../assets/code-images/chapitre-1/4.png', import.meta.url).href,
    6: new URL('../../../assets/code-images/chapitre-1/6.png', import.meta.url).href,
    14: new URL('../../../assets/code-images/chapitre-1/14.png', import.meta.url).href,
    15: new URL('../../../assets/code-images/chapitre-1/15.png', import.meta.url).href,
    16: new URL('../../../assets/code-images/chapitre-1/16.png', import.meta.url).href,
    18: new URL('../../../assets/code-images/chapitre-1/18.png', import.meta.url).href,
    19: new URL('../../../assets/code-images/chapitre-1/19.png', import.meta.url).href,
    20: new URL('../../../assets/code-images/chapitre-1/20.png', import.meta.url).href,
    22: new URL('../../../assets/code-images/chapitre-1/22.png', import.meta.url).href,
    33: new URL('../../../assets/code-images/chapitre-1/33.png', import.meta.url).href,
    36: new URL('../../../assets/code-images/chapitre-1/36.png', import.meta.url).href,
    44: new URL('../../../assets/code-images/chapitre-1/44.png', import.meta.url).href,
    45: new URL('../../../assets/code-images/chapitre-1/45.png', import.meta.url).href,
    46: new URL('../../../assets/code-images/chapitre-1/46.png', import.meta.url).href,
    48: new URL('../../../assets/code-images/chapitre-1/48.png', import.meta.url).href,
    49: new URL('../../../assets/code-images/chapitre-1/49.png', import.meta.url).href,
    50: new URL('../../../assets/code-images/chapitre-1/50.png', import.meta.url).href,
    51: new URL('../../../assets/code-images/chapitre-1/51.png', import.meta.url).href,
    52: new URL('../../../assets/code-images/chapitre-1/52.png', import.meta.url).href,
    53: new URL('../../../assets/code-images/chapitre-1/53.png', import.meta.url).href,
    54: new URL('../../../assets/code-images/chapitre-1/54.png', import.meta.url).href,
    55: new URL('../../../assets/code-images/chapitre-1/55.png', import.meta.url).href,
    56: new URL('../../../assets/code-images/chapitre-1/56.png', import.meta.url).href,
    57: new URL('../../../assets/code-images/chapitre-1/57.png', import.meta.url).href,
    58: new URL('../../../assets/code-images/chapitre-1/58.png', import.meta.url).href,
    59: new URL('../../../assets/code-images/chapitre-1/59.png', import.meta.url).href,
    60: new URL('../../../assets/code-images/chapitre-1/60.png', import.meta.url).href,
    61: new URL('../../../assets/code-images/chapitre-1/61.png', import.meta.url).href,
    63: new URL('../../../assets/code-images/chapitre-1/63.png', import.meta.url).href,
    64: new URL('../../../assets/code-images/chapitre-1/64.png', import.meta.url).href,
    66: new URL('../../../assets/code-images/chapitre-1/66.png', import.meta.url).href,
    68: new URL('../../../assets/code-images/chapitre-1/68.png', import.meta.url).href,
    70: new URL('../../../assets/code-images/chapitre-1/70.png', import.meta.url).href,
    72: new URL('../../../assets/code-images/chapitre-1/72.png', import.meta.url).href,
    73: new URL('../../../assets/code-images/chapitre-1/73.png', import.meta.url).href,
    74: new URL('../../../assets/code-images/chapitre-1/74.png', import.meta.url).href,
    76: new URL('../../../assets/code-images/chapitre-1/76.png', import.meta.url).href,
    77: new URL('../../../assets/code-images/chapitre-1/77.png', import.meta.url).href,
    78: new URL('../../../assets/code-images/chapitre-1/78.png', import.meta.url).href,
    80: new URL('../../../assets/code-images/chapitre-1/80.png', import.meta.url).href,
    81: new URL('../../../assets/code-images/chapitre-1/81.png', import.meta.url).href,
    96: new URL('../../../assets/code-images/chapitre-1/96.png', import.meta.url).href,
    97: new URL('../../../assets/code-images/chapitre-1/97.png', import.meta.url).href,
    98: new URL('../../../assets/code-images/chapitre-1/98.png', import.meta.url).href,
    99: new URL('../../../assets/code-images/chapitre-1/99.png', import.meta.url).href,
    100: new URL('../../../assets/code-images/chapitre-1/100.png', import.meta.url).href,
    101: new URL('../../../assets/code-images/chapitre-1/101.png', import.meta.url).href,
    102: new URL('../../../assets/code-images/chapitre-1/102.png', import.meta.url).href,
    104: new URL('../../../assets/code-images/chapitre-1/104.png', import.meta.url).href,
    106: new URL('../../../assets/code-images/chapitre-1/106.png', import.meta.url).href,
  },
  3: {
    2: img3_2,
    6: img3_6,
    8: img3_8,
  },
  8: {
    22: img8_22,
    23: img8_23,
    31: img8_31,
    32: img8_32,
    33: img8_33,
    34: img8_34,
  },
  9: {
    1: img9_1,
    25: img9_25,
    26: img9_26,
    27: img9_27,
    28: img9_28,
    29: img9_29,
  },
  16: {
    1: img16_1,
    2: img16_2,
    3: img16_3,
    8: img16_8,
  },
  18: {
    1: img18_1,
  },
}

export function getBundledCodeImageUrl(chapterOrder: number, imageIndex: number): string | null {
  return MAP[chapterOrder]?.[imageIndex] || null
}
