import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/components/auth/auth-provider';

import DashboardScreen from '@/app/(tabs)/index';

describe('DashboardScreen', () => {
  it('renders dashboard title', () => {
    render(
      <SafeAreaProvider>
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>
      </SafeAreaProvider>
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });
});
