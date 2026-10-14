import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'taskflow-reminders';

let configured = false;
let permissionRequested = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type ScheduleActivityReminderInput = {
  activityId: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  reminderMinutes: number;
};

function parseLocalDateTime(
  date: string,
  time: string,
): Date | null {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})/);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  const result = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0,
  );

  return Number.isNaN(result.getTime()) ? null : result;
}

export async function configureTaskFlowNotifications(): Promise<void> {
  if (configured) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Task reminders',
      description: 'Reminders for scheduled TaskFlow activities.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  configured = true;
}

export async function requestReminderPermissions(): Promise<boolean> {
  await configureTaskFlowNotifications();

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (
    permissionRequested &&
    current.canAskAgain === false
  ) {
    return false;
  }

  permissionRequested = true;

  const requested = await Notifications.requestPermissionsAsync();

  return requested.granted;
}

export async function scheduleActivityReminder(
  input: ScheduleActivityReminderInput,
): Promise<string | null> {
  await configureTaskFlowNotifications();

  const permissionGranted =
    await requestReminderPermissions();

  if (!permissionGranted) {
    return null;
  }

  if (!Number.isFinite(input.reminderMinutes)) {
    return null;
  }

  const scheduledDateTime = parseLocalDateTime(
    input.scheduledDate,
    input.startTime,
  );

  if (!scheduledDateTime) {
    return null;
  }

  const triggerDate = new Date(
    scheduledDateTime.getTime(),
  );

  triggerDate.setMinutes(
    triggerDate.getMinutes() -
      Math.max(0, Math.floor(input.reminderMinutes)),
  );

  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  const minutes = Math.max(
    0,
    Math.floor(input.reminderMinutes),
  );

  const body =
    minutes === 0
      ? `It's time for "${input.title}".`
      : `"${input.title}" starts in ${minutes} ${
          minutes === 1 ? 'minute' : 'minutes'
        }.`;

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TaskFlow reminder',
        body,
        sound: 'default',
        data: {
          activityId: input.activityId,
          type: 'activity-reminder',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android'
          ? { channelId: CHANNEL_ID }
          : {}),
      },
    });

  return notificationId;
}

export async function cancelActivityReminder(
  notificationId: string,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    notificationId,
  );
}

export async function cancelAllTaskFlowReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledTaskFlowReminders(): Promise<
  Notifications.NotificationRequest[]
> {
  return Notifications.getAllScheduledNotificationsAsync();
}
