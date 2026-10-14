
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Configure how notifications behave when the app is open.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Check whether notification permissions are currently enabled.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status } =
    await Notifications.getPermissionsAsync();

  return status === 'granted';
}

/**
 * Cancel one scheduled notification.
 */
export async function cancelActivityReminder(
  notificationId: string
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(
    notificationId
  );
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedule a reminder for an activity.
 *
 * The reminder is scheduled before the actual activity.
 *
 * Example:
 *
 * Activity: Exercise
 * Time: 10:00 AM
 * Reminder: 5 minutes before
 *
 * Notification:
 * "Upcoming activity"
 * "Exercise starts in 5 minutes at 10:00 AM."
 */
export async function scheduleActivityReminder({
  activityId,
  title,
  scheduledDate,
  scheduledTime,
  reminderMinutes = 5,
}: {
  activityId: string;
  title: string;
  scheduledDate: string;
  scheduledTime: string;
  reminderMinutes?: number;
}): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const permissionGranted =
    await hasNotificationPermission();

  if (!permissionGranted) {
    const granted =
      await requestNotificationPermissions();

    if (!granted) {
      return null;
    }
  }

  const activityDateTime = createLocalDate(
    scheduledDate,
    scheduledTime
  );

  const reminderTime = new Date(
    activityDateTime.getTime() -
      reminderMinutes * 60 * 1000
  );

  const now = new Date();

  /**
   * Don't schedule reminders that are already in the past.
   */
  if (reminderTime <= now) {
    return null;
  }

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming activity',
        body: `${title} starts in ${reminderMinutes} minutes at ${formatTime(
          activityDateTime
        )}.`,
        data: {
          type: 'activity-reminder',
          activityId,
          scheduledDate,
          scheduledTime,
        },
        sound: 'default',
      },

      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
    });

  return notificationId;
}

/**
 * Schedule an immediate notification.
 *
 * Useful for testing notifications and for future
 * smart notification features.
 */
export async function sendTestNotification(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const permissionGranted =
    await requestNotificationPermissions();

  if (!permissionGranted) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Task Reminder',
      body: 'Your notification system is working correctly.',
      sound: 'default',
      data: {
        type: 'test-notification',
      },
    },
    trigger: null,
  });
}

/**
 * Create a JavaScript Date using the user's local timezone.
 *
 * We intentionally do NOT use:
 *
 * new Date(`${date}T${time}`)
 *
 * because the time coming from the UI may be in
 * 12-hour format.
 */
function createLocalDate(
  dateString: string,
  timeString: string
): Date {
  const [year, month, day] =
    dateString.split('-').map(Number);

  const { hours, minutes } =
    parseTime(timeString);

  const date = new Date();

  date.setFullYear(year);
  date.setMonth(month - 1);
  date.setDate(day);
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

/**
 * Convert a time such as:
 *
 * 09:00 AM
 * 12:30 PM
 * 07:45 PM
 *
 * into 24-hour time.
 */
function parseTime(time: string): {
  hours: number;
  minutes: number;
} {
  const normalized = time
    .trim()
    .toUpperCase();

  const match = normalized.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
  );

  if (!match) {
    throw new Error(
      `Invalid time format: ${time}. Expected format such as 09:00 AM.`
    );
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (hours < 1 || hours > 12) {
    throw new Error(`Invalid hour: ${hours}`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes: ${minutes}`);
  }

  if (period === 'AM') {
    if (hours === 12) {
      hours = 0;
    }
  } else if (hours !== 12) {
    hours += 12;
  }

  return {
    hours,
    minutes,
  };
}

/**
 * Format a Date into a friendly time.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get all currently scheduled notifications.
 *
 * This is useful for debugging and eventually
 * for the Settings/Reminder management screen.
 */
export async function getScheduledReminders() {
  if (Platform.OS === 'web') {
    return [];
  }

  return Notifications.getAllScheduledNotificationsAsync();
}