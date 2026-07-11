import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { ClipboardCheck } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { AppScreenLayout } from '../../components/AppScreenLayout'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { colors, radii, shadows } from '../../theme'

interface CategoryDetailScreenProps {
  title: string
  description: string
}

export function CategoryDetailScreen({ title, description }: CategoryDetailScreenProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const { user, loading } = useRequireAuth(navigation)

  if (loading || !user) return <ScreenLoader />

  return (
    <AppScreenLayout
      header={
        <PageNavbar
          title={title}
          icon={ClipboardCheck}
          onBack={() => navigation.navigate('CodeRoute')}
          numberOfLines={2}
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.title}>Bientôt disponible</Text>
        <Text style={styles.subtitle}>{description}</Text>
      </View>
    </AppScreenLayout>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 24,
    ...shadows.card,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
})
