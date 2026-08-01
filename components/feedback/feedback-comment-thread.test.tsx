import { render, screen } from '@testing-library/react-native';

import { FeedbackCommentThread } from './feedback-comment-thread';

describe('FeedbackCommentThread', () => {
  it('renders plain text bodies without interpreting HTML', () => {
    render(
      <FeedbackCommentThread
        comments={[
          {
            id: 'c1',
            authorType: 'user',
            authorId: 'u1',
            body: '<script>alert(1)</script> hello',
            createdAt: '2026-07-01T12:00:00.000Z',
          },
          {
            id: 'c2',
            authorType: 'ops',
            authorId: 'ops-1',
            body: 'Thanks for reporting',
            createdAt: '2026-07-01T13:00:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('<script>alert(1)</script> hello')).toBeTruthy();
    expect(screen.getByText('Thanks for reporting')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();
  });

  it('shows empty copy when no comments', () => {
    render(<FeedbackCommentThread comments={[]} />);
    expect(screen.getByText('No comments yet.')).toBeTruthy();
  });
});
