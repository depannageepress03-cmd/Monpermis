import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, G } from 'react-native-svg';
import { BarChart3, Home, LifeBuoy, Tag, TriangleAlert } from 'lucide-react-native';
import { colors, componentStyles, textStyles } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export type MainTabId = 'accueil' | 'code' | 'conduite' | 'progres' | 'offres';

const ROUTES: Record<MainTabId, keyof RootStackParamList> = {
  accueil: 'Home',
  code: 'CodeRoute',
  conduite: 'Conduite',
  progres: 'Profile',
  offres: 'Abonnement',
};

const TABS: { id: MainTabId; label: string; Icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', Icon: Home },
  { id: 'code', label: 'Code', Icon: TriangleAlert },
  { id: 'conduite', label: 'Conduite', Icon: LifeBuoy },
  { id: 'progres', label: 'Progrès', Icon: BarChart3 },
  { id: 'offres', label: 'Offres', Icon: Tag },
];

/* TabBar flottante : 16 px bords, 22 px bas, 72 px de haut, rayon 36. */
export function MainTabBar({ activeId }: { activeId: MainTabId }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.floatWrap} pointerEvents="box-none">
      <View style={[componentStyles.tabBar, styles.bar]} accessibilityRole="tablist" accessibilityLabel="Navigation principale">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === activeId;
          return (
            <Pressable
              key={id}
              onPress={() => navigation.navigate(ROUTES[id] as never)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={[componentStyles.tabPill, active ? componentStyles.tabPillActive : componentStyles.tabPillInactive]}
            >
              <Icon size={22} strokeWidth={1.9} color={active ? colors.navy : 'rgba(255,255,255,0.74)'} />
              <Text style={[textStyles.tabLabel, { color: active ? colors.navy : 'rgba(255,255,255,0.74)' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ProgressRing : rayon 105, trait 24, piste track. Vert = cours, navy = examens, jaune = conduite. */
export function ProgressRing({
  course,
  exams,
  driving,
  percent,
  trend,
}: {
  course: number;
  exams: number;
  driving: number;
  percent: number;
  trend?: string;
}) {
  const R = componentStyles.progressRingRadius;
  const C = 2 * Math.PI * R;
  const GAP = 14;
  const segs = [
    { ratio: course, color: colors.green },
    { ratio: exams, color: colors.navy },
    { ratio: driving, color: colors.yellow },
  ].filter((s) => s.ratio > 0);
  const usable = C - GAP * Math.max(0, segs.length - 1);
  let cursor = 0;
  return (
    <View style={styles.ringWrap} accessibilityRole="progressbar" accessibilityValue={{ now: percent, min: 0, max: 100 }}>
      <Svg width={270} height={270} viewBox="0 0 260 260">
        <Circle cx={130} cy={130} r={R} stroke={colors.track} strokeWidth={componentStyles.progressRingStroke} fill="none" />
        <G rotation={-90} originX={130} originY={130}>
          {segs.map((seg, i) => {
            const len = Math.max(0, usable * seg.ratio);
            const el = <Circle key={i} cx={130} cy={130} r={R} stroke={seg.color} strokeWidth={componentStyles.progressRingStroke} strokeLinecap="round" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-cursor} fill="none" />;
            cursor += len + GAP;
            return el;
          })}
        </G>
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringNumber}>
          {percent}
          <Text style={styles.ringPct}>%</Text>
        </Text>
        <Text style={styles.ringNote}>prête pour l'examen</Text>
        {trend ? (
          <View style={styles.ringTrend}>
            <Text style={styles.ringTrendText}>{trend}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* DayPill 72 px, rayon 22. Sélection = bleu nuit. */
export function DayPill({
  day,
  date,
  selected,
  onPress,
}: {
  day: string;
  date: number;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${day} ${date}`}
      style={[componentStyles.dayPill, selected ? componentStyles.dayPillSelected : componentStyles.dayPillUnselected]}
    >
      <Text style={[styles.dayName, selected && styles.dayNameActive]}>{day}</Text>
      <Text style={[styles.dayNum, selected && styles.dayNumActive]}>{date}</Text>
    </Pressable>
  );
}

export type SlotState = 'available' | 'selected' | 'unavailable';

/* SlotButton 48 px pilule. Sélection = green-tint + bordure verte 2 px. */
export function SlotButton({
  time,
  state = 'available',
  onPress,
}: {
  time: string;
  state?: SlotState;
  onPress?: () => void;
}) {
  const skin =
    state === 'selected'
      ? componentStyles.slotBtnSelected
      : state === 'unavailable'
        ? componentStyles.slotBtnUnavailable
        : componentStyles.slotBtnAvailable;
  const off = state === 'unavailable';
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="radio"
      accessibilityState={{ selected: state === 'selected', disabled: off }}
      accessibilityLabel={`Créneau ${time}${off ? ' indisponible' : ''}`}
      style={[componentStyles.slotBtn, skin]}
    >
      <Text style={[styles.slotText, off && styles.slotTextOff, state === 'selected' && styles.slotTextSel]}>{time}</Text>
    </Pressable>
  );
}

/* MonitorChip 52 px, avatar initiales 40 px, défilement horizontal. */
export function MonitorChip({
  initials,
  name,
  selected,
  onPress,
}: {
  initials: string;
  name: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`Moniteur ${name}`}
      style={[componentStyles.monitorChip, selected ? componentStyles.monitorChipSelected : componentStyles.monitorChipUnselected]}
    >
      <View style={[componentStyles.monitorAvatar, { backgroundColor: selected ? colors.yellow : colors.greenTint2 }]}>
        <Text style={[styles.avatarText, { color: colors.navy }]}>{initials}</Text>
      </View>
      <Text style={[styles.chipName, selected && styles.chipNameActive]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringWrap: {
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  ringNumber: {
    fontFamily: 'Sora_700Bold',
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -2.16,
    color: colors.navy,
  },
  ringPct: {
    color: colors.subtle,
  },
  ringNote: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.muted,
  },
  ringTrend: {
    marginTop: 8,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.greenTint,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringTrendText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: colors.greenDark,
  },
  dayName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11.5,
    color: colors.navy,
    opacity: 0.8,
  },
  dayNameActive: {
    color: '#FFFFFF',
  },
  dayNum: {
    fontFamily: 'Sora_700Bold',
    fontSize: 19,
    color: colors.navy,
  },
  dayNumActive: {
    color: '#FFFFFF',
  },
  slotText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  slotTextOff: {
    color: colors.subtle,
    textDecorationLine: 'line-through',
  },
  slotTextSel: {
    color: colors.greenInk,
  },
  avatarText: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 13,
  },
  chipName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.navy,
  },
  chipNameActive: {
    color: '#FFFFFF',
  },
});
