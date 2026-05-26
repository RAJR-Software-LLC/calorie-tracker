import { deleteSavedItem, patchSavedItem } from '@/lib/api/v1';
import { apiRequest } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('saved-items API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue(undefined);
  });

  it('patchSavedItem sends PATCH with If-Unmodified-Since header', async () => {
    await patchSavedItem(
      'item-123',
      { itemName: 'New name', defaultCalories: 'unknown' },
      '2026-01-02T00:00:00.000Z'
    );

    expect(mockApiRequest).toHaveBeenCalledWith('/me/saved-items/item-123', {
      method: 'PATCH',
      json: { itemName: 'New name', defaultCalories: 'unknown' },
      headers: { 'If-Unmodified-Since': '2026-01-02T00:00:00.000Z' },
    });
  });

  it('deleteSavedItem sends DELETE with If-Unmodified-Since header', async () => {
    await deleteSavedItem('item-456', '2026-01-03T00:00:00.000Z');

    expect(mockApiRequest).toHaveBeenCalledWith('/me/saved-items/item-456', {
      method: 'DELETE',
      headers: { 'If-Unmodified-Since': '2026-01-03T00:00:00.000Z' },
    });
  });

  it('encodes item id in path', async () => {
    await deleteSavedItem('item/with/slash', '2026-01-03T00:00:00.000Z');
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/me/saved-items/item%2Fwith%2Fslash',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
