import { ChevronLeft } from 'lucide-react-native'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AUTH_HEADER_HEIGHT, AuthDecorBackground } from './AuthDecorBackground'
import { brand, colors } from '../theme'

interface AuthScreenLayoutProps extends ViewProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  showLogo?: boolean
  footer?: React.ReactNode
  scrollable?: boolean
  children: React.ReactNode
}

export function AuthScreenLayout({
  children,
  title,
  showBack,
  onBack,
  showLogo = false,
  footer,
  scrollable = false,
  style,
  ...props
}: AuthScreenLayoutProps) {
  const body = scrollable ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.headerArea}>
        <AuthDecorBackground variant="header" showLogo={showLogo} />
        <SafeAreaView style={styles.headerSafe} edges={['top']}>
          {showBack && onBack ? (
            <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
              <ChevronLeft size={22} color={brand.navy} />
              <Text style={styles.backText}>Retour</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
        </SafeAreaView>
      </View>

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheet, style]} {...props}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.content}>{body}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerArea: {
    height: AUTH_HEADER_HEIGHT,
    position: 'relative',
  },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
  backText: {
    color: brand.navy,
    fontSize: 15,
    fontWeight: '500',
  },
  backSpacer: {
    height: 28,
  },
  safe: {
    flex: 1,
    marginTop: -24,
  },
  flex: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: brand.navy,
    textAlign: 'center',
    marginBottom: 22,
  },
  content: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${brand.navy}10`,
  },
})
