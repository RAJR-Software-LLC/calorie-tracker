import { render, screen } from '@testing-library/react-native';

import DashboardScreen from '@/app/(tabs)/index';

describe('DashboardScreen', () => {
  it('renders dashboard title', () => {
    render(<DashboardScreen />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });
});
