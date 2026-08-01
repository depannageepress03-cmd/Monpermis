import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCheck,
  ChevronLeft,
  CreditCard,
  Megaphone,
  MessageCircle,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native'
import type { ComponentType } from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications'
import { Bouncy } from '../components/Bouncy'
import { FadeUp } from '../components/FadeUp'
import { LegalFooter } from '../components/LegalFooter'
import { ScreenLoader } from '../components/ScreenLoader'
import { SkeletonList } from '../components/Skeleton'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { brand, dark, fonts, shadows } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>
type IconProps = { size?: number; color?: string }
type TabKey = 'all' | 'unread'

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
  actualites: 'Actualites',
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
  const [tab, setTab] = useState<TabKey>('all')

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
      setStatusBarStyle('dark')
      void load()
      return () => setStatusBarStyle('dark')
    }, [load]),
  )

  const handleTap = async (notification: AppNotification) => {
    if (!notification.read) {
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )
      void markNotificationRead(notification.id).catch(() => undefined)
    }
    const link = notification.link || ''
    if (link.startsWith('actualites/')) {
      const id = link.slice('actualites/'.length)
      if (id) {
        navigation.navigate('ActualiteDetail', { id })
        return
      }
      navigation.navigate('Actualites')
      return
    }
    if (link === 'actualites') {
      navigation.navigate('Actualites')
      return
    }
    const route = linkToRoute[link]
    if (route && route !== 'Notifications') {
      navigation.navigate(route as never)
    }
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    void markAllNotificationsRead().catch(() => undefined)
  }

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])
  const hasUnread = unreadCount > 0
  const visibleItems = useMemo(
    () => (tab === 'unread' ? items.filter((n) => !n.read) : items),
    [items, tab],
  )

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <Bell size={15} color={dark.green} />
            </View>
            <Text style={styles.topBarTitle}>Notifications</Text>
          </View>
          {hasUnread ? (
            <Pressable
              style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
              onPress={() => void handleMarkAll()}
              accessibilityLabel="Tout marquer comme lu"
              hitSlop={8}
            >
              <CheckCheck size={20} color={dark.green} />
            </Pressable>
          ) : (
            <View style={styles.roundBtnPlaceholder} />
          )}
        </View>

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
          {!fetching && items.length > 0 ? (
            <FadeUp delay={40}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Bell size={16} color={dark.green} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryTitle}>
                    {unreadCount > 0
                      ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                      : 'Tout est à jour'}
                  </Text>
                  <Text style={styles.summarySub}>
                    {items.length} notification{items.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </FadeUp>
          ) : null}

          {!fetching && items.length > 0 ? (
            <FadeUp delay={70}>
              <View style={styles.tabs}>
                <Pressable
                  style={styles.tab}
                  onPress={() => setTab('all')}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === 'all' }}
                >
                  <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
                    Toutes
                  </Text>
                  {tab === 'all' ? <View style={styles.tabUnderline} /> : null}
                </Pressable>
                <Pressable
                  style={styles.tab}
                  onPress={() => setTab('unread')}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === 'unread' }}
                >
                  <Text style={[styles.tabText, tab === 'unread' && styles.tabTextActive]}>
                    Non lues{hasUnread ? ` (${unreadCount})` : ''}
                  </Text>
                  {tab === 'unread' ? <View style={styles.tabUnderline} /> : null}
                </Pressable>
              </View>
            </FadeUp>
          ) : null}

          {fetching ? <SkeletonList count={4} /> : null}

          {!fetching && items.length === 0 ? (
            <FadeUp delay={60}>
              <View style={styles.empty}>
                <View style={styles.emptyArt}>
                  <View style={styles.emptySparkleTL} />
                  <View style={styles.emptySparkleBR} />
                  <View style={styles.emptyBubble}>
                    <MessageCircle size={12} color={dark.green} />
                  </View>
                  <View style={styles.emptyBell}>
                    <Bell size={36} color={dark.green} />
                  </View>
                </View>
                <Text style={styles.emptyTitle}>Aucune notification</Text>
                <Text style={styles.emptyCopy}>
                  Tu seras prévenu ici dès qu’un paiement est validé, une leçon confirmée ou une
                  annonce publiée.
                </Text>

                <View style={styles.infoBundle}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Wallet size={18} color={dark.green} />
                    </View>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoTitle}>Paiement validé</Text>
                      <Text style={styles.infoText}>
                        Confirmation dès qu’un paiement est accepté.
                      </Text>
                    </View>
                    <View style={styles.infoCheck}>
                      <Check size={14} color={dark.green} strokeWidth={3} />
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <BookOpen size={18} color={dark.green} />
                    </View>
                    <View style={styles.infoCopy}>
                      <Text style={styles.infoTitle}>Leçon confirmée</Text>
                      <Text style={styles.infoText}>
                        Alerte quand une séance est confirmée.
                      </Text>
                    </View>
                    <View style={styles.infoCheck}>
                      <Check size={14} color={dark.green} strokeWidth={3} />
                    </View>
                  </View>
                </View>

                <View style={styles.stayCard}>
                  <View style={styles.stayIcon}>
                    <Bell size={18} color={dark.green} />
                  </View>
                  <View style={styles.stayCopy}>
                    <Text style={styles.stayTitle}>Reste informé</Text>
                    <Text style={styles.stayText}>
                      Paiements, réservations, rappels et annonces apparaissent ici.
                    </Text>
                  </View>
                </View>
              </View>
            </FadeUp>
          ) : null}

          {!fetching && items.length > 0 && visibleItems.length === 0 ? (
            <FadeUp delay={80}>
              <View style={styles.filterEmpty}>
                <Text style={styles.filterEmptyTitle}>Aucune notification non lue</Text>
                <Text style={styles.filterEmptyCopy}>
                  Toutes tes notifications ont déjà été consultées.
                </Text>
              </View>
            </FadeUp>
          ) : null}

          {!fetching
            ? visibleItems.map((n, index) => {
                const Icon = iconFor[n.type] ?? Bell
                return (
                  <FadeUp key={n.id} delay={90 + index * 40}>
                    <Bouncy scaleTo={0.98} onPress={() => void handleTap(n)}>
                      <View style={[styles.card, !n.read && styles.cardUnread]}>
                        {!n.read ? <View style={styles.cardAccent} /> : null}
                        <View style={[styles.iconWrap, !n.read && styles.iconWrapUnread]}>
                          <Icon size={18} color={!n.read ? dark.green : dark.textMuted} />
                        </View>
                        <View style={styles.cardBody}>
                          <Text style={[styles.cardTitle, n.read && styles.cardTitleRead]}>
                            {n.title}
                          </Text>
                          {n.body ? (
                            <Text style={styles.cardText} numberOfLines={3}>
                              {n.body}
                            </Text>
                          ) : null}
                          <Text style={styles.cardTime}>{timeAgo(n.createdAt)}</Text>
                        </View>
                        {!n.read ? <View style={styles.dot} /> : null}
                      </View>
                    </Bouncy>
                  </FadeUp>
                )
              })
            : null}

          <LegalFooter />
        </ScrollView>
      </SafeAreaView>
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
  roundBtnPlaceholder: {
    width: 44,
    height: 44,
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
    gap: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...shadows.sm,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  summaryTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  summarySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,16,48,0.08)',
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textMuted,
  },
  tabTextActive: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
  },
  tabUnderline: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
  },
  emptyArt: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyBell: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  emptyBubble: {
    position: 'absolute',
    top: 10,
    right: 22,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  emptySparkleTL: {
    position: 'absolute',
    top: 28,
    left: 18,
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(0,176,80,0.35)',
    transform: [{ rotate: '20deg' }],
  },
  emptySparkleBR: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(0,176,80,0.25)',
    transform: [{ rotate: '-15deg' }],
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: dark.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  infoBundle: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
  },
  infoCheck: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,16,48,0.08)',
    marginVertical: 14,
  },
  stayCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: brand.greenPale,
    borderRadius: 24,
    padding: 18,
  },
  stayIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stayCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stayTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  stayText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  filterEmpty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 12,
  },
  filterEmptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  filterEmptyCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardUnread: {
    backgroundColor: brand.greenPale,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: dark.green,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
  },
  iconWrapUnread: {
    backgroundColor: '#FFFFFF',
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
  cardTitleRead: {
    fontFamily: fonts.bodySemiBold,
    color: dark.textMuted,
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
  pressed: {
    opacity: 0.88,
  },
})
