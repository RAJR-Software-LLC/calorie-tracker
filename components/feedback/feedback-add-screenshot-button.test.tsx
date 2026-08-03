import { render, screen } from '@testing-library/react-native';

import { FEEDBACK_PHOTO_PERMISSION_MESSAGE } from '@/lib/feedback/attachments';

import { FeedbackAddScreenshotButton } from './feedback-add-screenshot-button';

describe('FeedbackAddScreenshotButton', () => {
  it('disables and shows permission copy when denied', () => {
    render(<FeedbackAddScreenshotButton onPress={jest.fn()} photoPermissionDenied />);
    expect(screen.getByRole('button', { name: 'Add screenshot' })).toBeDisabled();
    expect(screen.getByText(FEEDBACK_PHOTO_PERMISSION_MESSAGE)).toBeTruthy();
  });

  it('keeps the button enabled when permission is not denied', () => {
    render(<FeedbackAddScreenshotButton onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Add screenshot' })).toBeEnabled();
    expect(screen.queryByText(FEEDBACK_PHOTO_PERMISSION_MESSAGE)).toBeNull();
  });
});
