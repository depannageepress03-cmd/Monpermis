import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { Check, Clock, CreditCard, History, Lock, RefreshCw } from 'lucide-react-native'
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  createAccessRequest,
  declareAccessPayment,
  fetchAccessMe,
  fetchAccessModules,
  syncAccessRequest,
  AccessRequestError,
  type AccessMe,
  type AccessModule,
  type AccessModuleKey,
} from '../api/accessRequests'
import { Bouncy } from '../components/Bouncy'
import { DarkScreen } from '../components/DarkScreen'
import { PageNavbar } from '../components/PageNavbar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'

WebBrowser.maybeCompleteAuthSession()

type Nav = NativeStackNavigationProp<RootStackParamList, 'Abonnement'>

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

const statusLabels: Record<string, string> = {
  en_attente: 'En attente',
  paiement_declare: 'Paiement déclaré, en vérification',
  en_verification: 'Paiement Mobile Money en confirmation',
  valide: 'Validé',
  actif: 'Actif',
  expire: 'Expiré',
  rejete: 'Rejeté',
}

const moduleLabels: Record<AccessModuleKey, string> = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  ecodepermis: 'E-Codepermis',
  aiChat: 'Chat IA',
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

function callbackRedirectPrefix(callbackUrl?: string) {
  if (!callbackUrl) return null
  try {
    const url = new URL(callbackUrl)
    return `${url.origin}${url.pathname}`
  } catch {
    return callbackUrl.split('?')[0] || null
  }
}

export function AbonnementScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)

  const [modules, setModules] = useState<AccessModule[]>([])
  const [me, setMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [busyModule, setBusyModule] = useState<AccessModuleKey | null>(null)
  const [quantityByModule, setQuantityByModule] = useState<Record<string, string>>({})
  const [manualFormFor, setManualFormFor] = useState<AccessModuleKey | null>(null)
  const [declaredReference, setDeclaredReference] = useState('')
  const [declareNote, setDeclareNote] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingSyncIdRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const applySyncedAccess = useCallback(
    (result: { accessRequest: { status: string }; access: AccessMe }) => {
      setMe(result.access)
      if (result.accessRequest.status === 'actif' || result.accessRequest.status === 'valide') {
        stopPolling()
        pendingSyncIdRef.current = null
        setSuccess('Paiement confirmé. Ton accès est maintenant actif.')
        setError(null)
        return 'done'
      }
      if (result.accessRequest.status === 'rejete') {
        stopPolling()
        pendingSyncIdRef.current = null
        setError('Le paiement n’a pas abouti. Tu peux réessayer.')
        setSuccess(null)
        return 'done'
      }
      return 'pending'
    },
    [stopPolling],
  )

  const syncPending = useCallback(
    async (id: string) => {
      try {
        const result = await syncAccessRequest(id)
        return applySyncedAccess(result)
      } catch {
        return 'error'
      }
    },
    [applySyncedAccess],
  )

  const pollPendingRequest = useCallback(
    (id: string) => {
      pendingSyncIdRef.current = id
      stopPolling()
      let ticks = 0
      pollRef.current = setInterval(() => {
        void (async () => {
          ticks += 1
          const state = await syncPending(id)
          if (state === 'done' || ticks >= 45) {
            stopPolling()
            if (ticks >= 45 && state !== 'done') {
              setSuccess('Paiement toujours en cours. Tu peux actualiser le statut dans un instant.')
            }
          }
        })()
      }, 2500)
    },
    [stopPolling, syncPending],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [moduleCatalog, meResult] = await Promise.all([fetchAccessModules(), fetchAccessMe()])
      setModules(moduleCatalog)
      setMe(meResult)
      if (meResult.pendingRequest?.status === 'en_verification') {
        pollPendingRequest(meResult.pendingRequest.id)
      }
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [pollPendingRequest])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => () => stopPolling(), [stopPolling])

  useFocusEffect(
    useCallback(() => {
      const id = pendingSyncIdRef.current || me?.pendingRequest?.id
      if (id && me?.pendingRequest?.status === 'en_verification') {
        void syncPending(id)
      }
    }, [me?.pendingRequest?.id, me?.pendingRequest?.status, syncPending]),
  )

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return
      const id = pendingSyncIdRef.current || me?.pendingRequest?.id
      if (!id) return
      void syncPending(id).then((result) => {
        if (result === 'pending') pollPendingRequest(id)
      })
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [me?.pendingRequest?.id, pollPendingRequest, syncPending])

  const buyWithFedaPay = async (module: AccessModule) => {
    setBusyModule(module.key)
    setError(null)
    setSuccess(null)
    try {
      const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
      const result = await createAccessRequest({ module: module.key, quantity, method: 'fedapay' })
      if (!result.paymentUrl) {
        setError('Lien de paiement Mobile Money indisponible. Réessaie dans un instant.')
        return
      }

      pendingSyncIdRef.current = result.accessRequest.id
      setSuccess('Ouverture du paiement Mobile Money…')

      const redirectPrefix = callbackRedirectPrefix(result.callbackUrl)
      if (redirectPrefix) {
        await WebBrowser.openAuthSessionAsync(result.paymentUrl, redirectPrefix)
      } else {
        await WebBrowser.openBrowserAsync(result.paymentUrl)
      }

      setSuccess('Confirmation du paiement en cours…')
      const state = await syncPending(result.accessRequest.id)
      if (state !== 'done') {
        setSuccess('Paiement en cours de confirmation Mobile Money…')
        pollPendingRequest(result.accessRequest.id)
      }
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Paiement impossible à initier')
    } finally {
      setBusyModule(null)
    }
  }

  const openManualForm = (module: AccessModuleKey) => {
    setManualFormFor(module)
    setDeclaredReference('')
    setDeclareNote('')
    setError(null)
  }

  const submitManualDeclaration = async (module: AccessModule) => {
    if (declaredReference.trim().length < 3) {
      setError('Indique une référence de paiement valide.')
      return
    }
    setBusyModule(module.key)
    setError(null)
    try {
      const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
      const { accessRequest } = await createAccessRequest({ module: module.key, quantity, method: 'manual' })
      await declareAccessPayment(accessRequest.id, {
        declaredReference: declaredReference.trim(),
        note: declareNote.trim(),
      })
      setSuccess('Déclaration envoyée. Un administrateur va vérifier ton paiement.')
      setManualFormFor(null)
      setMe(await fetchAccessMe())
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Déclaration impossible')
    } finally {
      setBusyModule(null)
    }
  }

  const refresh = async () => {
    const pending = me?.pendingRequest
    if (!pending) {
      await load()
      return
    }
    try {
      const state = await syncPending(pending.id)
      if (state === 'pending') {
        setSuccess('Paiement toujours en cours de confirmation…')
        pollPendingRequest(pending.id)
      } else if (state === 'error') {
        setError('Actualisation impossible. Réessaie dans un instant.')
      }
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Actualisation impossible')
    }
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar title="Mes accès" icon={CreditCard} onBack={() => navigation.navigate('Home')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <Text style={styles.intro}>
            Paie en ligne par Mobile Money, ou déclare un paiement hors plateforme.
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
            {success ? <Text style={styles.success}>{success}</Text> : null}

            {me ? (
              <View style={styles.statusCardOutline}>
                <Text style={styles.kicker}>
                  <Clock size={13} color={dark.green} /> Solde heures de conduite
                </Text>
                <Text style={styles.statusTitle}>{me.user.soldeHeures} h</Text>
                {me.pendingRequest ? (
                  <>
                    <Text style={styles.statusCopy}>
                      {moduleLabels[me.pendingRequest.module] || me.pendingRequest.module}
                      {' · '}
                      {formatPrice(me.pendingRequest.amount, me.pendingRequest.currency)}
                      {'\n'}
                      {statusLabels[me.pendingRequest.status]}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                      onPress={() => void refresh()}
                    >
                      <RefreshCw size={16} color={dark.textPrimary} />
                      <Text style={styles.outlineText}>Actualiser le paiement</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.catalogTitle}>Paiement en ligne</Text>

            <View style={styles.planList}>
              {modules.map((module) => {
                const isActive = Boolean(me?.access[module.key])
                const showsQuantity = module.unit === 'hour' || module.unit === 'week'
                const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
                const isBusy = busyModule === module.key

                return (
                  <View key={module.key} style={styles.plan}>
                    <View style={styles.planHeader}>
                      <View style={styles.planCopy}>
                        <Text style={styles.planName}>{module.label}</Text>
                        <Text style={styles.duration}>
                          {module.unit === 'hour'
                            ? 'À l’heure'
                            : module.unit === 'week'
                              ? 'À la semaine'
                              : 'Mensuel'}
                        </Text>
                      </View>
                      <Text style={styles.price}>
                        {formatPrice(module.price)}
                        {unitSuffix[module.unit]}
                      </Text>
                    </View>

                    {isActive ? (
                      <View style={styles.activeRow}>
                        <Check size={16} color={dark.green} />
                        <Text style={styles.activeText}>Accès actif</Text>
                      </View>
                    ) : (
                      <>
                        {showsQuantity ? (
                          <View style={styles.quantityField}>
                            <Text style={styles.fieldLabel}>
                              {module.unit === 'hour' ? 'Nombre d’heures' : 'Nombre de semaines'}
                            </Text>
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
                        <Text style={styles.totalText}>
                          Total : {formatPrice(module.price * (showsQuantity ? quantity : 1))}
                        </Text>

                        <Bouncy onPress={() => void buyWithFedaPay(module)} scaleTo={0.97} disabled={isBusy}>
                          <LinearGradient
                            colors={gradients.green}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.subscribeButton}
                          >
                            <Text style={styles.subscribeText}>
                              {isBusy ? 'Ouverture Mobile Money…' : 'Payer en ligne (Mobile Money)'}
                            </Text>
                          </LinearGradient>
                        </Bouncy>

                        {manualFormFor === module.key ? (
                          <View style={styles.manualForm}>
                            <Text style={styles.fieldLabel}>Référence de paiement</Text>
                            <TextInput
                              style={styles.input}
                              value={declaredReference}
                              onChangeText={setDeclaredReference}
                              placeholder="Référence Mobile Money, reçu…"
                              placeholderTextColor={dark.textMuted}
                            />
                            <Text style={styles.fieldLabel}>Note (facultatif)</Text>
                            <TextInput
                              style={[styles.input, styles.textarea]}
                              value={declareNote}
                              onChangeText={setDeclareNote}
                              placeholder="Précise le mode de paiement utilisé"
                              placeholderTextColor={dark.textMuted}
                              multiline
                              numberOfLines={2}
                            />
                            <View style={styles.manualActions}>
                              <Pressable
                                style={({ pressed }) => [styles.primaryOutlineBtn, pressed && styles.pressed]}
                                disabled={isBusy}
                                onPress={() => void submitManualDeclaration(module)}
                              >
                                <Text style={styles.primaryOutlineBtnText}>
                                  {isBusy ? 'Envoi…' : 'Envoyer'}
                                </Text>
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                                onPress={() => setManualFormFor(null)}
                              >
                                <Text style={styles.outlineText}>Annuler</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                            onPress={() => openManualForm(module.key)}
                          >
                            <Text style={styles.outlineText}>J’ai déjà payé autrement</Text>
                          </Pressable>
                        )}
                      </>
                    )}
                  </View>
                )
              })}
            </View>

            {!modules.some((m) => me?.access[m.key]) && !(me && me.user.soldeHeures > 0) ? (
              <View style={styles.statusCardOutline}>
                <Lock size={26} color={dark.textMuted} />
                <Text style={styles.statusCopy}>
                  Achète un accès ci-dessus pour débloquer le code, la conduite ou l’E-Codepermis.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
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
  success: { color: dark.green, marginBottom: 12, fontFamily: fonts.body },
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
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeText: { color: dark.green, fontFamily: fonts.bodyBold, fontSize: 14 },
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
  textarea: { minHeight: 64, textAlignVertical: 'top' },
  totalText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14 },
  subscribeButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 15 },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  outlineText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14 },
  primaryOutlineBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.green,
    backgroundColor: 'rgba(0,176,80,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryOutlineBtnText: { color: dark.green, fontFamily: fonts.displayBold, fontSize: 14 },
  manualForm: { gap: 8 },
  manualActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pressed: { opacity: 0.85 },
})
