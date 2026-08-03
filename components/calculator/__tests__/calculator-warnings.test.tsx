import { render, screen } from '@testing-library/react-native';

import { CalculatorWarnings } from '@/components/calculator/calculator-warnings';

describe('CalculatorWarnings', () => {
  it('renders soft warnings without blocking copy', () => {
    render(
      <CalculatorWarnings
        warnings={[
          {
            code: 'large_deficit',
            severity: 'warning',
            message: 'Large deficit relative to TDEE.',
          },
          { code: 'info_note', severity: 'info', message: 'Estimates are approximate.' },
        ]}
      />
    );
    expect(screen.getByText('Large deficit relative to TDEE.')).toBeTruthy();
    expect(screen.getByText('Estimates are approximate.')).toBeTruthy();
  });
});
