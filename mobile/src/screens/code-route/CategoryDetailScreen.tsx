import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { ClipboardCheck } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

interface CategoryDetailScreenProps {
  title: string
  description: string
}

export function CategoryDetailScreen({ title, description }: CategoryDetailScreenProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const { user, loading } = useRequireAuth(navigation)

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title={title}
        icon={ClipboardCheck}
        onBack={() => navigation.navigate('CodeRoute')}
        numberOfLines={2}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Bientôt disponible</Text>
          <Text style={styles.subtitle}>{description}</Text>
        </View>
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: dark.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 24,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    lineHeight: 20,
  },
})
