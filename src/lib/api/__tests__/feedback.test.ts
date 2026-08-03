import {
  deleteFeedback,
  getFeedbackDetail,
  getFeedbackList,
  patchFeedback,
  postFeedback,
  postFeedbackAttachmentComplete,
  postFeedbackAttachmentUploadUrl,
  postFeedbackComment,
} from '@/lib/api/v1';
import { apiRequest } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('feedback API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue(undefined);
  });

  it('getFeedbackList calls /me/feedback without status by default', async () => {
    mockApiRequest.mockResolvedValueOnce([]);
    await getFeedbackList();
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback');
  });

  it('getFeedbackList appends status query', async () => {
    mockApiRequest.mockResolvedValueOnce([]);
    await getFeedbackList({ status: 'open' });
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback?status=open');
  });

  it('postFeedback POSTs body and returns id', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'fb-1' });
    const result = await postFeedback({
      category: 'bug',
      message: 'Something broke',
      platform: 'ios',
      appVersion: '1.0.0',
    });
    expect(result).toEqual({ id: 'fb-1' });
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback', {
      method: 'POST',
      json: {
        category: 'bug',
        message: 'Something broke',
        platform: 'ios',
        appVersion: '1.0.0',
      },
    });
  });

  it('getFeedbackDetail encodes id', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'a/b', comments: [] });
    await getFeedbackDetail('a/b');
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback/a%2Fb');
  });

  it('patchFeedback sends PATCH', async () => {
    await patchFeedback('fb-1', { message: 'Updated' });
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback/fb-1', {
      method: 'PATCH',
      json: { message: 'Updated' },
    });
  });

  it('deleteFeedback sends DELETE', async () => {
    await deleteFeedback('fb-1');
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback/fb-1', {
      method: 'DELETE',
    });
  });

  it('postFeedbackComment POSTs body', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'c1' });
    await postFeedbackComment('fb-1', { body: 'Thanks' });
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback/fb-1/comments', {
      method: 'POST',
      json: { body: 'Thanks' },
    });
  });

  it('attachment upload-url and complete use nested paths', async () => {
    mockApiRequest.mockResolvedValueOnce({
      uploadUrl: 'https://signed.example/put',
      storagePath: 'feedback-attachments/u1/fb-1/x.jpg',
      contentType: 'image/jpeg',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    await postFeedbackAttachmentUploadUrl('fb-1', { contentType: 'image/jpeg' });
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback/fb-1/attachments/upload-url', {
      method: 'POST',
      json: { contentType: 'image/jpeg' },
    });

    mockApiRequest.mockResolvedValueOnce(undefined);
    await postFeedbackAttachmentComplete('fb-1', {
      storagePath: 'feedback-attachments/u1/fb-1/x.jpg',
    });
    expect(mockApiRequest).toHaveBeenCalledWith('/me/feedback/fb-1/attachments/complete', {
      method: 'POST',
      json: { storagePath: 'feedback-attachments/u1/fb-1/x.jpg' },
    });
  });
});
