import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { useThemePalette } from '@/lib/use-theme-palette';
import { getContextualMessage, getTimeBasedMessage } from '@/lib/utils/messages';

type EncouragementCardProps = {
  consumed: number;
  goal: number | null;
};

export function EncouragementCard({ consumed, goal }: EncouragementCardProps) {
  const p = useThemePalette();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (consumed > 0) {
      setMessage(getContextualMessage(consumed, goal));
    } else {
      setMessage(getTimeBasedMessage());
    }
  }, [consumed, goal]);

  if (!message) return null;

  return (
    <View className="flex-row items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 dark:border-darkPrimary/10 dark:bg-darkPrimary/5">
      <Sparkles size={16} color={p.primary} style={{ marginTop: 2 }} />
      <Text className="flex-1 text-sm leading-relaxed text-foreground dark:text-darkForeground">{message}</Text>
    </View>
  );
}
