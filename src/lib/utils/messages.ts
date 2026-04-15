const morningMessages = [
  'A new day to nourish yourself!',
  'Good morning! Your body is ready for fuel.',
  'Rise and shine - today is full of good choices.',
  'A fresh start. You\'ve got this.',
  'Morning! Remember, every meal is self-care.',
];

const afternoonMessages = [
  'You\'re doing great listening to your body today!',
  'Halfway through the day - keep fueling well.',
  'Nice work staying mindful today.',
  'Your body thanks you for paying attention.',
  'Afternoon check-in: you\'re doing amazing.',
];

const eveningMessages = [
  'You did amazing today. Rest well.',
  'Another day of taking care of yourself. Be proud.',
  'Winding down? You nourished yourself well today.',
  'Time to relax. Tomorrow is a fresh start.',
  'Great job today. Sleep well and recharge.',
];

const afterLogMessages = [
  'Logged! You\'re building a great habit.',
  'Nice one! Consistency beats perfection.',
  'That\'s what progress looks like.',
  'Tracked! Every estimate counts.',
  'Way to go! Quick and easy.',
];

const generalMessages = [
  'Every estimate is good enough. Progress over perfection.',
  'Fueling your body is an act of self-care.',
  'You don\'t have to be perfect, just present.',
  'Small steps lead to big changes.',
  'Listening to your body is a superpower.',
];

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)] ?? messages[0] ?? '';
}

export function getTimeBasedMessage(): string {
  const hour = new Date().getHours();
  if (hour < 12) return getRandomMessage(morningMessages);
  if (hour < 17) return getRandomMessage(afternoonMessages);
  return getRandomMessage(eveningMessages);
}

export function getAfterLogMessage(): string {
  return getRandomMessage(afterLogMessages);
}

export function getGeneralMessage(): string {
  return getRandomMessage(generalMessages);
}

export function getContextualMessage(consumed: number, goal: number | null): string {
  if (!goal) return getGeneralMessage();
  const ratio = consumed / goal;
  if (ratio < 0.3) return 'Your body might still be hungry - listen to it.';
  if (ratio >= 0.3 && ratio < 0.7) return 'You\'re on a great pace today!';
  if (ratio >= 0.7 && ratio < 1.0) return 'You\'re right on track. Nice work!';
  if (ratio >= 1.0 && ratio < 1.15) return 'Well fueled today! Great job.';
  return 'You\'ve eaten plenty today. Listen to your body.';
}
