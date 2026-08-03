import { fireEvent, render, screen } from '@testing-library/react-native';

import { FormulaCatalogList } from '@/components/calculator/formula-catalog-list';
import type { FormulaCatalogEntry } from '@/types';

const formulas: FormulaCatalogEntry[] = [
  {
    id: 'mifflin_st_jeor',
    name: 'Mifflin-St Jeor',
    shortDescription: 'Recommended default',
    isDefault: true,
    isRecommended: true,
    formulaVersion: '2026.08.1',
    requiredInputs: ['age', 'sex', 'heightCm', 'weightKg', 'activityLevel'],
    citations: [],
    limitations: '',
  },
  {
    id: 'harris_benedict_revised',
    name: 'Harris-Benedict',
    shortDescription: 'Alternative',
    isDefault: false,
    isRecommended: false,
    formulaVersion: '2026.08.1',
    requiredInputs: ['age', 'sex', 'heightCm', 'weightKg', 'activityLevel'],
    citations: [],
    limitations: '',
  },
  {
    id: 'who_fao_unu',
    name: 'WHO/FAO/UNU',
    shortDescription: 'Schofield',
    isDefault: false,
    isRecommended: false,
    formulaVersion: '2026.08.1',
    requiredInputs: ['age', 'sex', 'heightCm', 'weightKg', 'activityLevel'],
    citations: [],
    limitations: '',
  },
];

describe('FormulaCatalogList', () => {
  it('shows three formulas and Recommended on Mifflin', () => {
    const onSelect = jest.fn();
    render(
      <FormulaCatalogList
        formulas={formulas}
        selectedId="mifflin_st_jeor"
        onSelect={onSelect}
      />
    );
    expect(screen.getByText('Mifflin-St Jeor')).toBeTruthy();
    expect(screen.getByText('Harris-Benedict')).toBeTruthy();
    expect(screen.getByText('WHO/FAO/UNU')).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeTruthy();
    fireEvent.press(screen.getByText('Harris-Benedict'));
    expect(onSelect).toHaveBeenCalledWith('harris_benedict_revised');
  });
});
