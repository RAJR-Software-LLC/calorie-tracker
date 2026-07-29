import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/components/auth/auth-provider';
import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { TestQueryProvider } from '@/lib/queries/test-utils';

import DashboardScreen from '@/app/(tabs)/index';

describe('DashboardScreen', () => {
  it('renders dashboard title', () => {
    render(
      <NavigationContainer>
        <SafeAreaProvider>
          <TestQueryProvider>
            <AuthProvider>
              <DashboardProvider>
                <DashboardScreen />
              </DashboardProvider>
            </AuthProvider>
          </TestQueryProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });
});
