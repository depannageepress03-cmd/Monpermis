import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  History,
  Lock,
  Ticket,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
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
import { Bouncy } from '../components/Bouncy'
import { FadeUp } from '../components/FadeUp'
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
import { brand, colors, dark, fonts, shadows } from '../theme'
import {
  clearPendingCheckoutCart,
  loadPendingCheckoutCart,
  type PendingCheckoutCart,
} from '../utils/checkoutCart'
import { formatPrice } from '../utils/money'

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
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Partial<Record<AccessModuleKey, boolean>>>({})
  const [quantityByModule, setQuantityByModule] = useState<Record<string, string>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)
  const [pendingCart, setPendingCart] = useState<PendingCheckoutCart | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
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

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Home')}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <CreditCard size={15} color={dark.green} />
            </View>
            <Text style={styles.topBarTitle}>Mes accès</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('HistoriquePaiements')}
            accessibilityLabel="Historique"
            hitSlop={8}
          >
            <History size={19} color={dark.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, !loading && styles.scrollWithSticky]}
          showsVerticalScrollIndicator={false}
        >
          <FadeUp delay={40}>
            <LinearGradient
              colors={['#E8F8EF', '#F0FDF4', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Débloquez toute l’expérience Monpermis.bj</Text>
                <Text style={styles.heroText}>{INTRO_COPY}</Text>
              </View>
              <View style={styles.heroArt} accessibilityElementsHidden>
                <View style={styles.heroArtCircle}>
                  <Wallet size={32} color={dark.green} />
                </View>
                <View style={styles.heroArtBadge}>
                  <CreditCard size={14} color={colors.white} />
                </View>
              </View>
            </LinearGradient>
          </FadeUp>

          {loading ? (
            <View style={styles.loadingBox}>
              <SkeletonList count={3} />
              <ActivityIndicator color={dark.green} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <>
              {error ? (
                <FadeUp delay={60}>
                  <View style={styles.errorCard}>
                    <CircleAlert size={18} color={dark.coral} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </FadeUp>
              ) : null}

              {pendingCart ? (
                <FadeUp delay={70}>
                  <View style={styles.resumeCard}>
                    <Text style={styles.kicker}>Paiement interrompu</Text>
                    <Text style={styles.statusCopy}>
                      Tu as un panier en cours. Reprends là où tu t’étais arrêté.
                    </Text>
                    <View style={styles.resumeActions}>
                      <Bouncy
                        scaleTo={0.98}
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
                        <View style={styles.resumePayBtn}>
                          <Text style={styles.resumePayText}>Reprendre le paiement</Text>
                        </View>
                      </Bouncy>
                      <Pressable
                        onPress={() => {
                          void clearPendingCheckoutCart()
                          setPendingCart(null)
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.selectHint}>Ignorer</Text>
                      </Pressable>
                    </View>
                  </View>
                </FadeUp>
              ) : null}

              {activeSubscriptions.map((sub, index) => (
                <FadeUp key={sub.module} delay={80 + index * 30}>
                  <View style={styles.accessCard}>
                    <View style={styles.accessIcon}>
                      <BookOpen size={20} color={dark.green} />
                    </View>
                    <View style={styles.accessCopy}>
                      <Text style={styles.accessLabel}>Mon accès</Text>
                      <Text style={styles.accessName}>{sub.label}</Text>
                      <Text style={styles.accessMeta}>
                        Expire le {formatSubscriptionEndDate(sub.endAt)} · {sub.remainingLabel}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>Actif</Text>
                    </View>
                    {sub.daysLeft <= 7 ? (
                      <Pressable
                        style={styles.renewBtn}
                        onPress={() => setSelected({ [sub.module]: true })}
                      >
                        <Text style={styles.renewBtnText}>Renouveler</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </FadeUp>
              ))}

              {me ? (
                <FadeUp delay={100}>
                  <View style={styles.soldeCard}>
                    <View style={styles.soldeIcon}>
                      <Clock size={20} color={dark.green} />
                    </View>
                    <View style={styles.soldeCopy}>
                      <Text style={styles.soldeLabel}>Solde heures de conduite</Text>
                      <Text style={styles.soldeValue}>{me.user.soldeHeures} h</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.soldeHistoryBtn, pressed && styles.pressed]}
                      onPress={() => navigation.navigate('HistoriquePaiements')}
                    >
                      <Clock size={14} color={dark.green} />
                      <Text style={styles.soldeHistoryText}>Historique</Text>
                    </Pressable>
                  </View>
                </FadeUp>
              ) : null}

              {me?.pendingRequest ? (
                <FadeUp delay={110}>
                  <View style={styles.infoCard}>
                    <TriangleAlert size={18} color={dark.green} />
                    <Text style={styles.infoCardText}>
                      Paiement en confirmation… Valide la demande sur ton téléphone puis reviens
                      ici.
                    </Text>
                  </View>
                </FadeUp>
              ) : null}

              <FadeUp delay={120}>
                <View style={styles.catalogHead}>
                  <Text style={styles.catalogTitle}>Offres disponibles</Text>
                  <Text style={styles.catalogSub}>
                    Choisissez la formule adaptée à vos besoins.
                  </Text>
                </View>
              </FadeUp>

              {primaryOffers.length === 0 ? (
                <FadeUp delay={130}>
                  <View style={styles.emptyOffers}>
                    <Lock size={26} color={dark.textMuted} />
                    <Text style={styles.emptyOffersTitle}>Aucune offre disponible</Text>
                    <Text style={styles.statusCopy}>
                      Reviens plus tard ou contacte le support si le problème persiste.
                    </Text>
                  </View>
                </FadeUp>
              ) : (
                primaryOffers.map((module, index) => {
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
                    <FadeUp key={module.key} delay={130 + index * 40}>
                      <Pressable
                        disabled={isActive}
                        onPress={() =>
                          setSelected((current) => ({
                            ...current,
                            [module.key]: !current[module.key],
                          }))
                        }
                        style={[
                          styles.plan,
                          checked && styles.planSelected,
                          isActive && styles.planActive,
                        ]}
                      >
                        <View style={styles.planTop}>
                          <View style={[styles.planIcon, isActive && styles.planIconActive]}>
                            {module.key === 'code' ? (
                              <TriangleAlert size={20} color={dark.green} />
                            ) : (
                              <BookOpen size={20} color={dark.green} />
                            )}
                          </View>
                          <View style={styles.planCopy}>
                            <Text style={styles.planName}>{module.label}</Text>
                            <Text style={styles.duration}>
                              {formatPrice(module.price)}
                              {unitSuffix[module.unit]}
                            </Text>
                          </View>
                          <View style={styles.priceCol}>
                            {isActive ? (
                              <View style={styles.activeBadge}>
                                <Check size={12} color={dark.green} strokeWidth={3} />
                                <Text style={styles.activeBadgeText}>Active</Text>
                              </View>
                            ) : (
                              <Text style={styles.price}>{formatPrice(amount)}</Text>
                            )}
                            <ChevronRight
                              size={18}
                              color={checked || isActive ? dark.green : dark.textMuted}
                            />
                          </View>
                        </View>

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

                        {isActive ? (
                          <View style={styles.activeRow}>
                            <Check size={16} color={dark.green} />
                            <Text style={styles.activeText}>Accès actif</Text>
                          </View>
                        ) : (
                          <View style={styles.selectRow}>
                            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                              {checked ? (
                                <Check size={12} color={colors.white} strokeWidth={3} />
                              ) : null}
                            </View>
                            <Text style={styles.selectHint}>
                              {checked ? 'Sélectionné' : 'Sélectionner cette offre'}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    </FadeUp>
                  )
                })
              )}

              <FadeUp delay={180}>
                <Pressable
                  style={({ pressed }) => [styles.conduiteLink, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('Conduite')}
                >
                  <View style={styles.conduiteIcon}>
                    <BookOpen size={18} color="#2E93E6" />
                  </View>
                  <View style={styles.conduiteCopy}>
                    <Text style={styles.conduiteLinkTitle}>Espace conduite</Text>
                    <Text style={styles.conduiteLinkCopy}>
                      Cours vidéo gratuits · réserver / acheter des heures avec moniteur
                    </Text>
                  </View>
                  <View style={styles.gratuitBadge}>
                    <Text style={styles.gratuitBadgeText}>Gratuit</Text>
                  </View>
                  <ChevronRight size={18} color={dark.textMuted} />
                </Pressable>
              </FadeUp>

              <FadeUp delay={200}>
                <View style={styles.promoCard}>
                  <Text style={styles.kicker}>Vous avez un code promo ?</Text>
                  <View style={styles.promoRow}>
                    <View style={styles.promoInputWrap}>
                      <Ticket size={16} color={dark.green} />
                      <TextInput
                        style={styles.promoInput}
                        autoCapitalize="characters"
                        placeholder="CODE PROMO"
                        placeholderTextColor={dark.textMuted}
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
              </FadeUp>

              {!modules.some((m) => me?.access[m.key]) && !(me && me.user.soldeHeures > 0) ? (
                <FadeUp delay={220}>
                  <View style={styles.lockCard}>
                    <Lock size={20} color={dark.textMuted} />
                    <View style={styles.lockCopy}>
                      <Text style={styles.lockTitle}>Aucune offre sélectionnée</Text>
                      <Text style={styles.statusCopy}>
                        Sélectionne au moins une offre ci-dessus pour débloquer tes parcours.
                      </Text>
                    </View>
                  </View>
                </FadeUp>
              ) : null}

              <LegalFooter />
            </>
          )}
        </ScrollView>

        {!loading ? (
          <View style={styles.stickyBar}>
            <View style={styles.stickyCopy}>
              <CreditCard size={18} color={dark.green} />
              <View style={styles.stickyTextCol}>
                <Text style={styles.stickyTitle} numberOfLines={2}>
                  {canPay
                    ? `${cartItems.length} offre${cartItems.length > 1 ? 's' : ''} · ${formatPrice(cartTotal)}`
                    : 'Sélectionne au moins une offre pour débloquer le paiement.'}
                </Text>
              </View>
            </View>
            <Bouncy scaleTo={0.98} disabled={!canPay} onPress={() => setCheckoutOpen(true)}>
              <View style={[styles.payBtn, !canPay && styles.disabled]}>
                <Text style={styles.payText}>Payer {formatPrice(cartTotal)}</Text>
              </View>
            </Bouncy>
          </View>
        ) : null}
      </SafeAreaView>

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
    backgroundColor: '#F8FAFC',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,16,48,0.05)',
    ...shadows.sm,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  scrollWithSticky: {
    paddingBottom: 120,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: dark.textPrimary,
  },
  heroText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: dark.textMuted,
  },
  heroArt: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(0,176,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  loadingBox: {
    gap: 8,
    paddingVertical: 12,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 20,
    backgroundColor: dark.coralSoft,
    padding: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.coral,
  },
  errorInline: {
    color: dark.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 8,
  },
  resumeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.45)',
    backgroundColor: 'rgba(240,180,41,0.10)',
    padding: 18,
    gap: 8,
  },
  resumeActions: { gap: 10, marginTop: 4 },
  resumePayBtn: {
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resumePayText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  accessCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.greenPale,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,176,80,0.28)',
    padding: 20,
    ...shadows.sm,
  },
  accessIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessCopy: {
    flex: 1,
    minWidth: 120,
    gap: 2,
  },
  accessLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  accessName: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
  },
  accessMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.3)',
  },
  statusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
  },
  renewBtn: {
    width: '100%',
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  renewBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  soldeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    padding: 20,
    ...shadows.sm,
  },
  soldeIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  soldeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  soldeValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: dark.textPrimary,
  },
  soldeHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(0,176,80,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: brand.greenPale,
  },
  soldeHistoryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    backgroundColor: brand.greenPale,
    padding: 16,
  },
  infoCardText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  catalogHead: {
    gap: 4,
    marginTop: 4,
  },
  catalogTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
  },
  catalogSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
  },
  emptyOffers: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    padding: 24,
  },
  emptyOffersTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  plan: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.08)',
    padding: 20,
    backgroundColor: '#FFFFFF',
    gap: 12,
    ...shadows.sm,
  },
  planSelected: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  planActive: {
    borderColor: 'rgba(0,176,80,0.35)',
    backgroundColor: brand.greenPale,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconActive: {
    backgroundColor: '#FFFFFF',
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  planName: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  duration: {
    alignSelf: 'flex-start',
    color: dark.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    color: dark.green,
    fontFamily: fonts.displayExtraBold,
    fontSize: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
  },
  discount: {
    color: dark.green,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeText: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(0,16,48,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: dark.green,
    backgroundColor: dark.green,
  },
  selectHint: {
    color: dark.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  quantityField: { gap: 6 },
  fieldLabel: {
    color: dark.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    backgroundColor: '#F8FAFC',
  },
  conduiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    ...shadows.sm,
  },
  conduiteIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(46,147,230,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conduiteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  conduiteLinkTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  conduiteLinkCopy: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: dark.textMuted,
  },
  gratuitBadge: {
    borderRadius: 999,
    backgroundColor: brand.greenPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gratuitBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: dark.green,
  },
  promoCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    padding: 20,
    ...shadows.sm,
  },
  kicker: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: dark.green,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  statusCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  promoInputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  promoInput: {
    flex: 1,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  promoBtn: {
    borderRadius: 14,
    backgroundColor: brand.greenPale,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.25)',
  },
  promoBtnText: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  lockCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,16,48,0.04)',
    padding: 18,
  },
  lockCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  lockTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    ...shadows.md,
  },
  stickyCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stickyTextCol: {
    flex: 1,
    minWidth: 0,
  },
  stickyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  payBtn: {
    minHeight: 56,
    minWidth: 120,
    borderRadius: 20,
    backgroundColor: dark.green,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
})
