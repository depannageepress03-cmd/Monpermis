import { LinearGradient } from 'expo-linear-gradient'
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { brand, colors, spacing } from '../theme'

interface AppScreenLayoutProps extends ViewProps {
  header?: React.ReactNode
  scrollable?: boolean
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}

export function AppScreenLayout({
  children,
  header,
  scrollable = false,
  edges = ['top', 'bottom'],
  style,
  ...props
}: AppScreenLayoutProps) {
  const body = scrollable ? (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  )

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0f1729', '#1a2d47', '#1e3a5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={[styles.container, style]} {...props}>
          {header}
          {body}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.navy,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
})
