import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/components/auth/auth-provider';
import { DashboardProvider } from '@/components/dashboard/dashboard-context';

import DashboardScreen from '@/app/(tabs)/index';

describe('DashboardScreen', () => {
  it('renders dashboard title', () => {
    render(
      <SafeAreaProvider>
        <AuthProvider>
          <DashboardProvider>
            <DashboardScreen />
          </DashboardProvider>
        </AuthProvider>
      </SafeAreaProvider>
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });
});
