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
}

export function buildNotificationContent(type: NotificationType): NotificationContent {
  switch (type) {
    case 'DAILY_REMINDER':
      return {
        title: 'Learnendo',
        body: 'Sua trilha de hoje está esperando por você. Continue de onde parou!',
        path: '/',
      };
    case 'ADMIN_TEST':
      return {
        title: 'Learnendo',
        body: 'Esta é uma notificação de teste.',
        path: '/?notification=test',
      };
    default:
      throw new Error(`Notification type ${type} is reserved for a future phase.`);
  }
}
