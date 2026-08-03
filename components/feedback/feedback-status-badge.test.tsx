import { render, screen } from '@testing-library/react-native';

import { FeedbackStatusBadge } from './feedback-status-badge';

describe('FeedbackStatusBadge', () => {
  it('renders status label', () => {
    render(<FeedbackStatusBadge status="in_progress" />);
    expect(screen.getByText('In progress')).toBeTruthy();
  });
});
