import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Lock, LogOut, User, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { InfiniteImageMarquee } from '../components/InfiniteImageMarquee'
import { CodeModuleIcon, DriveModuleIcon } from '../components/ModuleIcons'
import { ScreenLoader } from '../components/ScreenLoader'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { brand, colors } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>

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

  const handleLogout = async () => {
    setProfileOpen(false)
    await signOut()
    navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
  }

  if (loading || !user) return <ScreenLoader />

  const fullName = `${user.firstName} ${user.lastName}`.trim()

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <View style={styles.brandBar}>
            <View style={styles.brandLeft}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <BrandName size={20} />
            </View>
            <Pressable
              style={({ pressed }) => [styles.profileBtn, pressed && styles.pressed]}
              onPress={() => setProfileOpen(true)}
              accessibilityLabel="Voir mon profil"
            >
              <User size={20} color={brand.navy} />
            </Pressable>
          </View>

          <InfiniteImageMarquee compact />

          <Text style={styles.guideLine} numberOfLines={2}>
            <Text style={styles.guideName}>{user.firstName}</Text>
            {', ton permis t’attend.'}
          </Text>

          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionCopy}>
              <Text style={styles.subscriptionTitle} numberOfLines={1}>
                {subscription?.hasActiveSubscription
                  ? subscription.subscription?.planName || 'Abonnement actif'
                  : subscription?.pendingSubscription
                    ? 'Paiement en validation'
                    : 'Accès verrouillé'}
              </Text>
              <Text style={styles.subscriptionDetail} numberOfLines={1}>
                {subscription?.hasActiveSubscription
                  ? 'Parcours accessibles'
                  : subscription?.pendingSubscription
                    ? 'En attente de validation admin'
                    : 'Souscrivez pour débloquer'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.subscriptionButton,
                subscription?.hasActiveSubscription && styles.subscriptionButtonOutline,
                pressed && styles.pressed,
              ]}
              onPress={() => navigation.navigate('Abonnement')}
            >
              <Text
                style={[
                  styles.subscriptionButtonText,
                  subscription?.hasActiveSubscription && styles.subscriptionButtonOutlineText,
                ]}
              >
                {subscription?.hasActiveSubscription ? 'Renouveler' : 'Voir les offres'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modulesCenter}>
            <Text style={styles.bridgeText}>
              Commencez par le code pour maîtriser les règles de circulation, les panneaux et les
              priorités. Une fois vos bases solides, passez à la conduite pour vous entraîner sur la
              route avec un moniteur.
            </Text>

            <View style={styles.cards}>
              <Pressable
                style={({ pressed }) => [
                  styles.pathCard,
                  styles.pathCode,
                  subscription?.accessCode === false && styles.pathLocked,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  navigation.navigate(
                    subscription?.accessCode === false ? 'Abonnement' : 'CodeRoute',
                  )
                }
              >
                <View style={[styles.pathIcon, styles.pathIconCode]}>
                  {subscription?.accessCode === false ? (
                    <Lock size={28} color={brand.navyMuted} />
                  ) : (
                    <CodeModuleIcon size={36} />
                  )}
                </View>
                <Text style={styles.pathTitle}>Code</Text>
                <Text style={styles.pathDesc}>
                  {subscription?.accessCode === false ? 'Abonnement requis' : 'Cours & QCM'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pathCard,
                  styles.pathDrive,
                  subscription?.accessConduite === false && styles.pathLocked,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  navigation.navigate(
                    subscription?.accessConduite === false ? 'Abonnement' : 'Conduite',
                  )
                }
              >
                <View style={[styles.pathIcon, styles.pathIconDrive]}>
                  {subscription?.accessConduite === false ? (
                    <Lock size={28} color={brand.navyMuted} />
                  ) : (
                    <DriveModuleIcon size={36} />
                  )}
                </View>
                <Text style={styles.pathTitle}>Conduite</Text>
                <Text style={styles.pathDesc}>
                  {subscription?.accessConduite === false ? 'Abonnement requis' : 'Leçons'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomAnim}>
            <HomeBottomAnimation compact />
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
                <User size={28} color={brand.green} />
              </View>
              <Pressable
                style={styles.modalClose}
                onPress={() => setProfileOpen(false)}
                accessibilityLabel="Fermer"
              >
                <X size={18} color={brand.navyMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalTitle}>Mon identité</Text>
            <Text style={styles.modalName}>{fullName}</Text>

            <View style={styles.modalRows}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>E-mail</Text>
                <Text style={styles.modalValue}>{user.email || '—'}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Téléphone</Text>
                <Text style={styles.modalValue}>{user.phone || '—'}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Compte</Text>
                <Text style={styles.modalValue}>
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
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    overflow: 'hidden',
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  logo: {
    width: 40,
    height: 40,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenLight,
    borderWidth: 1,
    borderColor: `${brand.green}35`,
  },
  guideLine: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 18,
    lineHeight: 24,
    color: brand.navyMuted,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: 'System',
    }),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  guideName: {
    color: brand.navy,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: `${brand.navy}14`,
  },
  subscriptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  subscriptionTitle: {
    color: brand.navy,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  subscriptionDetail: {
    color: brand.navyMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  subscriptionButton: {
    backgroundColor: brand.green,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  subscriptionButtonOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: `${brand.green}70`,
  },
  subscriptionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  subscriptionButtonOutlineText: {
    color: brand.green,
  },
  modulesCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    minHeight: 0,
    paddingBottom: 24,
  },
  bridgeText: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 6,
    fontSize: 16,
    lineHeight: 23,
    color: brand.navyMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  cards: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: 10,
  },
  pathCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  pathCode: {
    backgroundColor: brand.greenLight,
    borderColor: `${brand.green}28`,
  },
  pathDrive: {
    backgroundColor: brand.goldLight,
    borderColor: `${brand.gold}55`,
  },
  pathLocked: {
    opacity: 0.58,
  },
  pathIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pathIconCode: {
    borderWidth: 1,
    borderColor: `${brand.green}30`,
  },
  pathIconDrive: {
    borderWidth: 1,
    borderColor: `${brand.gold}60`,
  },
  pathTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.navy,
    marginBottom: 2,
    textAlign: 'center',
  },
  pathDesc: {
    fontSize: 11,
    lineHeight: 14,
    color: brand.navyMuted,
    textAlign: 'center',
  },
  bottomAnim: {
    marginTop: 10,
  },
  pressed: {
    opacity: 0.88,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 16, 48, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: `${brand.navy}10`,
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
    backgroundColor: brand.greenLight,
    borderWidth: 1,
    borderColor: `${brand.green}30`,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${brand.navy}08`,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: brand.navyMuted,
    marginBottom: 6,
  },
  modalName: {
    fontSize: 22,
    fontWeight: '800',
    color: brand.navy,
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  modalRows: {
    gap: 12,
    marginBottom: 20,
  },
  modalRow: {
    borderTopWidth: 1,
    borderTopColor: `${brand.navy}10`,
    paddingTop: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brand.navyMuted,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.navy,
  },
  modalLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.navy,
    borderRadius: 14,
    paddingVertical: 14,
  },
  modalLogoutText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
})
