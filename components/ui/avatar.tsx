import { User } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import { useThemePalette } from '@/lib/use-theme-palette';
import type { UserProfilePhoto, UserProfilePhotoWithDownload } from '@/types';

export type AvatarProps = {
  photo?: UserProfilePhoto | UserProfilePhotoWithDownload | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  onRefreshNeeded?: () => void;
};

function avatarInitial(name?: string | null, email?: string | null): string | null {
  const n = name?.trim();
  if (n) {
    const first = n.split(/\s+/)[0]?.[0];
    if (first) return first.toUpperCase();
  }
  const e = email?.trim();
  if (e?.includes('@')) {
    const local = e.split('@')[0]?.[0];
    if (local) return local.toUpperCase();
  }
  return null;
}

export function Avatar({ photo, name, email, size = 48, onRefreshNeeded }: AvatarProps) {
  const p = useThemePalette();
  const hasDownload =
    photo != null && typeof photo === 'object' && 'downloadUrl' in photo && photo.downloadUrl;
  const initial = avatarInitial(name, email);
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (hasDownload) {
    const url = (photo as UserProfilePhotoWithDownload).downloadUrl;
    return (
      <Image
        source={{ uri: url }}
        style={dim}
        accessibilityLabel="Profile photo"
        onError={() => onRefreshNeeded?.()}
      />
    );
  }

  return (
    <View
      className="items-center justify-center bg-primary/15 dark:bg-darkPrimary/25"
      style={dim}
      accessibilityLabel={initial ? `Avatar: ${initial}` : 'Profile avatar'}
    >
      {initial ? (
        <Text
          className="font-semibold text-foreground dark:text-darkForeground"
          style={{ fontSize: size * 0.42 }}
        >
          {initial}
        </Text>
      ) : (
        <User size={size * 0.5} color={p.primary} />
      )}
    </View>
  );
}
