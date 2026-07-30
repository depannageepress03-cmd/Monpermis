import { useWindowDimensions, StyleSheet, Text } from 'react-native'
import RenderHTML from 'react-native-render-html'
import { dark, fonts } from '../theme'
import { sanitizeCmsHtml } from '../utils/sanitizeHtml'

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

interface Props {
  text?: string | null
  style?: object
}

/** Affiche le texte d’énoncé (plain ou HTML admin TipTap). */
export function QuestionPromptHtml({ text, style }: Props) {
  const { width } = useWindowDimensions()
  const value = String(text || '').trim()
  if (!value) return null

  if (!looksLikeHtml(value)) {
    return <Text style={[styles.plain, style]}>{value}</Text>
  }

  return (
    <RenderHTML
      contentWidth={Math.max(width - 64, 240)}
      source={{ html: sanitizeCmsHtml(value) }}
      baseStyle={{ ...styles.plain, ...(style as object) }}
      tagsStyles={{
        p: { marginTop: 0, marginBottom: 8 },
        strong: { fontFamily: fonts.bodyBold },
        b: { fontFamily: fonts.bodyBold },
        em: { fontStyle: 'italic' },
        ul: { marginBottom: 8, paddingLeft: 18 },
        ol: { marginBottom: 8, paddingLeft: 18 },
        li: { marginBottom: 4 },
        a: { color: dark.green, textDecorationLine: 'underline' },
        mark: { backgroundColor: 'rgba(255,192,0,0.35)' },
      }}
    />
  )
}

const styles = StyleSheet.create({
  plain: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textPrimary,
  },
})
