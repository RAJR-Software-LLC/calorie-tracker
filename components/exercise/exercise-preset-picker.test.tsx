import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExercisePresetPicker } from '@/components/exercise/exercise-preset-picker';
import type { ExercisePreset } from '@/types';

const presets: ExercisePreset[] = [
  {
    id: 'running',
    displayName: 'Running',
    category: 'cardio',
    defaultIntensity: 'moderate',
    metValue: 8,
    iconKey: 'running',
    searchKeywords: ['run'],
    healthKitActivityTypes: [],
    healthConnectExerciseTypes: [],
    googleFitActivityTypes: [],
  },
  {
    id: 'cycling',
    displayName: 'Cycling',
    category: 'cardio',
    defaultIntensity: 'moderate',
    metValue: 7,
    iconKey: 'cycling',
    searchKeywords: ['bike'],
    healthKitActivityTypes: [],
    healthConnectExerciseTypes: [],
    googleFitActivityTypes: [],
  },
];

describe('ExercisePresetPicker', () => {
  it('opens preset list and selects a preset', () => {
    const onChange = jest.fn();
    render(<ExercisePresetPicker presets={presets} value="" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Preset (optional)'));
    fireEvent.press(screen.getByText('Running'));

    expect(onChange).toHaveBeenCalledWith('running');
  });

  it('supports clearing preset selection', () => {
    const onChange = jest.fn();
    render(<ExercisePresetPicker presets={presets} value="running" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Preset (optional)'));
    fireEvent.press(screen.getByText('None / other'));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
