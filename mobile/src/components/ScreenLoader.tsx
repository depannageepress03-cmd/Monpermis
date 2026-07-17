import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { dark } from '../theme'

export function ScreenLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={dark.green} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.bg,
  },
})
