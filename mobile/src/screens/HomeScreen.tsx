import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  BookOpen,
  ChevronRight,
  Lock,
  User,
  Video,
} from 'lucide-react-native'
import { supportWhatsAppUrl } from '../utils/support'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { AccountSheet } from '../components/AccountSheet'
import { Bouncy } from '../components/Bouncy'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { HomeHeroDecor } from '../components/HomeHeroDecor'
import { InfiniteImageMarquee } from '../components/InfiniteImageMarquee'
import { HomeSkeleton } from '../components/Skeleton'
import { ScreenLoader } from '../components/ScreenLoader'
import { useAuth } from '../context/AuthContext'
import { useOffline } from '../context/OfflineContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, radii, shadows } from '../theme'
import { cacheGetThenFetch, cacheSet } from '../utils/contentCache'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>

function greetingWord() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const { signOut } = useAuth()
  const { isOffline } = useOffline()
  const { user, loading } = useRequireAuth(navigation)
  const [profileOpen, setProfileOpen] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
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
          onData: (data) => {
            setAccessMe(data)
            setBootstrapping(false)
          },
        },
      ).catch(() => setAccessMe(null))
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
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
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
      }
      return () => setStatusBarStyle('dark')
    }, [user]),
  )

  const handleLogout = async () => {
    setProfileOpen(false)
    await signOut()
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
  }

  const codeLocked = accessMe ? !accessMe.access.code : false
  const conduiteLocked = accessMe
    ? !(accessMe.access.conduite_videos || accessMe.access.conduite_heures || accessMe.user.soldeHeures > 0)
    : false

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {bootstrapping && !accessMe ? <HomeSkeleton /> : null}

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={styles.topBar}>
              <View style={styles.topBarLeft}>
                <View style={styles.logoBadge}>
                  <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <BrandName size={17} mainColor={dark.textPrimary} />
              </View>
              <View style={styles.topBarActions}>
                <Pressable
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('Notifications')}
                  accessibilityLabel="Mes notifications"
                >
                  <Bell size={19} color={dark.textPrimary} />
                  {unreadCount > 0 ? (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  onPress={() => setProfileOpen(true)}
                  accessibilityLabel="Voir mon profil"
                >
                  <User size={19} color={dark.textPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>{greetingWord()},</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {user.firstName}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>
                  Code, conduite, ta route vers le permis.
                </Text>
              </View>
              <HomeHeroDecor />
            </View>

            {!String(user.phone || '').trim() ? (
              <Pressable
                style={({ pressed }) => [styles.phoneStrip, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.phoneStripText} numberOfLines={1}>
                  Numéro manquant — ajoute ton téléphone
                </Text>
                <Text style={styles.phoneStripAction}>Compléter</Text>
                <ChevronRight size={16} color={dark.textMuted} />
              </Pressable>
            ) : null}

            <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
              Sur la route avec Monpermis
            </Text>
            <InfiniteImageMarquee caption="Apprends, révise et réussis ton permis" />

            <View style={styles.pathsBlock}>
              <Text style={styles.sectionLabel}>Choisis ton parcours</Text>

              <View
                style={[
                  styles.pathCard,
                  codeLocked ? styles.pathCardLocked : styles.pathCardGreen,
                ]}
              >
                <Bouncy scaleTo={0.98} onPress={() => navigation.navigate('CodeRoute')}>
                  <View style={styles.pathTop}>
                    <View style={styles.pathThumbWrap}>
                      <Image
                        source={require('../../assets/home/paths/code.jpg')}
                        style={styles.pathImage}
                        resizeMode="cover"
                      />
                      <View style={[styles.pathBadge, styles.pathBadgeGreen]}>
                        <BookOpen size={12} color="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.pathCopy}>
                      <Text style={styles.pathTitle}>Code de la route</Text>
                      {codeLocked ? (
                        <View style={styles.pathDescRow}>
                          <Lock size={12} color={dark.textMuted} />
                          <Text style={styles.pathDesc}>Accès requis</Text>
                        </View>
                      ) : (
                        <Text style={styles.pathDesc}>Cours, quiz & examens</Text>
                      )}
                    </View>
                    <View style={[styles.pathArrow, styles.pathArrowGreen]}>
                      <ChevronRight size={18} color={dark.green} />
                    </View>
                  </View>
                </Bouncy>
              </View>

              <View
                style={[
                  styles.pathCard,
                  styles.secondPath,
                  conduiteLocked ? styles.pathCardLocked : styles.pathCardCoral,
                ]}
              >
                <Bouncy scaleTo={0.98} onPress={() => navigation.navigate('Conduite')}>
                  <View style={styles.pathTop}>
                    <View style={styles.pathThumbWrap}>
                      <Image
                        source={require('../../assets/home/paths/conduite.jpg')}
                        style={styles.pathImage}
                        resizeMode="cover"
                      />
                      <View style={[styles.pathBadge, styles.pathBadgeCoral]}>
                        <Video size={12} color="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.pathCopy}>
                      <Text style={styles.pathTitle}>Conduite</Text>
                      {conduiteLocked ? (
                        <View style={styles.pathDescRow}>
                          <Lock size={12} color={dark.textMuted} />
                          <Text style={styles.pathDesc}>Accès requis</Text>
                        </View>
                      ) : (
                        <Text style={styles.pathDesc}>Leçons vidéo & réservations</Text>
                      )}
                    </View>
                    <View style={[styles.pathArrow, styles.pathArrowCoral]}>
                      <ChevronRight size={18} color={dark.coral} />
                    </View>
                  </View>
                </Bouncy>
              </View>
            </View>

            <View style={styles.bottomAnim}>
              <HomeBottomAnimation compact />
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

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
    backgroundColor: '#F4F7FB',
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    ...shadows.sm,
  },
  logo: {
    width: 22,
    height: 22,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.green,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 34,
    lineHeight: 38,
    color: dark.textPrimary,
    letterSpacing: -0.8,
    textTransform: 'capitalize',
  },
  heroSubtitle: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: dark.textMuted,
    maxWidth: 240,
  },

  phoneStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    marginBottom: 12,
  },
  phoneStripText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: dark.textPrimary,
  },
  phoneStripAction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
  },

  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: dark.textMuted,
    marginBottom: 10,
  },
  sectionSpaced: {
    marginTop: 18,
  },
  pathsBlock: {
    marginTop: 18,
  },
  bottomAnim: {
    marginTop: 16,
    borderRadius: radii.md,
    overflow: 'hidden',
  },

  pathCard: {
    borderRadius: radii.xl,
    padding: 14,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  pathCardGreen: {
    borderColor: 'rgba(0,176,80,0.18)',
  },
  pathCardCoral: {
    borderColor: 'rgba(232,93,59,0.16)',
  },
  pathCardLocked: {
    borderColor: dark.border,
    opacity: 0.72,
  },
  secondPath: {
    marginTop: 12,
  },
  pathTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pathThumbWrap: {
    width: 58,
    height: 58,
  },
  pathImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  pathBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pathBadgeGreen: {
    backgroundColor: dark.green,
  },
  pathBadgeCoral: {
    backgroundColor: dark.coral,
  },
  pathCopy: {
    flex: 1,
    minWidth: 0,
  },
  pathTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 2,
  },
  pathDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: dark.textMuted,
  },
  pathDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pathArrow: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathArrowGreen: {
    backgroundColor: dark.greenSoft,
  },
  pathArrowCoral: {
    backgroundColor: dark.coralSoft,
  },
  pressed: {
    opacity: 0.88,
  },
})
