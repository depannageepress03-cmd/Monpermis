import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen } from 'lucide-react-native'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ContentError, fetchRevisionCourses } from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { EmptyState } from '../../components/EmptyState'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeCours'>

const STANDALONE_CHAPTER = 'standalone'

type StandaloneCourse = Awaited<ReturnType<typeof fetchRevisionCourses>>[number]

export function CodeCoursesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [courses, setCourses] = useState<StandaloneCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent && !hasDataRef.current) setLoading(true)
    setError(null)
    try {
      const data = await fetchRevisionCourses()
      setCourses(data)
      if (data.length > 0) hasDataRef.current = true
    } catch (err) {
      if (!hasDataRef.current) {
        setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  const openCourse = (course: StandaloneCourse) => {
    navigation.navigate('CourseDetail', {
      chapterId: STANDALONE_CHAPTER,
      chapterName: 'Cours',
      course: {
        id: course.id,
        title: course.title,
        modules: course.modules,
      },
      courses: courses.map((item) => ({
        id: item.id,
        title: item.title,
        modules: item.modules,
      })),
    })
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title="Cours"
        icon={BookOpen}
        onBack={() => navigation.navigate('CodeRoute')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load(true)
            }}
            tintColor={dark.green}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heroEyebrow}>Code de la route</Text>
          <Text style={styles.heroTitle}>Cours</Text>
          <Text style={styles.subtitle}>
            Choisis un cours pour accéder à ses modules. Les cours ne sont plus liés aux chapitres.
          </Text>
        </View>

        {loading ? <SkeletonList count={4} /> : null}

        {error && courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={30} color={dark.textMuted} />}
            title="Chargement impossible"
            message={error}
          />
        ) : null}

        {!loading && !error && courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={30} color={dark.textMuted} />}
            title="Aucun cours publié"
            message="Les cours publiés par l’administration apparaîtront ici."
          />
        ) : null}

        {courses.map((course, index) => (
          <Pressable
            key={course.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => openCourse(course)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.cardNumber}>{index + 1}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{course.title}</Text>
              <Text style={styles.cardSubtitle}>
                {course.modules.length} module{course.modules.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 22,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    maxWidth: 340,
  },
  card: {
    borderRadius: 18,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(31,168,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.green,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
})
