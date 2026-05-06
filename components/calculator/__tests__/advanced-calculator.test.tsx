import { fireEvent, render, screen } from '@testing-library/react-native';

import { AdvancedCalculator } from '@/components/calculator/advanced-calculator';

describe('AdvancedCalculator defaults', () => {
  it('pre-populates imperial fields from profile defaults', () => {
    render(
      <AdvancedCalculator
        onResult={jest.fn()}
        defaults={{
          weightKg: 80,
          heightCm: 180,
          age: 32,
          sex: 'female',
          activityLevel: 'light',
          heightUnit: 'ft_in',
          weightUnit: 'lb',
        }}
      />
    );

    expect(screen.getByDisplayValue('32')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
    expect(screen.getByDisplayValue('11')).toBeTruthy();
    expect(screen.getByDisplayValue('176.4')).toBeTruthy();
  });

  it('calculates using prefilled defaults', () => {
    const onResult = jest.fn();
    render(
      <AdvancedCalculator
        onResult={onResult}
        defaults={{
          weightKg: 70,
          heightCm: 170,
          age: 30,
          sex: 'male',
          activityLevel: 'moderate',
          heightUnit: 'cm',
          weightUnit: 'kg',
        }}
      />
    );

    fireEvent.press(screen.getByText('Calculate'));
    expect(onResult).toHaveBeenCalled();
  });
});
