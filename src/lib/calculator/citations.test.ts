jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(async () => true),
    openURL: jest.fn(async () => undefined),
  },
}));

import { Linking } from 'react-native';

import { openCitationUrl } from './citations';

describe('openCitationUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens https URLs', async () => {
    await expect(openCitationUrl('https://doi.org/10.1234/abc')).resolves.toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('https://doi.org/10.1234/abc');
  });

  it('rewrites bare DOIs', async () => {
    await expect(openCitationUrl('10.1234/example')).resolves.toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('https://doi.org/10.1234/example');
  });

  it('rejects non-http schemes', async () => {
    await expect(openCitationUrl('javascript:alert(1)')).resolves.toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
