import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Label } from '@/components/ui/label';
import { useThemePalette } from '@/lib/use-theme-palette';
import type { ExercisePreset } from '@/types';

const NONE_VALUE = '';

type ExercisePresetPickerProps = {
  label?: string;
  presets: ExercisePreset[];
  value: string;
  onChange: (presetId: string) => void;
  noneLabel?: string;
};

export function ExercisePresetPicker({
  label = 'Preset (optional)',
  presets,
  value,
  onChange,
  noneLabel = 'None / other',
}: ExercisePresetPickerProps) {
  const p = useThemePalette();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return noneLabel;
    const preset = presets.find((item) => item.id === value);
    return preset ? `${preset.displayName} (${preset.id})` : value;
  }, [noneLabel, presets, value]);

  function selectPreset(presetId: string) {
    onChange(presetId);
    setOpen(false);
  }

  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-3 dark:border-darkBorder dark:bg-darkBackground"
      >
        <Text className="flex-1 text-base text-foreground dark:text-darkForeground">
          {selectedLabel}
        </Text>
        <ChevronDown size={18} color={p.mutedForeground} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View
            className="max-h-[70%] rounded-t-3xl bg-card dark:bg-darkCard"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="border-b border-border px-4 py-4 dark:border-darkBorder">
              <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
                {label}
              </Text>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => selectPreset(NONE_VALUE)}
                className="flex-row items-center justify-between px-4 py-3 active:bg-secondary dark:active:bg-darkSecondary"
              >
                <Text className="text-base text-foreground dark:text-darkForeground">
                  {noneLabel}
                </Text>
                {!value ? <Check size={20} color={p.primary} /> : null}
              </Pressable>
              {presets.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => selectPreset(preset.id)}
                  className="flex-row items-center justify-between border-t border-border px-4 py-3 active:bg-secondary dark:active:bg-darkSecondary dark:border-darkBorder"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-base text-foreground dark:text-darkForeground">
                      {preset.displayName}
                    </Text>
                    <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                      {preset.id}
                    </Text>
                  </View>
                  {value === preset.id ? <Check size={20} color={p.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
