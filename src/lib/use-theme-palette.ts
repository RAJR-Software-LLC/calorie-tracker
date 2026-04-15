import { useColorScheme } from '@/components/useColorScheme';
import { dark, light } from '@/theme';

export function useThemePalette() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
