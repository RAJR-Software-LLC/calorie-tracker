import { useState } from 'react';
import { Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { useThemePalette } from '@/lib/use-theme-palette';

import { LogEntryModal } from './log-entry-modal';

type QuickLogButtonProps = {
  date: string;
};

export function QuickLogButton({ date }: QuickLogButtonProps) {
  const p = useThemePalette();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" className="w-full py-6 shadow-md" onPress={() => setOpen(true)}>
        <View className="flex-row items-center justify-center gap-2">
          <Plus size={20} color={p.primaryForeground} />
          <Text className="text-base font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
            Log a Meal
          </Text>
        </View>
      </Button>
      <LogEntryModal open={open} onOpenChange={setOpen} date={date} />
    </>
  );
}
