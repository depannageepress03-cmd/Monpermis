import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronLeft, ChevronRight, Pause, Play, TriangleAlert } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FadeUp } from '../../components/FadeUp'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import {
  getPanneauCategory,
  PANNEAUX_CATEGORIES,
  type PanneauSign,
} from '../../data/codeRoute/panneauxCatalog'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, radii, shadows } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import {
  resolvePanneauAudioUrl,
  speakPanneau,
  stopPanneauSpeech,
} from '../../utils/panneauSpeech'

type ListNav = NativeStackNavigationProp<RootStackParamList, 'RevisionPanneaux'>
type CatNav = NativeStackNavigationProp<RootStackParamList, 'RevisionPanneauxCategory'>
type CatRoute = RouteProp<RootStackParamList, 'RevisionPanneauxCategory'>

export function RevisionPanneauxScreen() {
  const navigation = useNavigation<ListNav>()
  const { user, loading } = useRequireAuth(navigation)
  const total = useMemo(
    () => PANNEAUX_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0),
    [],
  )

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => {
        stopPanneauSpeech()
      }
    }, []),
  )

  if (loading || !user) return null

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={styles.topBarTitleWrap}>
            <TriangleAlert size={18} color={dark.green} />
            <Text style={styles.topBarTitle}>Révision panneaux</Text>
          </View>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeUp>
            <Text style={styles.kicker}>Signalisation</Text>
            <Text style={styles.title}>Révision des panneaux</Text>
            <Text style={styles.subtitle}>
              {total} panneaux · {PANNEAUX_CATEGORIES.length} catégories
            </Text>
          </FadeUp>

          <FadeUp delay={80}>
            <View style={styles.hero}>
              <Image
                source={require('../../../assets/code-route/cards/panneaux.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
          </FadeUp>

          <FadeUp delay={120}>
            <View style={styles.list}>
              {PANNEAUX_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() =>
                    navigation.navigate('RevisionPanneauxCategory', {
                      categoryId: cat.id,
                      categoryLabel: cat.label,
                    })
                  }
                >
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>{cat.codePrefix}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{cat.label}</Text>
                    <Text style={styles.rowMeta}>
                      {cat.count} {cat.count > 1 ? 'panneaux' : 'panneau'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={dark.textMuted} />
                </Pressable>
              ))}
            </View>
          </FadeUp>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

export function RevisionPanneauxCategoryScreen() {
  const navigation = useNavigation<CatNav>()
  const route = useRoute<CatRoute>()
  const { user, loading } = useRequireAuth(navigation)
  const category = getPanneauCategory(route.params.categoryId)
  const [playingCode, setPlayingCode] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => {
        stopPanneauSpeech()
        setPlayingCode(null)
      }
    }, []),
  )

  if (loading || !user) return null

  if (!category) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} color={dark.textPrimary} />
            </Pressable>
            <Text style={styles.topBarTitle}>Introuvable</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const togglePlay = (sign: PanneauSign) => {
    const def =
      sign.definition && sign.definition !== sign.code
        ? sign.definition
        : 'Définition à compléter pour ce panneau.'
    if (playingCode === sign.code) {
      stopPanneauSpeech()
      setPlayingCode(null)
      return
    }
    setPlayingCode(sign.code)
    void speakPanneau(
      {
        code: sign.code,
        definition: def,
        audioUrl: resolvePanneauAudioUrl(sign.audio),
      },
      () => setPlayingCode((c) => (c === sign.code ? null : c)),
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              stopPanneauSpeech()
              navigation.goBack()
            }}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {category.label}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <FlatList
          data={category.signs}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.cards}
          ListHeaderComponent={
            <View style={styles.catHeader}>
              <Text style={styles.kicker}>Code {category.codePrefix}</Text>
              <Text style={styles.subtitle}>
                {category.count} panneaux — lis la définition ou écoute-la
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const uri = resolveMediaUrl(item.image)
            const def =
              item.definition && item.definition !== item.code
                ? item.definition
                : 'Définition à compléter pour ce panneau.'
            const playing = playingCode === item.code
            return (
              <View style={styles.card}>
                <View style={styles.media}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.cardImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.cardImage} />
                  )}
                  <Pressable
                    style={[styles.playBtn, playing && styles.playBtnActive]}
                    onPress={() => togglePlay(item)}
                    accessibilityRole="button"
                    accessibilityLabel={playing ? `Arrêter ${item.code}` : `Écouter ${item.code}`}
                  >
                    {playing ? (
                      <Pause size={14} color="#FFFFFF" />
                    ) : (
                      <Play size={14} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardCode}>{item.code}</Text>
                  <Text style={styles.cardDef}>{def}</Text>
                </View>
              </View>
            )
          }}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  backBtnPlaceholder: { width: 40 },
  topBarTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: dark.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.green,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    marginBottom: 14,
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 14,
    ...shadows.sm,
  },
  heroImage: { width: '100%', height: 140 },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,16,48,0.08)',
  },
  pressed: { opacity: 0.85 },
  prefix: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(2,132,199,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#0284c7',
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: dark.textPrimary,
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
    marginTop: 2,
  },
  catHeader: { paddingHorizontal: 4, marginBottom: 4 },
  cards: { paddingHorizontal: 12, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    ...shadows.sm,
  },
  media: {
    width: 104,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: { width: 80, height: 70 },
  playBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: '#0F172A' },
  cardBody: { flex: 1, minWidth: 0 },
  cardCode: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0284C7',
    marginBottom: 4,
  },
  cardDef: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: dark.textPrimary,
  },
})
