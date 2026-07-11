import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { brand, colors } from '../theme'

interface AuthInputProps extends TextInputProps {
  label: string
  error?: string
}

export function AuthInput({ label, error, secureTextEntry, style, ...props }: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = Boolean(secureTextEntry)

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.wrap, error ? styles.wrapError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.toggle}
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff size={18} color={brand.navyMuted} />
            ) : (
              <Eye size={18} color={brand.navyMuted} />
            )}
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.navy,
    marginLeft: 2,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 14,
    backgroundColor: `${brand.navy}08`,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  wrapError: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: `${colors.error}08`,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: brand.navy,
    paddingVertical: 12,
  },
  toggle: {
    padding: 4,
    marginLeft: 4,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginLeft: 2,
  },
})
