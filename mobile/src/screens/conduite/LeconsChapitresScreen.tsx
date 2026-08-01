import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  User,
} from 'lucide-react-native'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Ellipse, Path, Rect } from 'react-native-svg'
import { ContentError, fetchConduiteChapters, type ConduiteChapter } from '../../api/conduite'
import { Bouncy } from '../../components/Bouncy'
import { EmptyState } from '../../components/EmptyState'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'LeconsChapitres'>

const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'

function LessonsHeroArt() {
  return (
    <View style={styles.heroArt} accessibilityElementsHidden>
      <Svg width={120} height={100} viewBox="0 0 120 100">
        <Ellipse cx="60" cy="78" rx="34" ry="8" fill="rgba(249,115,22,0.12)" />
        <Path
          d="M28 34c0-10 10-18 32-18s32 8 32 18v36c0 8-10 14-32 14s-32-6-32-14V34Z"
          fill={ORANGE}
        />
        <Path
          d="M60 16c18 0 28 6 28 14v36c0 6-8 12-28 12V16Z"
          fill="#FB923C"
        />
        <Path d="M60 16v62" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <Path
          d="M38 34h16M38 44h14M38 54h12"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.9"
        />
        <Path
          d="M66 34h16M66 44h14M66 54h12"
          stroke="#FFF7ED"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <Path
          d="M22 42c-6-4-8-12-4-16M98 42c6-4 8-12 4-16M30 22c-2-8 4-14 10-12M90 22c2-8-4-14-10-12"
          stroke={ORANGE}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />
        <Rect x="48" y="70" width="24" height="4" rx="2" fill="#FFFFFF" opacity="0.35" />
      </Svg>
    </View>
  )
}

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

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  if (authLoading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Conduite')}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>

          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <BookOpen size={15} color={ORANGE} />
            </View>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              Leçons de conduite
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityLabel="Profil"
            hitSlop={8}
          >
            <User size={19} color={dark.textMuted} />
          </Pressable>
        </View>

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
              tintColor={ORANGE}
            />
          }
        >
          <FadeUp delay={40}>
            <View style={styles.hero}>
              <LessonsHeroArt />
              <Text style={styles.heroTitle}>Apprends, comprends, progresses.</Text>
              <Text style={styles.heroSubtitle}>
                Parcourez les leçons dans l’ordre pour avancer dans votre formation. Choisissez un
                chapitre pour voir les cours disponibles.
              </Text>
            </View>
          </FadeUp>

          {loading ? (
            <View style={styles.skeletonBlock}>
              <SkeletonList count={3} />
            </View>
          ) : null}

          {error ? (
            <EmptyState
              icon={<AlertCircle size={30} color={dark.coral} />}
              title="Impossible de charger les leçons"
              message="Une erreur est survenue. Réessayez dans quelques instants."
              action={
                <Bouncy scaleTo={0.97} onPress={() => loadChapters()}>
                  <View style={styles.retryBtn}>
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.retryText}>Réessayer</Text>
                  </View>
                </Bouncy>
              }
            />
          ) : null}

          {!loading && !error && chapters.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={30} color={ORANGE} />}
              title="Aucun chapitre disponible"
              message="Les chapitres publiés par votre auto-école apparaîtront ici."
              action={
                <Bouncy scaleTo={0.97} onPress={() => loadChapters()}>
                  <View style={styles.retryBtn}>
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.retryText}>Actualiser</Text>
                  </View>
                </Bouncy>
              }
            />
          ) : null}

          {!loading && !error
            ? chapters.map((chapter, index) => {
                const courseCount = chapter.courses.length
                return (
                  <FadeUp key={chapter.id} delay={80 + index * 40}>
                    <Bouncy
                      scaleTo={0.98}
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
                      <View
                        style={styles.card}
                        accessibilityRole="button"
                        accessibilityLabel={`${chapter.name}, ${courseCount} cours`}
                      >
                        <View style={styles.numBadge}>
                          <Text style={styles.cardNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle}>{chapter.name}</Text>
                          <Text style={styles.cardSubtitle}>
                            {courseCount} cours
                          </Text>
                        </View>
                        <ChevronRight size={22} color={ORANGE} />
                      </View>
                    </Bouncy>
                  </FadeUp>
                )
              })
            : null}

          {!loading && !error && chapters.length > 0 ? (
            <FadeUp delay={160}>
              <View style={styles.tipCard}>
                <View style={styles.tipIcon}>
                  <Lightbulb size={20} color={ORANGE} />
                </View>
                <View style={styles.tipCopy}>
                  <Text style={styles.tipTitle}>Conseil</Text>
                  <Text style={styles.tipText}>
                    Suivre les leçons dans l’ordre te permet de mieux comprendre chaque étape et de
                    progresser efficacement.
                  </Text>
                </View>
              </View>
            </FadeUp>
          ) : null}

          <LegalFooter />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroArt: {
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 32,
    lineHeight: 38,
    color: dark.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textMuted,
    textAlign: 'center',
    maxWidth: 340,
  },
  skeletonBlock: {
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  numBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE_SOFT,
    flexShrink: 0,
  },
  cardNumber: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 30,
    color: ORANGE,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: dark.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: ORANGE_SOFT,
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  tipCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  tipTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: ORANGE,
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textPrimary,
  },
  retryBtn: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: dark.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
  },
})
