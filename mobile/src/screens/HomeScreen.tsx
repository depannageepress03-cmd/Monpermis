import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  ChevronRight,
  CreditCard,
  History,
  Lock,
  LogOut,
  MessageCircle,
  Settings,
  User,
  X,
} from 'lucide-react-native'
import { supportWhatsAppUrl } from '../utils/support'
import { useCallback, useEffect, useState } from 'react'
import {
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { Bouncy } from '../components/Bouncy'
import { BrandName } from '../components/BrandName'
import { InfiniteImageMarquee } from '../components/InfiniteImageMarquee'
import { HomeSkeleton } from '../components/Skeleton'
import { ScreenLoader } from '../components/ScreenLoader'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../navigation/types'
import { getActiveSubscriptions } from '../utils/subscriptionSummary'
import { colors, dark, fonts } from '../theme'
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
  const { user, loading } = useRequireAuth(navigation)
  const [profileOpen, setProfileOpen] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const unreadCount = useUnreadNotifications(Boolean(user))

  const loadHome = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setBootstrapping(true)
    try {
      // Accès : toujours revalider (coupure d’abonnement) — cache seulement pour affichage immédiat.
      await cacheGetThenFetch(
        `access:me:${user.id}`,
        () => fetchAccessMe(),
        {
          maxAgeMs: 0,
          onData: (data) => {
            setAccessMe(data)
            setBootstrapping(false)
          },
        },
      ).catch(() => setAccessMe(null))
    } finally {
      setBootstrapping(false)
    }
  }, [user])

  useEffect(() => {
    void loadHome()
  }, [loadHome])

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

  if (loading || !user) return <ScreenLoader />

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const codeLocked = accessMe ? !accessMe.access.code : false
  const conduiteLocked = accessMe
    ? !(accessMe.access.conduite_videos || accessMe.access.conduite_heures || accessMe.user.soldeHeures > 0)
    : false
  const hasActiveAccess =
    Boolean(accessMe) &&
    (Object.values(accessMe!.access).some(Boolean) || accessMe!.user.soldeHeures > 0)
  const activeSubscriptions = getActiveSubscriptions(accessMe)
  const nearestSub = activeSubscriptions[0]
  const pendingRequest = accessMe?.pendingRequest

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          {bootstrapping && !accessMe ? <HomeSkeleton /> : null}
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
                style={({ pressed }) => [styles.profileBtn, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityLabel="Mes notifications"
              >
                <Bell size={19} color={dark.textPrimary} />
                {unreadCount > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.profileBtn, pressed && styles.pressed]}
                onPress={() => setProfileOpen(true)}
                accessibilityLabel="Voir mon profil"
              >
                <User size={19} color={dark.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{greetingWord()}</Text>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {user.firstName}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              Code, conduite — ta route vers le permis.
            </Text>
          </View>

          {!String(user.phone || '').trim() ? (
            <Pressable
              style={({ pressed }) => [styles.statusStrip, styles.phoneStrip, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.statusText} numberOfLines={1}>
                Numéro manquant — ajoute ton téléphone
              </Text>
              <Text style={styles.statusAction}>Compléter</Text>
              <ChevronRight size={16} color={dark.textMuted} />
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.statusStrip, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Abonnement')}
          >
            <View
              style={[
                styles.statusDot,
                hasActiveAccess ? styles.statusDotActive : styles.statusDotOff,
              ]}
            />
            <Text style={styles.statusText} numberOfLines={1}>
              {hasActiveAccess
                ? nearestSub
                  ? `${nearestSub.label} · ${nearestSub.daysLeft} j restants`
                  : 'Accès actifs'
                : pendingRequest
                  ? 'Paiement en cours de validation'
                  : 'Aucun accès actif'}
            </Text>
            <Text style={styles.statusAction}>
              {hasActiveAccess
                ? nearestSub && nearestSub.daysLeft <= 7
                  ? 'Renouveler'
                  : 'Gérer'
                : 'Voir les offres'}
            </Text>
            <ChevronRight size={16} color={dark.textMuted} />
          </Pressable>

          {/* Abonnement reste au-dessus des images */}
          <Bouncy scaleTo={0.97} onPress={() => navigation.navigate('Abonnement')}>
            <View style={[styles.pathCard, styles.pathCardAccess]}>
              <View style={styles.pathCopy}>
                <Text style={[styles.pathTitle, styles.pathTitleOnDark]}>Abonnement</Text>
                <Text style={[styles.pathDesc, styles.pathDescOnDark]}>
                  {hasActiveAccess ? 'Gérer mes accès' : 'Débloquer les parcours'}
                </Text>
              </View>
              <ChevronRight size={20} color="#FFC000" />
            </View>
          </Bouncy>

          <Text style={[styles.sectionLabel, styles.marqueeLabel]}>Sur la route avec Monpermis</Text>
          <View style={styles.marqueeWrap}>
            <InfiniteImageMarquee compact />
          </View>

          <View style={styles.pathsBlock}>
            <Text style={styles.sectionLabel}>Choisis ton parcours</Text>

            <Bouncy scaleTo={0.97} onPress={() => navigation.navigate('CodeRoute')}>
              <View style={[styles.pathCard, codeLocked ? styles.pathCardLocked : styles.pathCardGreen]}>
                <Image
                  source={require('../../assets/home/paths/code.jpg')}
                  style={[styles.pathImage, styles.pathImageGreen]}
                  resizeMode="cover"
                />
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
                <ChevronRight size={20} color={codeLocked ? dark.textMuted : dark.green} />
              </View>
            </Bouncy>

            <Bouncy
              scaleTo={0.97}
              style={styles.secondPath}
              onPress={() => navigation.navigate('Conduite')}
            >
              <View
                style={[styles.pathCard, conduiteLocked ? styles.pathCardLocked : styles.pathCardCoral]}
              >
                <Image
                  source={require('../../assets/home/paths/conduite.jpg')}
                  style={[styles.pathImage, styles.pathImageCoral]}
                  resizeMode="cover"
                />
                <View style={styles.pathCopy}>
                  <Text style={styles.pathTitle}>Conduite</Text>
                  {conduiteLocked ? (
                    <View style={styles.pathDescRow}>
                      <Lock size={12} color={dark.textMuted} />
                      <Text style={styles.pathDesc}>Accès requis</Text>
                    </View>
                  ) : (
                    <Text style={styles.pathDesc}>Leçons & réservations</Text>
                  )}
                </View>
                <ChevronRight size={20} color={conduiteLocked ? dark.textMuted : dark.coral} />
              </View>
            </Bouncy>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                <User size={28} color={dark.green} />
              </View>
              <Pressable
                style={styles.modalClose}
                onPress={() => setProfileOpen(false)}
                accessibilityLabel="Fermer"
              >
                <X size={18} color={dark.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Mon identité</Text>
            <Text style={styles.modalName}>{fullName}</Text>

            <View style={styles.modalRows}>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Téléphone</Text>
                <Text style={styles.modalRowValue}>{user.phone || '—'}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Compte</Text>
                <Text style={styles.modalRowValue}>Téléphone / mot de passe</Text>
              </View>
            </View>

            <View style={styles.modalShortcuts}>
              <Pressable
                style={({ pressed }) => [styles.modalShortcut, pressed && styles.pressed]}
                onPress={() => {
                  setProfileOpen(false)
                  navigation.navigate('Abonnement')
                }}
              >
                <CreditCard size={16} color={dark.textPrimary} />
                <Text style={styles.modalShortcutText}>Abonnement / Mes accès</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalShortcut, pressed && styles.pressed]}
                onPress={() => {
                  setProfileOpen(false)
                  navigation.navigate('HistoriquePaiements')
                }}
              >
                <History size={16} color={dark.textPrimary} />
                <Text style={styles.modalShortcutText}>Historique des paiements</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalShortcut, pressed && styles.pressed]}
                onPress={() => {
                  setProfileOpen(false)
                  void Linking.openURL(supportWhatsAppUrl('Bonjour Monpermis, j’ai besoin d’aide.'))
                }}
              >
                <MessageCircle size={16} color={dark.textPrimary} />
                <Text style={styles.modalShortcutText}>Support WhatsApp</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.modalEdit, pressed && styles.pressed]}
              onPress={() => {
                setProfileOpen(false)
                navigation.navigate('Profile')
              }}
            >
              <Settings size={16} color={dark.textPrimary} />
              <Text style={styles.modalEditText}>Modifier mon profil</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.modalLogout, pressed && styles.pressed]}
              onPress={handleLogout}
            >
              <LogOut size={16} color={colors.white} />
              <Text style={styles.modalLogoutText}>Se déconnecter</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
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
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    borderWidth: 1,
    borderColor: dark.border,
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: dark.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: dark.bg,
  },
  bellBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#0B0F1A',
  },

  /* Hero */
  hero: {
    marginBottom: 10,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 32,
    color: dark.textPrimary,
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  heroSubtitle: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 18,
    color: dark.textMuted,
    maxWidth: 320,
  },

  /* Status strip */
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: 10,
  },
  phoneStrip: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    marginBottom: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  statusDotActive: {
    backgroundColor: dark.green,
  },
  statusDotOff: {
    backgroundColor: '#3A4358',
  },
  statusText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: dark.textPrimary,
  },
  statusAction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
  },

  /* Section labels */
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: dark.textMuted,
    marginBottom: 8,
  },
  marqueeLabel: {
    marginTop: 12,
  },
  marqueeWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  pathsBlock: {
    marginTop: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  /* Path cards */
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  pathCardGreen: {
    backgroundColor: dark.surface,
    borderColor: 'rgba(34,214,115,0.28)',
  },
  pathCardCoral: {
    backgroundColor: dark.surface,
    borderColor: 'rgba(0,16,48,0.16)',
  },
  pathCardAccess: {
    backgroundColor: '#001030',
    borderColor: '#001030',
    minHeight: 64,
  },
  pathTitleOnDark: {
    color: '#FFFFFF',
  },
  pathDescOnDark: {
    color: 'rgba(255,255,255,0.78)',
  },
  pathCardLocked: {
    backgroundColor: dark.surface,
    borderColor: dark.border,
    opacity: 0.6,
  },
  secondPath: {
    marginTop: 10,
  },
  pathImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    flexShrink: 0,
  },
  pathImageGreen: {
    borderWidth: 2,
    borderColor: 'rgba(0,176,80,0.28)',
  },
  pathImageCoral: {
    borderWidth: 2,
    borderColor: 'rgba(232,93,59,0.28)',
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
  pressed: {
    opacity: 0.85,
  },

  /* Profile modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: dark.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: dark.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
  },
  modalLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: dark.textMuted,
    marginBottom: 6,
  },
  modalName: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: dark.textPrimary,
    marginBottom: 18,
  },
  modalRows: {
    gap: 12,
    marginBottom: 20,
  },
  modalRow: {
    borderTopWidth: 1,
    borderTopColor: dark.border,
    paddingTop: 12,
  },
  modalRowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
    marginBottom: 4,
  },
  modalRowValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  modalShortcuts: { gap: 8, marginBottom: 12 },
  modalShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modalShortcutText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: dark.textPrimary },
  modalEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  modalEditText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  modalLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 14,
  },
  modalLogoutText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0B0F1A',
  },
})
