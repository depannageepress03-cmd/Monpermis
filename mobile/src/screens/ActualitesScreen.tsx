import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronRight, Megaphone } from 'lucide-react-native'
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  fetchAnnouncements,
  stripAnnouncementHtml,
  announcementLooksLikeHtml,
  type Announcement,
} from '../api/announcements'
import { DarkHeader, DarkScreen } from '../components/DarkScreen'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { resolveMediaUrl } from '../utils/mediaUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Actualites'>

const KIND_LABEL: Record<Announcement['kind'], string> = {
  info: 'Info',
  promo: 'Promo',
  alerte: 'Alerte',
}

function NewsCard({
  item,
  onPress,
}: {
  item: Announcement
  onPress: () => void
}) {
  const plain = announcementLooksLikeHtml(item.body)
    ? stripAnnouncementHtml(item.body)
    : item.body
  const image = resolveMediaUrl(item.imageUrl)

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View
        style={[
          styles.accent,
          item.kind === 'alerte'
            ? styles.accentAlert
            : item.kind === 'promo'
              ? styles.accentPromo
              : styles.accentInfo,
        ]}
      />
      <View style={styles.body}>
        <Text style={styles.kind}>{KIND_LABEL[item.kind]}</Text>
        {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
        <Text style={styles.title}>{item.title}</Text>
        {plain ? (
          <Text style={styles.text} numberOfLines={3}>
            {plain}
          </Text>
        ) : null}
        <View style={styles.moreRow}>
          <Text style={styles.more}>Lire</Text>
          <ChevronRight size={14} color={dark.green} />
        </View>
      </View>
    </Pressable>
  )
}

export function ActualitesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [items, setItems] = useState<Announcement[]>([])
  const [fetching, setFetching] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await fetchAnnouncements(50)
      setItems(list)
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

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <DarkHeader title="Actualités" onBack={() => navigation.goBack()} icon={Megaphone} />
      {fetching ? (
        <ScreenLoader />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
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
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Megaphone size={28} color={dark.textMuted} />
              <Text style={styles.emptyTitle}>Aucune actualité</Text>
              <Text style={styles.emptyText}>
                Les annonces de Monpermis apparaîtront ici dès qu’elles seront publiées.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onPress={() => navigation.navigate('ActualiteDetail', { id: item.id })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  accentInfo: { backgroundColor: dark.green },
  accentPromo: { backgroundColor: dark.coral },
  accentAlert: { backgroundColor: '#FFC000' },
  body: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  kind: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: dark.green,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: dark.surfaceRaised,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginBottom: 4,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  more: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    textAlign: 'center',
  },
})
