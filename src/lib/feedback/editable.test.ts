import { isFeedbackEditable } from './editable';

describe('isFeedbackEditable', () => {
  it('allows open and in_progress', () => {
    expect(isFeedbackEditable('open')).toBe(true);
    expect(isFeedbackEditable('in_progress')).toBe(true);
  });

  it('blocks resolved and closed', () => {
    expect(isFeedbackEditable('resolved')).toBe(false);
    expect(isFeedbackEditable('closed')).toBe(false);
  });
});
