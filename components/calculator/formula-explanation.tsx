import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ExternalLink } from 'lucide-react-native';

import { openCitationUrl } from '@/lib/calculator';
import { logAppError } from '@/lib/app-errors';
import { useThemePalette } from '@/lib/use-theme-palette';
import type { CalculatorCitation, CalculatorExplanationStep } from '@/types';

type FormulaExplanationProps = {
  steps: CalculatorExplanationStep[];
  citations: CalculatorCitation[];
};

export function FormulaExplanation({ steps, citations }: FormulaExplanationProps) {
  const p = useThemePalette();
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-xl border border-border dark:border-darkBorder">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between px-4 py-3 active:opacity-80"
      >
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
          How we calculated this
        </Text>
        <ChevronDown
          size={18}
          color={p.mutedForeground}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open ? (
        <View className="gap-3 border-t border-border px-4 py-3 dark:border-darkBorder">
          {steps.map((step) => (
            <View key={step.key} className="flex-row justify-between gap-3">
              <Text className="flex-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
                {step.label}
              </Text>
              <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
                {step.value}
              </Text>
            </View>
          ))}
          {citations.length > 0 ? (
            <View className="mt-1 gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-darkMutedForeground">
                Citations
              </Text>
              {citations.map((citation) => (
                <Pressable
                  key={citation.id}
                  onPress={() => {
                    void openCitationUrl(citation.doiOrUrl).catch((err) => {
                      logAppError('calculator/open-citation', err);
                    });
                  }}
                  accessibilityRole="link"
                  accessibilityLabel={`Open citation ${citation.title}`}
                  className="flex-row items-center gap-2 active:opacity-70"
                >
                  <ExternalLink size={14} color={p.primary} />
                  <Text className="flex-1 text-sm text-primary dark:text-darkPrimary">
                    {citation.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
