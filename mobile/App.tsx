import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useFonts } from './src/hooks/useFonts'
import { RootNavigator } from './src/navigation/RootNavigator'
import { brand } from './src/theme'

export default function App() {
  const [fontsLoaded] = useFonts()

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.green} />
      </View>
    )
  }

  return <RootNavigator />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
})
