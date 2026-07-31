import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useFonts } from './src/hooks/useFonts'
import { RootNavigator } from './src/navigation/RootNavigator'
import { brand } from './src/theme'
import { ensureAudioSession } from './src/utils/audioSession'

const BOOT_BG = '#FAF9F6'

export default function App() {
  const [fontsLoaded] = useFonts()

  useEffect(() => {
    void ensureAudioSession()
  }, [])

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.green} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <RootNavigator />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BOOT_BG,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_BG,
  },
})
