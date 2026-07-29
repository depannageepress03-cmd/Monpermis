import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronLeft, Lock } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchAccessMe, fetchAccessModules, computeModuleAmount, type AccessMe, type AccessModule } from '../api/accessRequests'
import { Bouncy } from '../components/Bouncy'
import { CodeRouteBanner } from '../components/CodeRouteBanner'
import { FadeUp } from '../components/FadeUp'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeRoute'>

const categories = [
  {
    id: 'RevisionChapitres' as const,
    label: 'Révision par chapitres',
    subtitle: '',
    image: require('../../assets/code-route/cards/revision.jpg'),
    tone: 'pink' as const,
  },
  {
    id: 'ExamensTest' as const,
    label: 'Examens test',
    subtitle: '(24 sujets · tous les chapitres)',
    image: require('../../assets/code-route/cards/examens.jpg'),
    tone: 'yellow' as const,
  },
  {
    id: 'MesNotes' as const,
    label: 'Mes notes & avancée',
    subtitle: '',
    image: require('../../assets/code-route/cards/notes.jpg'),
    tone: 'green' as const,
  },
  {
    id: 'ECodePermis' as const,
    label: 'E-Codepermis',
    subtitle: '(examen blanc)',
    image: require('../../assets/code-route/cards/ecodepermis.jpg'),
    tone: 'purple' as const,
    needsECode: true,
  },
]

type Tone = (typeof categories)[number]['tone']


const toneShade: Record<Tone, readonly [string, string, string]> = {
  pink: ['transparent', 'rgba(219,39,119,0.28)', 'rgba(157,23,77,0.92)'],
  yellow: ['transparent', 'rgba(234,88,12,0.28)', 'rgba(154,52,18,0.92)'],
  green: ['transparent', 'rgba(22,163,74,0.28)', 'rgba(21,128,61,0.92)'],
  purple: ['transparent', 'rgba(124,58,237,0.28)', 'rgba(91,33,182,0.92)'],
}

export function CodeRouteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [accessLoading, setAccessLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadAccess = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setAccessLoading(true)
    try {
      const [me, catalog] = await Promise.all([fetchAccessMe(), fetchAccessModules()])
      setAccessMe(me)
      setModules(catalog)
    } catch {
      setAccessMe(null)
      setModules([])
    } finally {
      setAccessLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      void loadAccess(true)
      return () => setStatusBarStyle('dark')
    }, [loadAccess]),
  )

  if (loading || !user) return <ScreenLoader />

  const codeModule = modules.find((m) => m.key === 'code')
  const codePrice = codeModule ? computeModuleAmount('code', codeModule.price, 1) : 2000
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
      amount,
    )

  const header = (
    <View style={styles.topBar}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Home')}
        accessibilityLabel="Retour"
        hitSlop={10}
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.topBarCenter}>
        <CodeModuleIcon size={26} />
        <Text style={styles.topBarTitle}>Code de la route</Text>
      </View>
      <View style={styles.backBtn} />
    </View>
  )

  if (accessLoading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <View style={styles.accessState}>
            <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!accessMe?.access.code) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <View style={styles.accessState}>
            <View style={styles.accessLock}>
              <Lock size={30} color={dark.textMuted} />
            </View>
            <Text style={styles.accessStateTitle}>Souscrire au Code</Text>
            <Text style={styles.accessStateCopy}>
              Forfait {formatPrice(codePrice)} / mois pour débloquer la révision, les sujets
              test et l’examen blanc.
            </Text>
            <Bouncy scaleTo={0.97} onPress={() => setCheckoutOpen(true)}>
              <View style={styles.accessButton}>
                <Text style={styles.accessButtonText}>Payer {formatPrice(codePrice)}</Text>
              </View>
            </Bouncy>
          </View>
          <MobileMoneyCheckout
            visible={checkoutOpen}
            items={[{ module: 'code', quantity: 1 }]}
            modules={modules}
            defaultPhone={user.phone}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(access) => {
              setAccessMe(access)
              setCheckoutOpen(false)
            }}
          />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadAccess(true)
              }}
              tintColor={dark.green}
            />
          }
        >
          <FadeUp delay={60}>
            <View style={styles.accents}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
          </FadeUp>

          <FadeUp delay={120}>
            <CodeRouteBanner />
          </FadeUp>

          <View style={styles.grid}>
            {categories.map((category, index) => {
              const eCodeLocked = Boolean(category.needsECode && !accessMe?.access.ecodepermis)
              return (
                <FadeUp key={category.id} delay={200 + index * 70} style={styles.gridItem}>
                  <Bouncy
                    scaleTo={0.97}
                    onPress={() => {
                      if (eCodeLocked) {
                        navigation.navigate('Abonnement')
                        return
                      }
                      navigation.navigate(category.id)
                    }}
                  >
                    <View style={[styles.card, eCodeLocked && styles.cardLocked]}>
                      <Image source={category.image} style={styles.cardImage} resizeMode="cover" />
                      <LinearGradient
                        colors={[...toneShade[category.tone]]}
                        locations={[0, 0.45, 1]}
                        style={styles.cardShade}
                        pointerEvents="none"
                      />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{category.label}</Text>
                        {category.subtitle ? (
                          <Text style={styles.cardSubtitle}>{category.subtitle}</Text>
                        ) : null}
                        {eCodeLocked ? (
                          <View style={styles.lockRow}>
                            <Lock size={12} color="#fff" />
                            <Text style={styles.cardSubtitle}>Accès E-Codepermis requis</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Bouncy>
                </FadeUp>
              )
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  topBarTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
  },
  accents: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  accent: {
    height: 4,
    borderRadius: 999,
  },
  accentGreen: {
    width: 28,
    backgroundColor: '#00B050',
  },
  accentGold: {
    width: 18,
    backgroundColor: '#FFC000',
  },
  accentNavy: {
    width: 12,
    backgroundColor: '#001030',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47.5%',
    flexGrow: 1,
  },
  card: {
    height: 168,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardShade: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBody: {
    zIndex: 2,
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 28,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    lineHeight: 16,
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    marginTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  lockRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accessState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  accessLock: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    marginBottom: 16,
  },
  accessStateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
  },
  accessButton: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  accessButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#0B0F1A',
  },
  pressed: {
    opacity: 0.85,
  },
})
