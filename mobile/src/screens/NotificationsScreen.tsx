import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  CreditCard,
  Megaphone,
  TriangleAlert,
} from 'lucide-react-native'
import type { ComponentType } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications'
import { Bouncy } from '../components/Bouncy'
import { DarkHeader, DarkScreen } from '../components/DarkScreen'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>
type IconProps = { size?: number; color?: string }

const iconFor: Record<string, ComponentType<IconProps>> = {
  subscription_activated: CreditCard,
  subscription_pending: CreditCard,
  subscription_expiring: TriangleAlert,
  payment_validated: CreditCard,
  reservation_confirmed: CalendarCheck,
  reservation_cancelled: TriangleAlert,
  announcement: Megaphone,
  general: Bell,
}

const linkToRoute: Record<string, keyof RootStackParamList> = {
  abonnement: 'Abonnement',
  conduite: 'Conduite',
  notifications: 'Notifications',
  profil: 'Profile',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [items, setItems] = useState<AppNotification[]>([])
  const [fetching, setFetching] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { notifications } = await fetchNotifications()
      setItems(notifications)
    } catch {
      setItems([])
    } finally {
      setFetching(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const handleTap = async (notification: AppNotification) => {
    if (!notification.read) {
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )
      void markNotificationRead(notification.id).catch(() => undefined)
    }
    const route = linkToRoute[notification.link]
    if (route && route !== 'Notifications') {
      navigation.navigate(route as never)
    }
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    void markAllNotificationsRead().catch(() => undefined)
  }

  if (loading || !user) return <ScreenLoader />

  const hasUnread = items.some((n) => !n.read)

  return (
    <DarkScreen>
      <DarkHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        icon={Bell}
        right={
          hasUnread ? (
            <Pressable onPress={handleMarkAll} hitSlop={10} accessibilityLabel="Tout marquer comme lu">
              <CheckCheck size={20} color={dark.green} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
            tintColor={dark.green}
          />
        }
      >
        {fetching ? (
          <Text style={styles.stateText}>Chargement…</Text>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Bell size={30} color={dark.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyCopy}>
              Tu seras prévenu ici dès qu’un paiement est validé, une leçon confirmée ou une
              annonce publiée.
            </Text>
          </View>
        ) : (
          items.map((n) => {
            const Icon = iconFor[n.type] ?? Bell
            return (
              <Bouncy key={n.id} scaleTo={0.98} onPress={() => handleTap(n)}>
                <View style={[styles.card, !n.read && styles.cardUnread]}>
                  <View style={[styles.iconWrap, !n.read && styles.iconWrapUnread]}>
                    <Icon size={18} color={!n.read ? dark.green : dark.textMuted} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{n.title}</Text>
                    {n.body ? <Text style={styles.cardText}>{n.body}</Text> : null}
                    <Text style={styles.cardTime}>{timeAgo(n.createdAt)}</Text>
                  </View>
                  {!n.read ? <View style={styles.dot} /> : null}
                </View>
              </Bouncy>
            )
          })
        )}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  stateText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  emptyCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 18,
    padding: 15,
  },
  cardUnread: {
    borderColor: 'rgba(34,214,115,0.28)',
    backgroundColor: dark.surfaceRaised,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    flexShrink: 0,
  },
  iconWrapUnread: {
    backgroundColor: dark.greenSoft,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginBottom: 3,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: dark.textMuted,
    marginBottom: 6,
  },
  cardTime: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: dark.textMuted,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: dark.green,
    marginTop: 4,
    flexShrink: 0,
  },
})
