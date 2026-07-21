import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

/** Liens légaux affichés en bas de page. */
export function LegalFooter() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()

  return (
    <View style={styles.footer}>
      <Pressable
        onPress={() => navigation.navigate('TermsOfUse')}
        hitSlop={8}
        accessibilityRole="link"
      >
        <Text style={styles.link}>Conditions d’utilisation</Text>
      </Pressable>
      <Text style={styles.sep}>·</Text>
      <Pressable
        onPress={() => navigation.navigate('PrivacyPolicy')}
        hitSlop={8}
        accessibilityRole="link"
      >
        <Text style={styles.link}>Confidentialité</Text>
      </Pressable>
      <Text style={styles.sep}>·</Text>
      <Pressable
        onPress={() => navigation.navigate('MentionsLegales')}
        hitSlop={8}
        accessibilityRole="link"
      >
        <Text style={styles.link}>Mentions légales</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: dark.border,
  },
  sep: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
    textDecorationLine: 'underline',
  },
})
