import type { TimerPhase } from '../store/pomodoro';

export async function requestNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export function notifySessionComplete(phase: TimerPhase): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const messages: Record<TimerPhase, { title: string; body: string }> = {
    work: { title: 'Work session complete!', body: 'Time for a break. Well done.' },
    shortBreak: { title: 'Break over!', body: 'Ready to focus again?' },
    longBreak: { title: 'Long break over!', body: 'Time to get back to work.' },
  };

  const { title, body } = messages[phase];
  new Notification(title, { body, icon: '/favicon.ico' });
}
