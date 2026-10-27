import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { brand, dark, fonts } from '../theme'

type Props = {
  text: string
  resetKey: string
  progressive?: boolean
}

/** Sous-titres progressifs (révision uniquement). */
export function ProgressiveSubtitles({ text, resetKey, progressive = true }: Props) {
  const full = String(text || '').trim()
  const tokens = useMemo(() => {
    if (!full) return [] as string[]
    return full.split(/(\s+)/).filter((t) => t.length > 0)
  }, [full])

  const wordCount = useMemo(
    () => tokens.filter((t) => !/^\s+$/.test(t)).length,
    [tokens],
  )

  const [visibleWords, setVisibleWords] = useState(progressive ? 0 : wordCount)

  useEffect(() => {
    if (!progressive || wordCount === 0) {
      setVisibleWords(wordCount)
      return
    }
    setVisibleWords(0)
    const msPerWord = 320
    let shown = 0
    const id = setInterval(() => {
      shown += 1
      setVisibleWords(shown)
      if (shown >= wordCount) clearInterval(id)
    }, msPerWord)
    return () => clearInterval(id)
  }, [resetKey, progressive, wordCount])

  if (!full) return null

  let wordsSeen = 0
  const visible = tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token
      wordsSeen += 1
      return wordsSeen <= visibleWords ? token : ''
    })
    .join('')
    .replace(/\s+$/g, '')

  return (
    <View style={styles.box} accessibilityLabel="Sous-titres de l’énoncé audio">
      <Text style={styles.kicker}>Sous-titres</Text>
      <Text style={styles.text}>
        {visible || ' '}
        {progressive && visibleWords < wordCount ? '|' : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: brand.greenPale,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.22)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: dark.green,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    lineHeight: 27,
    color: brand.navy,
  },
})
