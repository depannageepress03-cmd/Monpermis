import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronRight, Lock, LogOut, User, X } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { Bouncy } from '../components/Bouncy'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { InfiniteImageMarquee } from '../components/InfiniteImageMarquee'
import { CodeModuleIcon, DriveModuleIcon } from '../components/ModuleIcons'
import { ScreenLoader } from '../components/ScreenLoader'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { colors, dark, fonts } from '../theme'

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
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe().then(setSubscription).catch(() => setSubscription(null))
  }, [user])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  const handleLogout = async () => {
    setProfileOpen(false)
    await signOut()
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
  }

  if (loading || !user) return <ScreenLoader />

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const codeLocked = subscription?.accessCode === false
  const conduiteLocked = subscription?.accessConduite === false

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
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
            <Pressable
              style={({ pressed }) => [styles.profileBtn, pressed && styles.pressed]}
              onPress={() => setProfileOpen(true)}
              accessibilityLabel="Voir mon profil"
            >
              <User size={19} color={dark.textPrimary} />
            </Pressable>
          </View>

          {/* Hero greeting */}
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{greetingWord()}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {user.firstName}
            </Text>
            <Text style={styles.heroSubtitle}>
              Ton permis commence ici. Choisis ton parcours ci-dessous.
            </Text>
          </View>

          {/* Status strip */}
          <Pressable
            style={({ pressed }) => [styles.statusStrip, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Abonnement')}
          >
            <View
              style={[
                styles.statusDot,
                subscription?.hasActiveSubscription ? styles.statusDotActive : styles.statusDotOff,
              ]}
            />
            <Text style={styles.statusText} numberOfLines={1}>
              {subscription?.hasActiveSubscription
                ? subscription.subscription?.planName || 'Abonnement actif'
                : subscription?.pendingSubscription
                  ? 'Paiement en cours de validation'
                  : 'Aucun abonnement actif'}
            </Text>
            <Text style={styles.statusAction}>
              {subscription?.hasActiveSubscription ? 'Gérer' : 'Voir les offres'}
            </Text>
            <ChevronRight size={16} color={dark.textMuted} />
          </Pressable>

          {/* Showcase marquee */}
          <Text style={styles.sectionLabel}>Sur la route avec Monpermis</Text>
          <View style={styles.marqueeWrap}>
            <InfiniteImageMarquee compact />
          </View>

          {/* Path selector */}
          <Text style={[styles.sectionLabel, styles.pathSectionLabel]}>Choisis ton parcours</Text>

          <Bouncy
            scaleTo={0.97}
            onPress={() => navigation.navigate(codeLocked ? 'Abonnement' : 'CodeRoute')}
          >
            <View style={[styles.pathCard, codeLocked ? styles.pathCardLocked : styles.pathCardGreen]}>
              <View style={[styles.pathIcon, !codeLocked && styles.pathIconGreen]}>
                {codeLocked ? <Lock size={24} color={dark.textMuted} /> : <CodeModuleIcon size={30} />}
              </View>
              <View style={styles.pathCopy}>
                <Text style={styles.pathTitle}>Code de la route</Text>
                <Text style={styles.pathDesc}>
                  {codeLocked ? 'Abonnement requis' : 'Cours, QCM et examens blancs'}
                </Text>
              </View>
              <ChevronRight size={20} color={codeLocked ? dark.textMuted : dark.green} />
            </View>
          </Bouncy>

          <Bouncy
            scaleTo={0.97}
            style={styles.secondPath}
            onPress={() => navigation.navigate(conduiteLocked ? 'Abonnement' : 'Conduite')}
          >
            <View style={[styles.pathCard, conduiteLocked ? styles.pathCardLocked : styles.pathCardCoral]}>
              <View style={[styles.pathIcon, !conduiteLocked && styles.pathIconCoral]}>
                {conduiteLocked ? <Lock size={24} color={dark.textMuted} /> : <DriveModuleIcon size={30} />}
              </View>
              <View style={styles.pathCopy}>
                <Text style={styles.pathTitle}>Conduite</Text>
                <Text style={styles.pathDesc}>
                  {conduiteLocked ? 'Abonnement requis' : 'Leçons et réservations moniteur'}
                </Text>
              </View>
              <ChevronRight size={20} color={conduiteLocked ? dark.textMuted : dark.coral} />
            </View>
          </Bouncy>

          <View style={styles.bottomAnim}>
            <HomeBottomAnimation compact />
          </View>
        </ScrollView>
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
                <Text style={styles.modalRowLabel}>E-mail</Text>
                <Text style={styles.modalRowValue}>{user.email || '—'}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Téléphone</Text>
                <Text style={styles.modalRowValue}>{user.phone || '—'}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Compte</Text>
                <Text style={styles.modalRowValue}>
                  {user.authProvider === 'google' ? 'Google' : 'E-mail / mot de passe'}
                </Text>
              </View>
            </View>

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
    backgroundColor: dark.bg,
  },
  safe: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 20,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 22,
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

  /* Hero */
  hero: {
    marginBottom: 18,
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
    fontSize: 34,
    lineHeight: 40,
    color: dark.textPrimary,
    letterSpacing: -0.6,
    textTransform: 'capitalize',
  },
  heroSubtitle: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: dark.textMuted,
    maxWidth: 320,
  },

  /* Status strip */
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: 24,
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
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: dark.textMuted,
    marginBottom: 10,
  },
  pathSectionLabel: {
    marginTop: 22,
  },

  marqueeWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },

  /* Path cards */
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  pathCardGreen: {
    backgroundColor: dark.surface,
    borderColor: 'rgba(34,214,115,0.28)',
  },
  pathCardCoral: {
    backgroundColor: dark.surface,
    borderColor: 'rgba(255,107,74,0.28)',
  },
  pathCardLocked: {
    backgroundColor: dark.surface,
    borderColor: dark.border,
    opacity: 0.6,
  },
  secondPath: {
    marginTop: 12,
  },
  pathIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    flexShrink: 0,
  },
  pathIconGreen: {
    backgroundColor: dark.greenSoft,
  },
  pathIconCoral: {
    backgroundColor: dark.coralSoft,
  },
  pathCopy: {
    flex: 1,
    minWidth: 0,
  },
  pathTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 3,
  },
  pathDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },

  bottomAnim: {
    marginTop: 22,
    borderRadius: 18,
    overflow: 'hidden',
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
