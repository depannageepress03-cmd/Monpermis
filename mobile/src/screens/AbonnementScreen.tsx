import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, Clock, CreditCard, History, Lock } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
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
import { DarkScreen } from '../components/DarkScreen'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { PageNavbar } from '../components/PageNavbar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import {
  clearPendingCheckoutCart,
  loadPendingCheckoutCart,
  type PendingCheckoutCart,
} from '../utils/checkoutCart'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Abonnement'>

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

const PRIMARY_KEYS: AccessModuleKey[] = ['code']

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

  useEffect(() => {
    if (user) void load()
  }, [user, load])

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

  return (
    <DarkScreen>
      <PageNavbar title="Mes accès" icon={CreditCard} onBack={() => navigation.navigate('Home')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <Text style={styles.intro}>
            Achète l’accès Code par Mobile Money (MTN, Moov, Celtiis). Les cours vidéo de
            conduite sont gratuits depuis l’espace Conduite ; les heures moniteur s’achètent
            aussi là-bas.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('HistoriquePaiements')}
          >
            <History size={16} color={dark.textPrimary} />
            <Text style={styles.historyBtnText}>Historique</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={dark.green} />
            <Text style={styles.emptyText}>Chargement…</Text>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {pendingCart ? (
              <View style={styles.resumeCard}>
                <Text style={styles.kicker}>Paiement interrompu</Text>
                <Text style={styles.statusCopy}>
                  Tu as un panier en cours. Reprends là où tu t’étais arrêté.
                </Text>
                <View style={styles.resumeActions}>
                  <Pressable
                    style={styles.payBtn}
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
                    <Text style={styles.payText}>Reprendre le paiement</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void clearPendingCheckoutCart()
                      setPendingCart(null)
                    }}
                  >
                    <Text style={styles.selectHint}>Ignorer</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {me ? (
              <View style={styles.statusCardOutline}>
                <Text style={styles.kicker}>
                  <Clock size={13} color={dark.green} /> Solde heures de conduite
                </Text>
                <Text style={styles.statusTitle}>{me.user.soldeHeures} h</Text>
                {me.pendingRequest ? (
                  <Text style={styles.statusCopy}>
                    Paiement en confirmation… Valide la demande sur ton téléphone puis reviens ici.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.catalogTitle}>Offres disponibles</Text>
            <View style={styles.planList}>
              {sortedModules
                .filter((module) => PRIMARY_KEYS.includes(module.key))
                .map((module) => {
                const isActive = Boolean(me?.access[module.key]) && module.key !== 'conduite_heures'
                const showsQuantity = module.unit === 'hour'
                const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
                const amount = computeModuleAmount(module.key, module.price, showsQuantity ? quantity : 1)
                const checked = Boolean(selected[module.key])

                return (
                  <Pressable
                    key={module.key}
                    disabled={isActive}
                    onPress={() => setSelected((current) => ({ ...current, [module.key]: !current[module.key] }))}
                    style={[styles.plan, checked && styles.planSelected, isActive && styles.planDisabled]}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.planCopy}>
                        <Text style={styles.planName}>
                          {module.label}
                          {isActive ? ' · Actif' : ''}
                        </Text>
                        <Text style={styles.duration}>
                          {formatPrice(module.price)}
                          {unitSuffix[module.unit]}
                        </Text>
                      </View>
                      <Text style={styles.price}>{formatPrice(amount)}</Text>
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
                            setQuantityByModule((current) => ({ ...current, [module.key]: text }))
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
                      <Text style={styles.selectHint}>{checked ? 'Sélectionné' : 'Appuyer pour sélectionner'}</Text>
                    )}
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              style={({ pressed }) => [styles.conduiteLink, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Conduite')}
            >
              <Text style={styles.conduiteLinkTitle}>Espace conduite</Text>
              <Text style={styles.conduiteLinkCopy}>
                Cours vidéo gratuits · réserver / acheter des heures avec moniteur
              </Text>
            </Pressable>

            <Pressable
              style={[styles.payBtn, cartItems.length === 0 && styles.disabled]}
              disabled={cartItems.length === 0}
              onPress={() => setCheckoutOpen(true)}
            >
              <Text style={styles.payText}>Payer {formatPrice(cartTotal)}</Text>
            </Pressable>

            <View style={styles.statusCardOutline}>
              <Text style={styles.kicker}>Vous avez un code promo ?</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={[styles.input, styles.promoInput]}
                  autoCapitalize="characters"
                  placeholder="CODE PROMO"
                  placeholderTextColor={dark.textMuted}
                  value={promoCode}
                  editable={!promoBusy}
                  onChangeText={(text) => setPromoCode(text.toUpperCase())}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.promoBtn,
                    (promoBusy || !promoCode.trim()) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={promoBusy || !promoCode.trim()}
                  onPress={() => void handleRedeemPromo()}
                >
                  <Text style={styles.promoBtnText}>{promoBusy ? 'Vérification…' : 'Valider'}</Text>
                </Pressable>
              </View>
              {promoError ? <Text style={styles.error}>{promoError}</Text> : null}
              {promoSuccess ? <Text style={styles.discount}>{promoSuccess}</Text> : null}
            </View>

            {!modules.some((m) => me?.access[m.key]) && !(me && me.user.soldeHeures > 0) ? (
              <View style={styles.statusCardOutline}>
                <Lock size={26} color={dark.textMuted} />
                <Text style={styles.statusCopy}>
                  Sélectionne au moins une offre ci-dessus pour débloquer tes parcours.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

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
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingBottom: 40, paddingTop: 8 },
  introRow: { gap: 12, marginBottom: 20 },
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: dark.textMuted },
  historyBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: dark.surface,
  },
  historyBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: dark.textPrimary },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 44 },
  emptyText: { color: dark.textMuted, fontSize: 15, fontFamily: fonts.body },
  error: { color: dark.coral, marginBottom: 12, fontFamily: fonts.body },
  resumeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.45)',
    backgroundColor: 'rgba(240,180,41,0.10)',
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  resumeActions: { gap: 10, marginTop: 4 },
  statusCardOutline: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 18,
    marginBottom: 16,
    gap: 6,
  },
  kicker: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: dark.green,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusTitle: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: dark.textPrimary, marginTop: 4 },
  statusCopy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: dark.textMuted },
  catalogTitle: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: dark.textPrimary, marginBottom: 14 },
  planList: { gap: 14 },
  plan: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    backgroundColor: dark.surface,
    gap: 10,
  },
  planSelected: { borderColor: dark.green },
  planDisabled: { opacity: 0.7 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planCopy: { flex: 1 },
  planName: { color: dark.textPrimary, fontFamily: fonts.displayBold, fontSize: 18 },
  duration: {
    alignSelf: 'flex-start',
    color: dark.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    backgroundColor: dark.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  price: { color: dark.green, fontFamily: fonts.displayExtraBold, fontSize: 18 },
  discount: { color: dark.green, fontFamily: fonts.body, fontSize: 13 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeText: { color: dark.green, fontFamily: fonts.bodyBold, fontSize: 14 },
  selectHint: { color: dark.textMuted, fontFamily: fonts.body, fontSize: 13 },
  quantityField: { gap: 6 },
  fieldLabel: { color: dark.textMuted, fontFamily: fonts.bodyBold, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    backgroundColor: dark.surfaceRaised,
  },
  promoRow: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  promoInput: { flex: 1 },
  promoBtn: {
    borderRadius: 12,
    backgroundColor: dark.green,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  promoBtnText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 14 },
  payBtn: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 15 },
  conduiteLink: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    gap: 4,
  },
  conduiteLinkTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: dark.textPrimary },
  conduiteLinkCopy: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: dark.textMuted },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
})
