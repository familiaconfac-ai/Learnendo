export const NOTIFICATION_TYPES = [
  'DAILY_REMINDER',
  'INACTIVITY_REMINDER',
  'STREAK_REMINDER',
  'LESSON_COMPLETED',
  'ACHIEVEMENT',
  'ADMIN_TEST',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface NotificationContent {
  title: string;
  body: string;
  path: string;
  tag: string;
}

export function buildNotificationContent(type: NotificationType): NotificationContent {
  switch (type) {
    case 'DAILY_REMINDER':
      return {
        title: 'Learnendo',
        body: 'Sua trilha de hoje está esperando por você. Continue de onde parou!',
        path: '/',
        tag: 'INACTIVITY_DAILY_REMINDER',
      };
    case 'ADMIN_TEST':
      return {
        title: 'Learnendo test notification',
        body: 'Administrative push delivery test. No learning activity was changed.',
        path: '/?notification=test',
        tag: 'ADMIN_TEST',
      };
    default:
      throw new Error(`Notification type ${type} is reserved for a future phase.`);
  }
}
