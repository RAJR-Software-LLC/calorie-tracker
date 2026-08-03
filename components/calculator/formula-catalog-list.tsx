import { Pressable, Text, View } from 'react-native';

import type { FormulaCatalogEntry, FormulaId } from '@/types';

type FormulaCatalogListProps = {
  formulas: FormulaCatalogEntry[];
  selectedId: FormulaId | null;
  onSelect: (id: FormulaId) => void;
};

export function FormulaCatalogList({ formulas, selectedId, onSelect }: FormulaCatalogListProps) {
  return (
    <View className="gap-2">
      {formulas.map((formula) => {
        const selected = formula.id === selectedId;
        return (
          <Pressable
            key={formula.id}
            onPress={() => {
              onSelect(formula.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${formula.name}${formula.isRecommended ? ', recommended' : ''}`}
            className={`rounded-xl border px-4 py-3 active:opacity-90 ${
              selected
                ? 'border-primary bg-primary/5 dark:border-darkPrimary dark:bg-darkPrimary/10'
                : 'border-border bg-card dark:border-darkBorder dark:bg-darkCard'
            }`}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-semibold text-foreground dark:text-darkForeground">
                {formula.name}
              </Text>
              {formula.isRecommended || formula.isDefault ? (
                <View className="rounded-md bg-primary/15 px-2 py-0.5 dark:bg-darkPrimary/20">
                  <Text className="text-xs font-semibold text-primary dark:text-darkPrimary">
                    Recommended
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-1 text-sm leading-relaxed text-muted-foreground dark:text-darkMutedForeground">
              {formula.shortDescription}
            </Text>
            {formula.limitations ? (
              <Text className="mt-1 text-xs text-muted-foreground dark:text-darkMutedForeground">
                {formula.limitations}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
