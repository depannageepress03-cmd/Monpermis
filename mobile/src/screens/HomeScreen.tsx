import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { Bell, BookOpen as BookOpenIcon, CalendarClock as CalendarClockIcon, Flag as FlagIcon, Menu, TrendingUp } from 'lucide-react-native'
import { supportWhatsAppUrl } from '../utils/support'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { fetchDrivingDashboard, type ReservationItem } from '../api/reservations'
import { fetchLearnerJourney, fetchPracticeExams, type LearnerJourney, type PracticeExamScore } from '../api/revision'
import { AccountSheet } from '../components/AccountSheet'
import { HomeSkeleton } from '../components/Skeleton'
import { ScreenLoader } from '../components/ScreenLoader'
import { useAuth } from '../context/AuthContext'
import { useOffline } from '../context/OfflineContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/tokens'
import { cacheGetThenFetch, cacheSet } from '../utils/contentCache'
import { Chip, IconButton, LogoTile } from '../components/ui-kit-core'
import { GlassAction, HeroCard, NotchedCard, RouteMotif, ScoreBars } from '../components/ui-kit-cards'
import { MainTabBar } from '../components/ui-kit-nav'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>

function greetingWord() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatReservationDate(iso: string) {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}-${month}-${year}`
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const { signOut } = useAuth()
  const { isOffline } = useOffline()
  const { user, loading } = useRequireAuth(navigation)
  const [profileOpen, setProfileOpen] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [examScores, setExamScores] = useState<PracticeExamScore[]>([])
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  const [bootstrapping, setBootstrapping] = useState(true)
  const unreadCount = useUnreadNotifications(Boolean(user))
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(12)).current

  const loadHome = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setBootstrapping(true)
    try {
      await cacheGetThenFetch(
        `access:me:${user.id}`,
        () => fetchAccessMe(),
        {
          maxAgeMs: isOffline ? 24 * 60 * 60 * 1000 : 0,
          onData: (data) => setAccessMe(data),
        },
      ).catch(() => setAccessMe(null))
      await Promise.all([
        fetchLearnerJourney().then(setJourney).catch(() => setJourney(null)),
        fetchPracticeExams().then((data) => setExamScores(data.scores ?? [])).catch(() => setExamScores([])),
        fetchDrivingDashboard().then((data) => setUpcoming(data.upcoming ?? [])).catch(() => setUpcoming([])),
      ])
    } finally {
      setBootstrapping(false)
    }
  }, [user, isOffline])

  useEffect(() => {
    void loadHome()
  }, [loadHome])

  useEffect(() => {
    fade.setValue(0)
    slide.setValue(12)
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [fade, slide])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) {
        void fetchAccessMe()
          .then(async (data) => {
            setAccessMe(data)
            await cacheSet(`access:me:${user.id}`, data)
          })
          .catch(() => {})
        void loadHome(true)
      }
      return () => setStatusBarStyle('dark')
    }, [user, loadHome]),
  )

  const handleLogout = async () => {
    setProfileOpen(false)
    await signOut()
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
  }

  if (loading || !user) return <ScreenLoader />

  const displayName = user.firstName?.trim() || 'apprenant'
  const code = journey?.code
  const codeTotal = code?.chaptersTotal ?? 0
  const codeDone = code?.chaptersDone ?? 0
  const codeRatio = codeTotal > 0 ? codeDone / codeTotal : 0
  const lastExam = examScores[examScores.length - 1]
  const previousExam = examScores[examScores.length - 2]
  const trendDelta = lastExam && previousExam ? lastExam.correct - previousExam.correct : null
  const nextLesson = upcoming[0]
  const soldeHeures = accessMe?.user.soldeHeures ?? 0

  const recentScores = examScores.slice(-6)
  const scoreBarsData = Array.from({ length: 6 }, (_, index) => {
    const score = recentScores[index - (6 - recentScores.length)]
    const value = score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0
    return {
      label: `S${index + 1}`,
      value,
      color: (index < 3 ? 'old' : index < 5 ? 'recent' : 'latest') as 'old' | 'recent' | 'latest',
    }
  })

  return (
    <View style={styles.root}>
      <View style={styles.halo} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {bootstrapping && !accessMe ? <HomeSkeleton /> : null}

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={styles.topBar}>
              <LogoTile />
              <View style={styles.greeting}>
                <Text style={styles.hello}>Bonjour,</Text>
                <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              </View>
              <IconButton
                variant="bell"
                badge={unreadCount}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityLabel={unreadCount > 0 ? `${unreadCount} notifications non lues` : 'Notifications'}
              >
                <Bell size={20} color={colors.navy} strokeWidth={2} />
              </IconButton>
              <IconButton onPress={() => setProfileOpen(true)} accessibilityLabel="Voir mon profil">
                <Menu size={20} color={colors.navy} strokeWidth={2} />
              </IconButton>
            </View>

            <HeroCard>
              <RouteMotif />
              <Text style={styles.heroEyebrow}>Ta préparation au code</Text>
              <View style={styles.heroNumberRow}>
                <Text style={styles.heroNumber}>
                  {codeTotal > 0 ? Math.round(codeRatio * 100) : 0}
                  <Text style={styles.heroPct}>%</Text>
                </Text>
                <Text style={styles.heroNote}>
                  {lastExam ? `Dernier examen blanc · ${lastExam.correct}/${lastExam.total}` : "prête pour l'examen"}
                </Text>
              </View>
              <View style={styles.chipRow}>
                {trendDelta != null && trendDelta !== 0 ? (
                  <Chip variant="glass" small>
                    <View style={styles.trendChip}>
                      <TrendingUp size={14} color={colors.greenGlow} strokeWidth={2.4} />
                      <Text style={styles.glassChipText}>{trendDelta > 0 ? `+${trendDelta}` : trendDelta} pts</Text>
                    </View>
                  </Chip>
                ) : null}
                <Chip variant="glass" small>
                  <Text style={styles.glassChipText}>
                    {codeTotal > 0 ? `${codeDone}/${codeTotal} chapitres` : 'Commence ton premier chapitre'}
                  </Text>
                </Chip>
              </View>
              <View style={styles.actionsGrid}>
                <GlassAction
                  icon={<BookOpenIcon size={22} color="#FFFFFF" strokeWidth={1.9} />}
                  label="Réviser"
                  onPress={() => navigation.navigate('RevisionChapitres')}
                />
                <GlassAction
                  icon={<FlagIcon size={22} color="#FFFFFF" strokeWidth={1.9} />}
                  label="Examen blanc"
                  onPress={() => navigation.navigate('ExamensTest')}
                />
                <GlassAction
                  accent
                  icon={<CalendarClockIcon size={22} color={colors.navy} strokeWidth={2} />}
                  label="Réserver"
                  onPress={() => navigation.navigate('ReservationFlow', {})}
                />
              </View>
            </HeroCard>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Prochaine leçon</Text>
              <Text style={styles.seeAll} onPress={() => navigation.navigate('MesReservations')}>
                Tout voir
              </Text>
            </View>

            <NotchedCard
              tabLabel="Conduite"
              tabColor={colors.navy}
              tabIcon={<View style={styles.tabDot} />}
              time={nextLesson?.creneau ? nextLesson.creneau.startTime : undefined}
              date={nextLesson?.creneau ? formatReservationDate(nextLesson.creneau.date) : undefined}
            >
              {nextLesson ? (
                <>
                  <View style={styles.lessonRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initialsOf(nextLesson.moniteur?.fullName || 'Moniteur')}</Text>
                    </View>
                    <View style={styles.lessonCopy}>
                      <Text style={styles.lessonTitle}>
                        {nextLesson.creneau
                          ? `${formatReservationDate(nextLesson.creneau.date)} · ${nextLesson.creneau.startTime}`
                          : 'Séance programmée'}
                      </Text>
                      <Text style={styles.lessonSub}>avec {nextLesson.moniteur?.fullName || 'ton moniteur'}</Text>
                    </View>
                  </View>
                  <View style={styles.chipRow}>
                    <Chip variant="green" small>
                      <Text style={styles.greenChipText}>
                        {nextLesson.paymentStatus === 'paid' || nextLesson.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                      </Text>
                    </Chip>
                    <Chip variant="glass" small>
                      <Text style={styles.glassChipText}>Solde : {soldeHeures} h restantes</Text>
                    </Chip>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.lessonRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>MP</Text>
                    </View>
                    <View style={styles.lessonCopy}>
                      <Text style={styles.lessonTitle}>Réserve ta prochaine leçon</Text>
                      <Text style={styles.lessonSub}>Choisis ton moniteur et ton créneau</Text>
                    </View>
                  </View>
                  <View style={styles.chipRow}>
                    <Chip variant="green" small>
                      <Text style={styles.greenChipText}>Solde : {soldeHeures} h restantes</Text>
                    </Chip>
                  </View>
                </>
              )}
            </NotchedCard>

            <ScoreBars scores={scoreBarsData} />
            <View style={{ height: 120 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <MainTabBar activeId="accueil" />

      <AccountSheet
        visible={profileOpen}
        user={user}
        greeting={greetingWord()}
        onClose={() => setProfileOpen(false)}
        onLogout={() => void handleLogout()}
        onOpenAbonnement={() => {
          setProfileOpen(false)
          navigation.navigate('Abonnement')
        }}
        onOpenPayments={() => {
          setProfileOpen(false)
          navigation.navigate('HistoriquePaiements')
        }}
        onOpenSupport={() => {
          setProfileOpen(false)
          void Linking.openURL(supportWhatsAppUrl('Bonjour Monpermis, j’ai besoin d’aide.'))
        }}
        onOpenProfile={() => {
          setProfileOpen(false)
          navigation.navigate('Profile')
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  halo: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.green,
    opacity: 0.1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 0,
    gap: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    flex: 1,
    gap: 1,
  },
  hello: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  heroEyebrow: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.78)',
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  heroNumber: {
    fontFamily: 'Sora_700Bold',
    fontSize: 58,
    lineHeight: 55,
    letterSpacing: -2.32,
    color: '#FFFFFF',
  },
  heroPct: {
    color: 'rgba(255,255,255,0.45)',
  },
  heroNote: {
    paddingBottom: 6,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glassChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  greenChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.greenDark,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.navy,
  },
  seeAll: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.greenDark,
    textDecorationLine: 'underline',
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 15,
    color: colors.navy,
  },
  lessonCopy: {
    flex: 1,
  },
  lessonTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  lessonSub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
})
