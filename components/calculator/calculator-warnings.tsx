import { Text, View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';

import { useThemePalette } from '@/lib/use-theme-palette';
import type { CalculatorWarning } from '@/types';

type CalculatorWarningsProps = {
  warnings: CalculatorWarning[];
};

/**
 * Soft warnings from the calculator API. Never blocks Apply.
 * Extension point: product/legal may later require an acknowledgment
 * gate for specific warning codes before Apply (do not treat as hard errors here).
 */
export function CalculatorWarnings({ warnings }: CalculatorWarningsProps) {
  const p = useThemePalette();
  if (!warnings.length) return null;

  return (
    <View className="gap-2" accessibilityRole="summary">
      {warnings.map((warning) => {
        const isWarning = warning.severity === 'warning';
        return (
          <View
            key={`${warning.code}-${warning.message}`}
            className={`flex-row items-start gap-2 rounded-xl border px-3 py-2.5 ${
              isWarning
                ? 'border-amber-500/40 bg-amber-500/10 dark:border-amber-400/40 dark:bg-amber-400/10'
                : 'border-border bg-muted/40 dark:border-darkBorder dark:bg-darkMuted/40'
            }`}
          >
            {isWarning ? (
              <AlertTriangle size={16} color={p.primary} style={{ marginTop: 2 }} />
            ) : (
              <Info size={16} color={p.mutedForeground} style={{ marginTop: 2 }} />
            )}
            <Text className="flex-1 text-sm leading-relaxed text-foreground dark:text-darkForeground">
              {warning.message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
