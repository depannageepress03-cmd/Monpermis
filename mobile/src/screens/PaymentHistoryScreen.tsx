import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { History } from 'lucide-react-native'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  AccessRequestError,
  fetchAccessMe,
  type AccessMe,
  type AccessRequest,
} from '../api/accessRequests'
import { DarkScreen, DarkHeader } from '../components/DarkScreen'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'HistoriquePaiements'>

const moduleLabels: Record<AccessRequest['module'], string> = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  ecodepermis: 'E-Codepermis',
  aiChat: 'Chat IA',
}

function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
    : '—'
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

function requestStatus(status: AccessRequest['status']) {
  switch (status) {
    case 'actif':
    case 'valide':
      return { label: 'Actif', color: dark.green, soft: dark.greenSoft }
    case 'expire':
      return { label: 'Expiré', color: dark.textMuted, soft: dark.surfaceRaised }
    case 'rejete':
      return { label: 'Rejeté', color: dark.coral, soft: dark.coralSoft }
    default:
      return { label: 'En attente', color: '#F0B429', soft: 'rgba(240,180,41,0.14)' }
  }
}

export function PaymentHistoryScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [access, setAccess] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccess(await fetchAccessMe())
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

  const requests = access?.requests || []

  return (
    <DarkScreen>
      <DarkHeader title="Historique" icon={History} onBack={() => navigation.navigate('Abonnement')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={dark.green} />
            <Text style={styles.centerText}>Chargement de ton historique…</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Mes demandes d’accès</Text>
            {requests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucune demande pour le moment.</Text>
              </View>
            ) : (
              requests.map((req) => {
                const st = requestStatus(req.status)
                return (
                  <View key={req.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {moduleLabels[req.module] || req.module}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: st.soft }]}>
                        <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {formatPrice(req.amount, req.currency)}
                      {req.quantity > 1 ? ` · ×${req.quantity}` : ''}
                    </Text>
                    <Text style={styles.cardMeta}>Demandé le {formatDate(req.createdAt)}</Text>
                    {req.endAt ? (
                      <Text style={styles.cardMeta}>Valable jusqu’au {formatDate(req.endAt)}</Text>
                    ) : null}
                  </View>
                )
              })
            )}
          </>
        )}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  centerText: { fontFamily: fonts.body, color: dark.textMuted },
  error: { fontFamily: fonts.body, color: dark.coral, marginTop: 12 },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 18,
  },
  emptyText: { fontFamily: fonts.body, color: dark.textMuted },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 16, color: dark.textPrimary },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.displayBold, fontSize: 12 },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
})
