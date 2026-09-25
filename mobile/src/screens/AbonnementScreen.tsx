import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  History,
  Lock,
  ShieldCheck,
  Ticket,
  TriangleAlert,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  AccessRequestError,
  computeModuleAmount,
  fetchAccessMe,
  fetchAccessModules,
  redeemPromoCode,
  type AccessMe,
  type AccessModule,
  type AccessModuleKey,
  type CheckoutCartItem,
} from '../api/accessRequests'
import { LegalFooter } from '../components/LegalFooter'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { ScreenLoader } from '../components/ScreenLoader'
import { SkeletonList } from '../components/Skeleton'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import {
  formatSubscriptionEndDate,
  getActiveSubscriptions,
} from '../utils/subscriptionSummary'
import { clearPendingCheckoutCart, loadPendingCheckoutCart, type PendingCheckoutCart } from '../utils/checkoutCart'
import { formatPrice } from '../utils/money'
import { colors } from '../theme/tokens'
import { LogoTile } from '../components/ui-kit-core'
import { NotchedCard, PlanCard } from '../components/ui-kit-cards'
import { MainTabBar } from '../components/ui-kit-nav'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Abonnement'>

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  day: ' / jour',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

/** Offres self-service sur cet écran (heures conduite = espace Conduite). */
const PRIMARY_KEYS: AccessModuleKey[] = ['code']

const INTRO_COPY =
  'Achète l’accès Code par Mobile Money (MTN, Moov, Celtiis). Les cours vidéo de conduite sont gratuits dans l’espace Conduite ; les heures moniteur s’achètent aussi là-bas.'

export function AbonnementScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)

  const [modules, setModules] = useState<AccessModule[]>([])
  const [me, setMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Partial<Record<AccessModuleKey, boolean>>>({})
  const [quantityByModule, setQuantityByModule] = useState<Record<string, string>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)
  const [pendingCart, setPendingCart] = useState<PendingCheckoutCart | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [moduleCatalog, meResult, savedCart] = await Promise.all([
        fetchAccessModules(),
        fetchAccessMe(),
        loadPendingCheckoutCart(),
      ])
      setModules(moduleCatalog.filter((m) => m.key !== 'aiChat'))
      setMe(meResult)
      setPendingCart(savedCart?.source === 'abonnement' ? savedCart : null)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) void load()
      return () => setStatusBarStyle('dark')
    }, [user, load]),
  )

  if (authLoading || !user) return <ScreenLoader />

  const cartItems: CheckoutCartItem[] = modules
    .filter((module) => {
      if (!PRIMARY_KEYS.includes(module.key)) return false
      if (!selected[module.key]) return false
      if (module.key !== 'conduite_heures' && me?.access[module.key]) return false
      return true
    })
    .map((module) => ({
      module: module.key,
      quantity: Math.max(1, Number(quantityByModule[module.key]) || 1),
    }))

  const cartTotal = cartItems.reduce((sum, item) => {
    const module = modules.find((m) => m.key === item.module)
    if (!module) return sum
    return sum + computeModuleAmount(item.module, module.price, item.quantity)
  }, 0)

  const handleRedeemPromo = async () => {
    const trimmed = promoCode.trim()
    if (!trimmed) return
    setPromoBusy(true)
    setPromoError(null)
    setPromoSuccess(null)
    try {
      const result = await redeemPromoCode(trimmed)
      setMe(result.access)
      const labels = result.modules
        .map((key) => modules.find((m) => m.key === key)?.label || key)
        .join(', ')
      setPromoSuccess(`Code activé : ${labels} débloqué${result.modules.length > 1 ? 's' : ''}.`)
      setPromoCode('')
    } catch (err) {
      setPromoError(err instanceof AccessRequestError ? err.message : 'Code invalide')
    } finally {
      setPromoBusy(false)
    }
  }

  const sortedModules = [...modules].sort((a, b) => {
    const ai = PRIMARY_KEYS.indexOf(a.key)
    const bi = PRIMARY_KEYS.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const activeSubscriptions = getActiveSubscriptions(me)
  const primaryOffers = sortedModules.filter((module) => PRIMARY_KEYS.includes(module.key))
  const canPay = cartItems.length > 0
  const hasAnyAccess = modules.some((m) => me?.access[m.key]) || (me ? me.user.soldeHeures > 0 : false)

  return (
    <View style={styles.root}>
      <View style={styles.halo} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />
          }
        >
          <View style={styles.headBlock}>
            <View style={styles.headRow}>
              <View style={styles.headActions}>
                <Pressable
                  style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('HistoriquePaiements')}
                  accessibilityLabel="Historique des paiements"
                  hitSlop={8}
                >
                  <History size={19} color={colors.muted} />
                </Pressable>
                <LogoTile size="sm" />
              </View>
            </View>
            <Text style={styles.h1}>Choisis ta formule</Text>
            <Text style={styles.sub}>Activation immédiate après paiement</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <SkeletonList count={3} />
              <ActivityIndicator color={colors.green} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <>
              {error ? (
                <View style={styles.errorCard}>
                  <CircleAlert size={18} color="#C2410C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {pendingCart ? (
                <NotchedCard tabLabel="Paiement interrompu" tabColor={colors.navy}>
                  <Text style={styles.cardText}>
                    Tu as un panier en cours. Reprends là où tu t’étais arrêté.
                  </Text>
                  <View style={styles.resumeActions}>
                    <Pressable
                      style={({ pressed }) => [styles.resumePayBtn, pressed && styles.pressed]}
                      onPress={() => {
                        const next: Partial<Record<AccessModuleKey, boolean>> = {}
                        for (const item of pendingCart.items) next[item.module] = true
                        setSelected(next)
                        setQuantityByModule(
                          Object.fromEntries(
                            pendingCart.items.map((item) => [item.module, String(item.quantity)]),
                          ),
                        )
                        setCheckoutOpen(true)
                      }}
                    >
                      <Text style={styles.resumePayText}>Reprendre le paiement</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void clearPendingCheckoutCart()
                        setPendingCart(null)
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.linkText}>Ignorer</Text>
                    </Pressable>
                  </View>
                </NotchedCard>
              ) : null}

              {activeSubscriptions.map((sub) => (
                <View key={sub.module} style={styles.whiteCard}>
                  <View style={styles.accessTop}>
                    <View style={styles.accessCopy}>
                      <Text style={styles.accessLabel}>Mon accès</Text>
                      <Text style={styles.accessName}>{sub.label}</Text>
                      <Text style={styles.accessMeta}>
                        Expire le {formatSubscriptionEndDate(sub.endAt)} · {sub.remainingLabel}
                      </Text>
                    </View>
                    <View style={styles.activeBadge}>
                      <Check size={12} color={colors.greenDark} strokeWidth={3} />
                      <Text style={styles.activeBadgeText}>Actif</Text>
                    </View>
                  </View>
                  {sub.daysLeft <= 7 ? (
                    <Pressable
                      style={({ pressed }) => [styles.renewBtn, pressed && styles.pressed]}
                      onPress={() => setSelected({ [sub.module]: true })}
                    >
                      <Text style={styles.renewBtnText}>Renouveler</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {me ? (
                <View style={styles.whiteCard}>
                  <View style={styles.soldeRow}>
                    <View style={styles.soldeIcon}>
                      <Clock size={20} color={colors.greenDark} />
                    </View>
                    <View style={styles.accessCopy}>
                      <Text style={styles.accessLabel}>Solde heures de conduite</Text>
                      <Text style={styles.soldeValue}>{me.user.soldeHeures} h</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
                      onPress={() => navigation.navigate('HistoriquePaiements')}
                    >
                      <Clock size={14} color={colors.greenDark} />
                      <Text style={styles.historyBtnText}>Historique</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {me?.pendingRequest ? (
                <View style={styles.infoCard}>
                  <TriangleAlert size={18} color={colors.greenDark} />
                  <Text style={styles.infoCardText}>
                    Paiement en confirmation… Valide la demande sur ton téléphone puis reviens ici.
                  </Text>
                </View>
              ) : null}

              <View style={styles.catalogHead}>
                <Text style={styles.catalogTitle}>Offres disponibles</Text>
                <Text style={styles.catalogSub}>{INTRO_COPY}</Text>
              </View>

              {primaryOffers.length === 0 ? (
                <View style={styles.emptyOffers}>
                  <Lock size={26} color={colors.subtle} />
                  <Text style={styles.emptyOffersTitle}>Aucune offre disponible</Text>
                  <Text style={styles.cardText}>
                    Reviens plus tard ou contacte le support si le problème persiste.
                  </Text>
                </View>
              ) : (
                primaryOffers.map((module) => {
                  const isActive =
                    Boolean(me?.access[module.key]) && module.key !== 'conduite_heures'
                  const showsQuantity = module.unit === 'hour'
                  const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
                  const amount = computeModuleAmount(
                    module.key,
                    module.price,
                    showsQuantity ? quantity : 1,
                  )
                  const checked = Boolean(selected[module.key])

                  return (
                    <View key={module.key} style={styles.planWrap}>
                      <PlanCard
                        name={module.label}
                        description={
                          isActive
                            ? 'Accès actif'
                            : `${formatPrice(module.price)}${unitSuffix[module.unit]}`
                        }
                        price={isActive ? 'Actif' : formatPrice(amount)}
                        selected={checked || isActive}
                        onPress={
                          isActive
                            ? undefined
                            : () =>
                                setSelected((current) => ({
                                  ...current,
                                  [module.key]: !current[module.key],
                                }))
                        }
                      />
                      {module.key === 'conduite_heures' && quantity >= 2 ? (
                        <Text style={styles.discount}>Remise −1 000 FCFA appliquée</Text>
                      ) : null}
                      {showsQuantity && !isActive ? (
                        <View style={styles.quantityField}>
                          <Text style={styles.fieldLabel}>Nombre d’heures</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={quantityByModule[module.key] ?? '1'}
                            onChangeText={(text) =>
                              setQuantityByModule((current) => ({
                                ...current,
                                [module.key]: text,
                              }))
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  )
                })
              )}

              <Pressable
                style={({ pressed }) => [styles.whiteCard, styles.conduiteLink, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Conduite')}
              >
                <View style={styles.accessCopy}>
                  <Text style={styles.accessName}>Espace conduite</Text>
                  <Text style={styles.catalogSub}>
                    Cours vidéo gratuits · réserver / acheter des heures avec moniteur
                  </Text>
                </View>
                <View style={styles.gratuitBadge}>
                  <Text style={styles.gratuitBadgeText}>Gratuit</Text>
                </View>
                <ChevronRight size={18} color={colors.subtle} />
              </Pressable>

              <Text style={styles.payTitle}>Payer avec Mobile Money</Text>
              <View style={styles.operatorRow}>
                <View style={styles.operatorPill}>
                  <View style={[styles.operatorDot, { backgroundColor: colors.yellow }]} />
                  <Text style={styles.operatorText}>MTN MoMo</Text>
                </View>
                <View style={[styles.operatorPill, styles.operatorPillOff]}>
                  <View style={[styles.operatorDot, { backgroundColor: colors.green }]} />
                  <Text style={styles.operatorText}>Moov Money</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.payBtn,
                  !canPay && styles.disabled,
                  pressed && canPay && styles.pressed,
                ]}
                disabled={!canPay}
                onPress={() => setCheckoutOpen(true)}
              >
                <ShieldCheck size={18} color={colors.yellow} strokeWidth={2.2} />
                <Text style={styles.payText}>
                  {canPay ? `Payer ${formatPrice(cartTotal)}` : 'Sélectionne une offre'}
                </Text>
              </Pressable>
              <Text style={styles.secureCaption}>Paiement sécurisé par FedaPay · XOF</Text>

              <View style={styles.whiteCard}>
                <Text style={styles.promoTitle}>Vous avez un code promo ?</Text>
                <View style={styles.promoRow}>
                  <View style={styles.promoInputWrap}>
                    <Ticket size={16} color={colors.greenDark} />
                    <TextInput
                      style={styles.promoInput}
                      autoCapitalize="characters"
                      placeholder="CODE PROMO"
                      placeholderTextColor={colors.subtle}
                      value={promoCode}
                      editable={!promoBusy}
                      onChangeText={(text) => setPromoCode(text.toUpperCase())}
                    />
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.promoBtn,
                      (promoBusy || !promoCode.trim()) && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                    disabled={promoBusy || !promoCode.trim()}
                    onPress={() => void handleRedeemPromo()}
                  >
                    <Text style={styles.promoBtnText}>
                      {promoBusy ? 'Vérification…' : 'Valider'}
                    </Text>
                  </Pressable>
                </View>
                {promoError ? <Text style={styles.errorInline}>{promoError}</Text> : null}
                {promoSuccess ? <Text style={styles.discount}>{promoSuccess}</Text> : null}
              </View>

              {!hasAnyAccess ? (
                <View style={styles.whiteCard}>
                  <View style={styles.lockRow}>
                    <Lock size={20} color={colors.subtle} />
                    <View style={styles.accessCopy}>
                      <Text style={styles.accessName}>Aucune offre sélectionnée</Text>
                      <Text style={styles.cardText}>
                        Sélectionne au moins une offre ci-dessus pour débloquer tes parcours.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <LegalFooter />
              <View style={{ height: 120 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <MainTabBar activeId="offres" />

      <MobileMoneyCheckout
        visible={checkoutOpen}
        items={cartItems}
        modules={modules}
        defaultPhone={user.phone}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(access) => {
          setMe(access)
          setSelected({})
          setCheckoutOpen(false)
          setPendingCart(null)
          void clearPendingCheckoutCart()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  halo: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.yellow,
    opacity: 0.16,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    gap: 12,
  },
  headBlock: {
    gap: 3,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  h1: {
    fontFamily: 'Sora_700Bold',
    fontSize: 26,
    letterSpacing: -0.52,
    color: colors.navy,
  },
  sub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  headActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  loadingBox: {
    paddingVertical: 12,
  },
  errorCard: {
    borderRadius: 20,
    backgroundColor: '#FEF3EF',
    borderWidth: 1.5,
    borderColor: '#F5C9B8',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#9A3412',
  },
  whiteCard: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 19,
  },
  resumeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  resumePayBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumePayText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  linkText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13.5,
    color: colors.muted,
  },
  accessTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  accessCopy: {
    flex: 1,
    gap: 2,
  },
  accessLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11.5,
    color: colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accessName: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  accessMeta: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.greenTint,
  },
  activeBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.greenDark,
  },
  renewBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  soldeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  soldeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldeValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    color: colors.navy,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  historyBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.greenDark,
  },
  infoCard: {
    borderRadius: 20,
    backgroundColor: colors.greenTint,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCardText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.greenInk,
  },
  catalogHead: {
    marginTop: 4,
    gap: 4,
  },
  catalogTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.navy,
  },
  catalogSub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 18,
  },
  emptyOffers: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyOffersTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  planWrap: {
    gap: 8,
  },
  discount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.greenDark,
  },
  quantityField: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.muted,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.navy,
  },
  conduiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gratuitBadge: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.yellowTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gratuitBadgeText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: colors.navy,
  },
  payTitle: {
    marginTop: 6,
    fontFamily: 'Sora_700Bold',
    fontSize: 17,
    color: colors.navy,
  },
  operatorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  operatorPill: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  operatorPillOff: {
    backgroundColor: colors.bg,
  },
  operatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  operatorText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  payBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  payText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
  secureCaption: {
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.subtle,
  },
  promoTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: colors.navy,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInputWrap: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.navy,
    letterSpacing: 1,
  },
  promoBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  errorInline: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: '#C2410C',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
})
