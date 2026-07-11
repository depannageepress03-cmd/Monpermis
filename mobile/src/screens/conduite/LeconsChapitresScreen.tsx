import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, ChevronRight } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ContentError, fetchConduiteChapters, type ConduiteChapter } from '../../api/conduite'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'LeconsChapitres'>

export function LeconsChapitresScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [chapters, setChapters] = useState<ConduiteChapter[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChapters = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchConduiteChapters()
      setChapters(data)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (user) loadChapters()
  }, [user, loadChapters])

  if (authLoading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <PageNavbar
          title="Leçons de conduite"
          icon={BookOpen}
          onBack={() => navigation.navigate('Conduite')}
          tone="drive"
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadChapters(true)
              }}
              tintColor={brand.green}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Parcourez les leçons dans l’ordre pour avancer dans votre formation. Choisissez
              un chapitre pour voir les cours disponibles.
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={brand.green} size="large" />
            </View>
          ) : null}

          {error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => loadChapters()}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !error && chapters.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucun chapitre disponible</Text>
              <Text style={styles.emptyText}>
                Les chapitres publiés par votre auto-école apparaîtront ici.
              </Text>
            </View>
          ) : null}

          {!loading && !error
            ? chapters.map((chapter, index) => (
                <Pressable
                  key={chapter.id}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  onPress={() =>
                    navigation.navigate('LeconsCourses', {
                      chapterId: chapter.id,
                      chapterName: `${index + 1}. ${chapter.name}`,
                      courses: chapter.courses.map((course) => ({
                        id: course.id,
                        title: course.title,
                        modules: course.modules,
                      })),
                    })
                  }
                >
                  <View style={styles.iconWrap}>
                    <Text style={styles.cardNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{chapter.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {chapter.courses.length} cours
                    </Text>
                  </View>
                  <ChevronRight size={20} color={brand.navyMuted} />
                </Pressable>
              ))
            : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: brand.navyMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${brand.green}28`,
    backgroundColor: brand.greenLight,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: `${brand.green}30`,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: brand.green,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.navy,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: brand.navyMuted,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: brand.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: brand.navyMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: brand.green,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.88,
  },
})
