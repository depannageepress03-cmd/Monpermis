import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, componentStyles, textStyles } from '../theme/tokens';

/* LogoTile 46 px : tuile blanche, logo recadré ~135 %, overflow hidden. */
export function LogoTile({ size = 'sm', style }: { size?: 'sm' | 'lg'; style?: StyleProp<ViewStyle> }) {
  const large = size === 'lg';
  return (
    <View style={[large ? componentStyles.logoTileLg : componentStyles.logoTile, style]} accessibilityRole="image" accessibilityLabel="Monpermis.bj">
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: large ? 265 : 62, height: large ? 265 : 62 }}
        resizeMode="cover"
      />
    </View>
  );
}

export type IconButtonVariant = 'default' | 'bell';

export function IconButton({
  children,
  badge,
  variant = 'default',
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  badge?: number;
  variant?: IconButtonVariant;
  onPress?: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [componentStyles.iconBtn, pressed && { opacity: 0.85 }, style]}
    >
      {children}
      {variant === 'bell' && badge !== undefined && badge > 0 ? <View style={componentStyles.bellBadge} /> : null}
    </Pressable>
  );
}

export type AppButtonVariant = 'primary' | 'accent' | 'outline' | 'google' | 'slider';

const buttonSkins: Record<AppButtonVariant, object> = {
  primary: componentStyles.buttonPrimary,
  accent: componentStyles.buttonAccent,
  outline: componentStyles.buttonOutline,
  google: componentStyles.buttonGoogle,
  slider: componentStyles.buttonSlider,
};

const buttonText: Record<AppButtonVariant, TextStyle> = {
  primary: { ...textStyles.loginSubmit, fontSize: 16 },
  accent: { ...textStyles.loginSubmit, fontSize: 16, color: colors.navy },
  outline: { ...textStyles.loginSubmit, fontSize: 15, color: colors.navy },
  google: { ...textStyles.loginSubmit, fontSize: 15, color: colors.navy },
  slider: { ...textStyles.loginSubmit, fontSize: 16, color: colors.navy },
};

export function AppButton({
  variant = 'primary',
  title,
  onPress,
  disabled,
  loading,
  left,
  right,
  accessibilityLabel,
  style,
}: {
  variant?: AppButtonVariant;
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => [buttonSkins[variant], pressed && !off && { opacity: 0.92 }, off && { opacity: 0.65 }, style]}
    >
      {variant === 'google' ? (
        <View style={styles.googleG}>
          <Text style={styles.googleGText}>G</Text>
        </View>
      ) : null}
      {left}
      <Text style={[buttonText[variant], styles.btnText]}>{loading ? '…' : title}</Text>
      {right}
    </Pressable>
  );
}

export type ChipVariant = 'green' | 'yellow' | 'navy' | 'glass' | 'wrong' | 'default';

const chipSkin: Record<ChipVariant, { bg: string; fg: string; border?: string }> = {
  green: { bg: colors.greenTint, fg: colors.greenDark },
  yellow: { bg: colors.yellowTint, fg: colors.yellowInk },
  navy: { bg: colors.navyTint, fg: colors.navy },
  glass: { bg: 'rgba(255,255,255,0.10)', fg: '#FFFFFF', border: 'rgba(255,255,255,0.18)' },
  wrong: { bg: colors.wrongBg, fg: colors.wrong },
  default: { bg: colors.navyTint, fg: colors.navy },
};

export function Chip({
  variant = 'default',
  small,
  children,
  style,
}: {
  variant?: ChipVariant;
  small?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const skin = chipSkin[variant];
  return (
    <View
      style={[
        styles.chip,
        small && styles.chipSm,
        { backgroundColor: skin.bg, borderColor: skin.border ?? 'transparent', borderWidth: skin.border ? 1 : 0 },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[small ? textStyles.chipSm : textStyles.chip, { color: skin.fg }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function AppTextField({
  label,
  error,
  hint,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  prefix,
  left,
  right,
  onRightPress,
  rightAccessibilityLabel,
  style,
}: {
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  prefix?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, style]}>
      {label ? <Text style={textStyles.loginFormLabel}>{label}</Text> : null}
      <View
        style={[
          componentStyles.textField,
          focused && !error && componentStyles.textFieldFocus,
          error && { borderColor: colors.wrong },
        ]}
      >
        {prefix ? <View style={componentStyles.textFieldPrefix}>{prefix}</View> : null}
        {left}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[textStyles.input, styles.input]}
          accessibilityLabel={label}
        />
        {right ? (
          <Pressable
            onPress={onRightPress}
            accessibilityRole="button"
            accessibilityLabel={rightAccessibilityLabel ?? 'Afficher'}
            style={styles.eyeBtn}
          >
            {right}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[componentStyles.segmentedControl, style]} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            style={[componentStyles.segmentedBtn, active && componentStyles.segmentedBtnActive]}
          >
            <Text style={[textStyles.loginPortalTab, active && textStyles.loginPortalTabActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipSm: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  btnText: {
    textAlign: 'center',
  },
  googleG: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.fieldPrefix,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 14,
    color: colors.navy,
  },
  fieldWrap: {
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldError: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.wrong,
  },
  fieldHint: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
  },
});
