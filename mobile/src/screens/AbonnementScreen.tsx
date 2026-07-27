import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { Check, Clock, CreditCard, History, Lock, RefreshCw } from 'lucide-react-native'
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
import { fetchSubscriptionMe, SubscriptionError, type SubscriptionAccess } from '../api/subscriptions'
import { Bouncy } from '../components/Bouncy'
import { DarkScreen } from '../components/DarkScreen'
import { PageNavbar } from '../components/PageNavbar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Abonnement'>

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value)) : '—'
}

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

const statusLabels: Record<string, string> = {
  en_attente: 'En attente',
  paiement_declare: 'Paiement déclaré, en vérification',
  en_verification: 'Paiement en cours de confirmation',
  valide: 'Validé',
  actif: 'Actif',
  expire: 'Expiré',
  rejete: 'Rejeté',
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

const legacyFlagByModule: Partial<Record<AccessModuleKey, keyof SubscriptionAccess>> = {
  code: 'accessCode',
  conduite_videos: 'accessConduite',
  ecodepermis: 'accessECodepermis',
  aiChat: 'accessAiChat',
}

export function AbonnementScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)

  const [legacyAccess, setLegacyAccess] = useState<SubscriptionAccess | null>(null)
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

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [legacy, moduleCatalog, meResult] = await Promise.all([
        fetchSubscriptionMe().catch(() => null),
        fetchAccessModules(),
        fetchAccessMe(),
      ])
      setLegacyAccess(legacy)
      setModules(moduleCatalog)
      setMe(meResult)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => () => stopPolling(), [stopPolling])

  const pollPendingRequest = useCallback(
    (id: string) => {
      stopPolling()
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const result = await syncAccessRequest(id)
            setMe(result.access)
            if (result.accessRequest.status !== 'en_verification') {
              stopPolling()
              if (result.accessRequest.status === 'actif' || result.accessRequest.status === 'valide') {
                setSuccess('Paiement confirmé. Ton accès est maintenant actif.')
              } else if (result.accessRequest.status === 'rejete') {
                setError('Le paiement n’a pas abouti. Tu peux réessayer.')
              }
            }
          } catch {
            /* ignore transient poll errors */
          }
        })()
      }, 4000)
    },
    [stopPolling],
  )

  const buyWithFedaPay = async (module: AccessModule) => {
    setBusyModule(module.key)
    setError(null)
    setSuccess(null)
    try {
      const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
      const result = await createAccessRequest({ module: module.key, quantity, method: 'fedapay' })
      if (!result.paymentUrl) {
        setError('Lien de paiement FedaPay indisponible. Réessaie dans un instant.')
        return
      }
      setSuccess('Paiement en cours de traitement. Confirmation Mobile Money en attente…')
      await WebBrowser.openBrowserAsync(result.paymentUrl)
      try {
        const synced = await syncAccessRequest(result.accessRequest.id)
        setMe(synced.access)
        if (synced.accessRequest.status === 'en_verification') {
          pollPendingRequest(result.accessRequest.id)
        } else if (synced.accessRequest.status === 'actif' || synced.accessRequest.status === 'valide') {
          setSuccess('Paiement confirmé. Ton accès est maintenant actif.')
        }
      } catch {
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
      const result = await syncAccessRequest(pending.id)
      setMe(result.access)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Actualisation impossible')
    }
  }

  if (authLoading || !user) return <ScreenLoader />

  const legacyActive = legacyAccess?.subscription

  return (
    <DarkScreen>
      <PageNavbar title="Mon abonnement" icon={CreditCard} onBack={() => navigation.navigate('Home')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Choisis un accès et paie par Mobile Money, ou déclare un paiement hors plateforme.</Text>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={dark.green} />
            <Text style={styles.emptyText}>Chargement…</Text>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            {legacyActive ? (
              <LinearGradient colors={gradients.greenDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statusCard}>
                <Text style={styles.kickerOnColor}>Abonnement actif (ancienne formule)</Text>
                <Text style={styles.statusTitleOnColor}>{legacyActive.planName}</Text>
                <Text style={styles.statusCopyOnColor}>Valable jusqu’au {formatDate(legacyActive.endAt)}.</Text>
              </LinearGradient>
            ) : null}

            {me ? (
              <View style={styles.statusCardOutline}>
                <Text style={styles.kicker}>
                  <Clock size={13} color={dark.green} /> Solde heures de conduite
                </Text>
                <Text style={styles.statusTitle}>{me.user.soldeHeures} h</Text>
                {me.pendingRequest ? (
                  <>
                    <Text style={styles.statusCopy}>
                      Demande « {me.pendingRequest.module} » : {statusLabels[me.pendingRequest.status]}
                    </Text>
                    <Pressable style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]} onPress={() => void refresh()}>
                      <RefreshCw size={16} color={dark.textPrimary} />
                      <Text style={styles.outlineText}>Actualiser le statut</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.catalogTitle}>Nos accès</Text>

            <View style={styles.planList}>
              {modules.map((module) => {
                const legacyFlag = legacyFlagByModule[module.key]
                const isActive = me?.access[module.key] || (legacyFlag ? Boolean(legacyAccess?.[legacyFlag]) : false)
                const showsQuantity = module.unit === 'hour' || module.unit === 'week'
                const quantity = Math.max(1, Number(quantityByModule[module.key]) || 1)
                const isBusy = busyModule === module.key

                return (
                  <View key={module.key} style={styles.plan}>
                    <View style={styles.planHeader}>
                      <View style={styles.planCopy}>
                        <Text style={styles.planName}>{module.label}</Text>
                        <Text style={styles.duration}>
                          {module.unit === 'hour' ? 'À l’heure' : module.unit === 'week' ? 'À la semaine' : 'Mensuel'}
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
                          <LinearGradient colors={gradients.green} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.subscribeButton}>
                            <Text style={styles.subscribeText}>
                              {isBusy ? 'Ouverture du paiement…' : 'Payer par Mobile Money'}
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
                                <Text style={styles.primaryOutlineBtnText}>{isBusy ? 'Envoi…' : 'Envoyer'}</Text>
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

            {!legacyActive && !modules.some((m) => me?.access[m.key]) ? (
              <View style={styles.statusCardOutline}>
                <Lock size={26} color={dark.textMuted} />
                <Text style={styles.statusCopy}>Achète un accès ci-dessus pour débloquer le code, la conduite ou l’E-Codepermis.</Text>
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
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: dark.textMuted, marginBottom: 20 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 44 },
  emptyText: { color: dark.textMuted, fontSize: 15, fontFamily: fonts.body },
  error: { color: dark.coral, marginBottom: 12, fontFamily: fonts.body },
  success: { color: dark.green, marginBottom: 12, fontFamily: fonts.body },
  statusCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  statusCardOutline: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 18,
    marginBottom: 16,
    gap: 6,
  },
  kicker: { fontFamily: fonts.displayBold, fontSize: 12, color: dark.green, textTransform: 'uppercase', letterSpacing: 0.6 },
  kickerOnColor: { fontFamily: fonts.displayBold, fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.6 },
  statusTitle: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: dark.textPrimary, marginTop: 4 },
  statusTitleOnColor: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: '#FFFFFF', marginTop: 4 },
  statusCopy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: dark.textMuted },
  statusCopyOnColor: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.85)' },
  catalogTitle: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: dark.textPrimary, marginBottom: 14 },
  planList: { gap: 14 },
  plan: { borderRadius: 18, borderWidth: 1, borderColor: dark.border, padding: 16, backgroundColor: dark.surface, gap: 10 },
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  price: { color: dark.textPrimary, fontFamily: fonts.displayBold, fontSize: 17 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: dark.green },
  quantityField: { gap: 4 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: dark.textMuted },
  input: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: dark.textPrimary,
    backgroundColor: dark.surfaceRaised,
  },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  totalText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: dark.textMuted },
  subscribeButton: { alignItems: 'center', borderRadius: 12, paddingVertical: 13 },
  subscribeText: { color: '#0B0F1A', fontFamily: fonts.displayBold, fontSize: 15 },
  manualForm: { gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: dark.border, borderStyle: 'dashed' },
  manualActions: { flexDirection: 'row', gap: 10 },
  primaryOutlineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.green,
    paddingVertical: 12,
  },
  primaryOutlineBtnText: { color: dark.green, fontFamily: fonts.bodyBold, fontSize: 14 },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    paddingVertical: 12,
    backgroundColor: dark.surfaceRaised,
  },
  outlineText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14 },
  pressed: { opacity: 0.88 },
})
