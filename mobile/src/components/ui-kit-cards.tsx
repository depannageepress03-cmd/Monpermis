import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors, componentStyles, gradients, textStyles } from '../theme/tokens';

/* Motif « route » du logo, en haut à droite des cartes hero (16–18 % d'opacité). */
export function RouteMotif({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <Svg width={170} height={200} viewBox="0 0 170 200" style={{ position: 'absolute', right: -30, top: -18, opacity }} pointerEvents="none">
      <Path d="M20 200 150 0h24L70 200z" fill="#FFFFFF" />
      <Path d="M130 46l-9 14M110 78l-9 14M90 110l-9 14M70 142l-9 14" stroke="#FFB400" strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

/* Halo radial vert (hero) ou jaune (variante conduite). */
function HeroHalo({ yellow }: { yellow?: boolean }) {
  return (
    <Svg width={340} height={180} viewBox="0 0 340 180" style={{ position: 'absolute', right: -40, top: -30 }} pointerEvents="none">
      <Defs>
        <RadialGradient id={yellow ? 'haloY' : 'haloG'} cx="85%" cy="0%" r="80%">
          <Stop offset="0%" stopColor={yellow ? '#FFB400' : '#0BAA4F'} stopOpacity={yellow ? 0.28 : 0.42} />
          <Stop offset="55%" stopColor={yellow ? '#FFB400' : '#0BAA4F'} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Path d="M0 0H340V180H0Z" fill={yellow ? 'url(#haloY)' : 'url(#haloG)'} />
    </Svg>
  );
}

/* HeroCard 32 px (28 px sur Code/Conduite) : dégradé hero + halo + motif route. */
export function HeroCard({
  variant = 'default',
  children,
  style,
}: {
  variant?: 'default' | 'conduite';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const conduite = variant === 'conduite';
  return (
    <View style={[conduite ? componentStyles.heroCardCodeConduite : componentStyles.heroCard, styles.heroClip, style]}>
      <LinearGradient
        colors={conduite ? gradients.heroConduite : gradients.hero}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <HeroHalo yellow={conduite} />
      <RouteMotif />
      <View style={styles.heroInner}>{children}</View>
    </View>
  );
}

/* GlassAction 76 px : tuile verre (BlurView iOS, repli semi-opaque Android). */
export function GlassAction({
  icon,
  label,
  accent,
  onPress,
  accessibilityLabel,
  style,
}: {
  icon: ReactNode;
  label: string;
  accent?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      {icon}
      <Text style={[textStyles.chipSm, { color: accent ? colors.navy : '#FFFFFF' }]}>{label}</Text>
    </>
  );
  if (accent) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [componentStyles.glassAction, componentStyles.glassActionAccent, pressed && { opacity: 0.92 }, style]}
      >
        {body}
      </Pressable>
    );
  }
  if (Platform.OS === 'android') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [componentStyles.glassAction, { backgroundColor: 'rgba(255,255,255,0.14)' }, pressed && { opacity: 0.9 }, style]}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <BlurView intensity={30} tint="dark" style={[componentStyles.glassAction, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [styles.glassPress, pressed && { opacity: 0.9 }]}
      >
        {body}
      </Pressable>
    </BlurView>
  );
}

/* NotchedCard : onglet 40 px + corps 0/24/24/24. tone light = carte « Cours terminé ». */
export function NotchedCard({
  tabLabel,
  tabColor,
  tone = 'dark',
  tabIcon,
  time,
  date,
  children,
  style,
}: {
  tabLabel: string;
  tabColor: string;
  tone?: 'dark' | 'light';
  tabIcon?: ReactNode;
  time?: string;
  date?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const light = tone === 'light';
  return (
    <View style={style}>
      <View style={styles.notchRow}>
        <View style={[componentStyles.notchedTab, { backgroundColor: tabColor }]}>
          {tabIcon}
          <Text style={[styles.notchTabText, { color: light ? colors.greenInk : '#FFFFFF' }]}>{tabLabel}</Text>
        </View>
        {time || date ? (
          <View style={styles.notchMeta}>
            {time ? <Text style={styles.notchMetaText}>{time}</Text> : null}
            {date ? <Text style={styles.notchMetaText}>{date}</Text> : null}
          </View>
        ) : null}
      </View>
      <View
        style={[
          componentStyles.notchedBody,
          light
            ? { backgroundColor: tabColor }
            : { ...componentStyles.notchedCard, backgroundColor: colors.navy },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export type OptionState = 'default' | 'selected' | 'correct' | 'incorrect';

const optionSkin: Record<OptionState, { bg: string; border: string; fg: string; letterBg: string; letterFg: string }> = {
  default: { bg: '#FFFFFF', border: colors.border, fg: colors.navy, letterBg: colors.fieldPrefix, letterFg: colors.navy },
  selected: { bg: colors.navy, border: colors.navy, fg: '#FFFFFF', letterBg: colors.yellow, letterFg: colors.navy },
  correct: { bg: colors.greenTint, border: colors.green, fg: colors.greenDark, letterBg: colors.green, letterFg: '#FFFFFF' },
  incorrect: { bg: colors.wrongBg, border: colors.wrong, fg: colors.wrong, letterBg: colors.wrong, letterFg: '#FFFFFF' },
};

/* OptionButton QCM : pastille lettre 40 px, hauteur min 58. Libellé d'état toujours affiché. */
export function OptionButton({
  letter,
  state = 'default',
  onPress,
  disabled,
  children,
  style,
}: {
  letter: string;
  state?: OptionState;
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const skin = optionSkin[state];
  const off = disabled || state === 'correct' || state === 'incorrect';
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="radio"
      accessibilityState={{ selected: state === 'selected', disabled: off }}
      style={({ pressed }) => [
        componentStyles.optionBtn,
        { backgroundColor: skin.bg, borderColor: skin.border, borderWidth: state === 'default' || state === 'selected' ? 1.5 : 2 },
        pressed && !off && { opacity: 0.95 },
        style,
      ]}
    >
      <View style={[componentStyles.optionLetter, { backgroundColor: skin.letterBg }]}>
        <Text style={[styles.optionLetterText, { color: skin.letterFg }]}>{letter}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {typeof children === 'string' ? (
          <Text style={[textStyles.body, { color: skin.fg, fontSize: 14.5 }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
      {state === 'correct' ? <Text style={styles.optionVerdict}>✓ Correct</Text> : null}
      {state === 'incorrect' ? <Text style={styles.optionVerdict}>✕ Ta réponse</Text> : null}
    </Pressable>
  );
}

/* PlanCard 76 px : radio + nom Sora 16 + description + prix. Sélection = dégradé hero. */
export function PlanCard({
  name,
  description,
  price,
  popular,
  selected,
  onPress,
  style,
}: {
  name: string;
  description: string;
  price: string;
  popular?: boolean;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      <View style={[componentStyles.planRadio, selected && componentStyles.planRadioSelected]}>
        {selected ? <View style={componentStyles.planRadioDot} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[textStyles.cardTitle, selected && { color: '#FFFFFF' }]}>{name}</Text>
          {popular ? (
            <View style={styles.popBadge}>
              <Text style={styles.popBadgeText}>Meilleure offre</Text>
            </View>
          ) : null}
        </View>
        <Text style={[textStyles.metaSm, selected && { color: 'rgba(255,255,255,0.8)' }]}>{description}</Text>
      </View>
      <Text style={[textStyles.cardTitle, selected && { color: '#FFFFFF' }]}>{price}</Text>
    </>
  );
  if (selected) {
    return (
      <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: true }} style={style}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[componentStyles.planCard, componentStyles.planCardSelected, styles.planRow]}>
          {body}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: false }}
      style={({ pressed }) => [componentStyles.planCard, styles.planRow, pressed && { opacity: 0.95 }, style]}
    >
      {body}
    </Pressable>
  );
}

/* ScoreBars : 6 barres 10 px sur 100 px. Anciennes #C9D3E6, récentes vert, dernière jaune. */
export function ScoreBars({ scores }: { scores: { label: string; value: number; color: 'old' | 'recent' | 'latest' }[] }) {
  const barColor = { old: '#C9D3E6', recent: colors.green, latest: colors.yellow } as const;
  return (
    <View style={[styles.scoreCard, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.scoreHead}>
        <Text style={textStyles.cardTitleSm}>Examens blancs</Text>
        <Text style={textStyles.metaSm}>6 dernières semaines</Text>
      </View>
      <View style={styles.scoreBars} accessibilityRole="image" accessibilityLabel="Évolution des six derniers examens blancs">
        {scores.map((score) => (
          <View key={score.label} style={styles.scoreCol}>
            <View style={styles.scoreTrack}>
              <View style={[styles.scoreFill, { height: Math.max(4, Math.round(score.value)), backgroundColor: barColor[score.color] }]} />
            </View>
            <Text style={styles.scoreLabel}>{score.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* SegmentedProgress : 6 px / 3 px (QCM) ou 8 px / 4 px (conduite). */
export function SegmentedProgress({
  total,
  done,
  current,
  kind = 'qcm',
}: {
  total: number;
  done: number;
  current?: number;
  kind?: 'qcm' | 'conduite';
}) {
  const spec = kind === 'qcm' ? componentStyles.segmentedProgressQcm : componentStyles.segmentedProgressConduite;
  return (
    <View style={[styles.segRow, { gap: spec.segmentGap }]} accessibilityRole="progressbar" accessibilityValue={{ now: done, min: 0, max: total }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: spec.height,
            borderRadius: spec.height / 2,
            backgroundColor: i < done ? colors.green : current === i ? colors.yellow : colors.track2,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heroClip: { overflow: 'hidden' },
  heroInner: { gap: 14 },
  glassPress: { flex: 1, width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 },
  notchRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: -8 },
  notchTabText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  notchMeta: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 4 },
  notchMetaText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: colors.ink2 },
  optionLetterText: { fontFamily: 'Sora_800ExtraBold', fontSize: 14 },
  optionVerdict: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12 },
  popBadge: { height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  popBadgeText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 10.5, color: colors.navy },
  planRow: { flexDirection: 'row', alignItems: 'center' },
  scoreCard: { borderRadius: 26, padding: 18, gap: 14 },
  scoreHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreBars: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  scoreCol: { flex: 1, alignItems: 'center', gap: 6 },
  scoreTrack: { width: '100%', height: 100, justifyContent: 'flex-end' },
  scoreFill: { width: '100%', borderRadius: 10 },
  scoreLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: colors.muted },
  segRow: { flexDirection: 'row' },
});
