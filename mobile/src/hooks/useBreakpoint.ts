import { useWindowDimensions } from 'react-native';
import { breakpoints } from '../theme/tokens';

export type AppBreakpoint = 'compact' | 'phone' | 'tablet' | 'tabletLarge';

export function useBreakpoint(): AppBreakpoint {
  const { width } = useWindowDimensions();

  if (width < breakpoints.compact) return 'compact';
  if (width < breakpoints.tablet) return 'phone';
  if (width < breakpoints.tabletLarge) return 'tablet';
  return 'tabletLarge';
}
