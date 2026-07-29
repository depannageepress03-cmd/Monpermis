/** Audios embarqués — lecture hors ligne. */
export const CODE_AUDIO_MODULES: Record<number, Record<number, number>> = {
  20: {
    1: require('../../../assets/code-audio/chapitre-20/1.mp3'),
    2: require('../../../assets/code-audio/chapitre-20/2.mp3'),
    3: require('../../../assets/code-audio/chapitre-20/3.mp3'),
    4: require('../../../assets/code-audio/chapitre-20/4.mp3'),
    5: require('../../../assets/code-audio/chapitre-20/5.mp3'),
  },
  21: {
    1: require('../../../assets/code-audio/chapitre-21/1.mp3'),
    2: require('../../../assets/code-audio/chapitre-21/2.mp3'),
    3: require('../../../assets/code-audio/chapitre-21/3.mp3'),
    4: require('../../../assets/code-audio/chapitre-21/4.mp3'),
    5: require('../../../assets/code-audio/chapitre-21/5.mp3'),
    6: require('../../../assets/code-audio/chapitre-21/6.mp3'),
    7: require('../../../assets/code-audio/chapitre-21/7.mp3'),
    8: require('../../../assets/code-audio/chapitre-21/8.mp3'),
    9: require('../../../assets/code-audio/chapitre-21/9.mp3'),
    10: require('../../../assets/code-audio/chapitre-21/10.mp3'),
  },
}

export function getCodeAudioModule(chapterOrder: number, questionOrder: number): number | null {
  return CODE_AUDIO_MODULES[chapterOrder]?.[questionOrder] ?? null
}
