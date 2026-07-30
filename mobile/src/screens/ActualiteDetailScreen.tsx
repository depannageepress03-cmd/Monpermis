import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import { ExternalLink, Megaphone } from 'lucide-react-native'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import RenderHTML from 'react-native-render-html'
import {
  announcementLooksLikeHtml,
  fetchAnnouncement,
  stripAnnouncementHtml,
  type Announcement,
} from '../api/announcements'
import { DarkHeader, DarkScreen } from '../components/DarkScreen'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { safeHtmlTagsStyles, sanitizeCmsHtml } from '../utils/safeHtml'
import { safeOpenUrl } from '../utils/safeOpenUrl'

type Props = NativeStackScreenProps<RootStackParamList, 'ActualiteDetail'>
type Nav = NativeStackNavigationProp<RootStackParamList, 'ActualiteDetail'>

export function ActualiteDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Props['route']>()
  const { user, loading } = useRequireAuth(navigation)
  const { width } = useWindowDimensions()
  const [item, setItem] = useState<Announcement | null>(null)
  const [fetching, setFetching] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchAnnouncement(route.params.id)
      setItem(data)
    } catch {
      setItem(null)
    } finally {
      setFetching(false)
    }
  }, [route.params.id])

  useFocusEffect(
    useCallback(() => {
      setFetching(true)
      void load()
    }, [load]),
  )

  if (loading || !user) return <ScreenLoader />

  const isHtml = item ? announcementLooksLikeHtml(item.body) : false
  const plain = item
    ? isHtml
      ? stripAnnouncementHtml(item.body)
      : item.body
    : ''
  const image = item ? resolveMediaUrl(item.imageUrl) : undefined

  const openCta = () => {
    if (!item?.ctaUrl) return
    if (item.ctaUrl.startsWith('/')) {
      // Chemins app connus
      if (item.ctaUrl.startsWith('/abonnement')) navigation.navigate('Abonnement')
      else if (item.ctaUrl.startsWith('/conduite')) navigation.navigate('Conduite')
      else if (item.ctaUrl.startsWith('/profil')) navigation.navigate('Profile')
      else navigation.navigate('Home')
      return
    }
    void safeOpenUrl(item.ctaUrl)
  }

  return (
    <DarkScreen>
      <DarkHeader
        title="Actualité"
        onBack={() => navigation.goBack()}
        icon={Megaphone}
      />
      {fetching ? (
        <ScreenLoader />
      ) : !item ? (
        <View style={styles.empty}>
          <Megaphone size={28} color={dark.textMuted} />
          <Text style={styles.emptyTitle}>Annonce introuvable</Text>
          <Text style={styles.emptyText}>
            Elle a peut-être été retirée ou n’est plus disponible pour ton compte.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View
            style={[
              styles.card,
              item.kind === 'promo'
                ? styles.cardPromo
                : item.kind === 'alerte'
                  ? styles.cardAlert
                  : styles.cardInfo,
            ]}
          >
            <Text style={styles.kind}>
              {item.kind === 'promo' ? 'Promo' : item.kind === 'alerte' ? 'Alerte' : 'Info'}
            </Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
            {item.body ? (
              isHtml ? (
                <RenderHTML
                  contentWidth={width - 64}
                  source={{ html: sanitizeCmsHtml(item.body) }}
                  baseStyle={styles.htmlBase}
                  tagsStyles={safeHtmlTagsStyles}
                />
              ) : (
                <Text style={styles.body}>{plain}</Text>
              )
            ) : null}
            {item.ctaUrl ? (
              <Pressable style={styles.cta} onPress={openCta}>
                <Text style={styles.ctaText}>En savoir plus</Text>
                <ExternalLink size={14} color="#0B0F1A" />
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
  },
  cardInfo: { borderLeftColor: dark.green },
  cardPromo: { borderLeftColor: dark.coral },
  cardAlert: { borderLeftColor: '#FFC000' },
  kind: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: dark.green,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: dark.surfaceRaised,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textPrimary,
  },
  htmlBase: {
    fontSize: 15,
    lineHeight: 22,
    color: dark.textPrimary,
  },
  htmlP: { marginTop: 0, marginBottom: 10 },
  htmlH: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  htmlStrong: { fontFamily: fonts.bodyBold },
  htmlEm: { fontStyle: 'italic' },
  htmlA: { color: dark.green },
  htmlList: { marginBottom: 8 },
  htmlLi: { marginBottom: 4 },
  cta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: dark.green,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#0B0F1A',
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
