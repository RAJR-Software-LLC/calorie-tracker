import { AppHeader } from '@/components/layout/app-header';
import { ScrollView, View, type RefreshControlProps, type ViewProps } from 'react-native';

type AppScreenProps = ViewProps & {
  children: React.ReactNode;
  scroll?: boolean;
  showHeader?: boolean;
  forceLeafHeader?: boolean;
  /** Passed to ScrollView when `scroll` is true (e.g. RefreshControl). */
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

const contentPad = {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 112,
  gap: 20,
  maxWidth: 512,
  width: '100%' as const,
  alignSelf: 'center' as const,
};

export function AppScreen({
  children,
  scroll = true,
  showHeader = true,
  forceLeafHeader = false,
  refreshControl,
  className,
  ...rest
}: AppScreenProps) {
  return (
    <View className={`flex-1 bg-background dark:bg-darkBackground ${className ?? ''}`} {...rest}>
      {showHeader ? <AppHeader forceLeaf={forceLeafHeader} /> : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={contentPad}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="mx-auto w-full max-w-lg flex-1 gap-5 px-4 pb-28 pt-4">{children}</View>
      )}
    </View>
  );
}
