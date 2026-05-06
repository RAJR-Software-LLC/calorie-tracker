import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'react-native';

import { Avatar } from '@/components/ui/avatar';

jest.mock('@/lib/use-theme-palette', () => ({
  useThemePalette: () => ({
    primary: '#0a0',
    mutedForeground: '#888',
  }),
}));

describe('Avatar', () => {
  it('renders Image when downloadUrl is present', () => {
    const { UNSAFE_getByType } = render(
      <Avatar
        photo={{
          storagePath: 'p',
          contentType: 'image/jpeg',
          updatedAt: '2026-01-01',
          downloadUrl: 'https://example.com/read',
        }}
        name="Alex"
      />
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source.uri).toBe('https://example.com/read');
  });

  it('renders initial from name when no photo', () => {
    const { getByText } = render(<Avatar photo={null} name="Jordan Smith" />);
    expect(getByText('J')).toBeTruthy();
  });

  it('calls onRefreshNeeded when image errors', () => {
    const onRefreshNeeded = jest.fn();
    const { UNSAFE_getByType } = render(
      <Avatar
        photo={{
          storagePath: 'p',
          contentType: 'image/jpeg',
          updatedAt: '2026-01-01',
          downloadUrl: 'https://example.com/read',
        }}
        onRefreshNeeded={onRefreshNeeded}
      />
    );
    const img = UNSAFE_getByType(Image);
    fireEvent(img, 'error');
    expect(onRefreshNeeded).toHaveBeenCalledTimes(1);
  });
});
