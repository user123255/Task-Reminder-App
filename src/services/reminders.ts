
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SETTINGS_KEY = "@taskflow_settings";

const SOUND_CHANNEL_ID = "taskflow-reminders-sound";
const SILENT_CHANNEL_ID = "taskflow-reminders-silent";

type StoredSettings = {
  notifications?: boolean;
  reminders?: boolean;
  sound?: boolean;
  defaultReminderMinutes?: number;
};

export type ReminderPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unknown";

/**
 * Read TaskFlow notification settings.
 */
async function getNotificationSettings(): Promise<StoredSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);

    if (!stored) {
      return {
        notifications: true,
        reminders: true,
        sound: true,
        defaultReminderMinutes: 5,
      };
    }

    return JSON.parse(stored) as StoredSettings;
  } catch (error) {
    console.warn("Unable to read notification settings:", error);

    return {
      notifications: true,
      reminders: true,
      sound: true,
      defaultReminderMinutes: 5,
    };
  }
}

/**
 * Configure how notifications behave when the app is open.
 *
 * SDK 57 requires a notification handler for foreground notifications.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const settings = await getNotificationSettings();

    const notificationsEnabled = settings.notifications !== false;
    const soundEnabled = settings.sound !== false;

    return {
      shouldShowBanner: notificationsEnabled,
      shouldShowList: notificationsEnabled,
      shouldPlaySound: notificationsEnabled && soundEnabled,
      shouldSetBadge: false,
    };
  },
});

/**
 * Configure Android notification channels.
 *
 * Android 8+ uses notification channels for sound behavior.
 */
async function configureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(SOUND_CHANNEL_ID, {
      name: "TaskFlow Reminders",
      description: "TaskFlow activity reminders with sound",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
      name: "TaskFlow Silent Reminders",
      description: "TaskFlow activity reminders without sound",
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    console.warn("Unable to configure notification channels:", error);
  }
}

/**
 * Ask the user for notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    await configureAndroidChannels();
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();

  if (requested.granted) {
    await configureAndroidChannels();
  }

  return requested.granted;
}

/**
 * Check the current notification permission.
 */
export async function getNotificationPermissionStatus(): Promise<ReminderPermissionStatus> {
  if (Platform.OS === "web") {
    return "unknown";
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted) {
    return "granted";
  }

  if (permissions.canAskAgain) {
    return "undetermined";
  }

  return "denied";
}

/**
 * Schedule a reminder for an activity.
 *
 * reminderMinutes:
 * 0    = at activity start time
 * 5    = five minutes before
 * 10   = ten minutes before
 * etc.
 */
export async function scheduleActivityReminder(params: {
  activityId: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  reminderMinutes?: number;
}): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const settings = await getNotificationSettings();

  /**
   * Respect the TaskFlow settings.
   */
  if (settings.notifications === false) {
    return null;
  }

  if (settings.reminders === false) {
    return null;
  }

  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return null;
  }

  const reminderMinutes = Math.max(
    0,
    Math.min(
      1440,
      params.reminderMinutes ??
        settings.defaultReminderMinutes ??
        5,
    ),
  );

  const date = buildReminderDate(
    params.scheduledDate,
    params.startTime,
    reminderMinutes,
  );

  /**
   * Do not schedule reminders in the past.
   */
  if (!date || date.getTime() <= Date.now()) {
    return null;
  }

  const soundEnabled = settings.sound !== false;

  const channelId = soundEnabled
    ? SOUND_CHANNEL_ID
    : SILENT_CHANNEL_ID;

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "TaskFlow Reminder",
        body:
          reminderMinutes === 0
            ? `It's time for "${params.title}".`
            : `"${params.title}" starts in ${formatReminderMinutes(
                reminderMinutes,
              )}.`,
        data: {
          type: "activity-reminder",
          activityId: params.activityId,
        },

        /**
         * `default` gives the normal device notification sound.
         * `null` keeps the notification silent.
         */
        ...(soundEnabled ? { sound: "default" as const } : {}),

        /**
         * Android uses this channel to determine sound behavior.
         */
        ...(Platform.OS === "android"
          ? {
              channelId,
            }
          : {}),
      },

      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });

  return notificationId;
}

/**
 * Cancel a previously scheduled reminder.
 */
export async function cancelActivityReminder(
  notificationId: string | null | undefined,
): Promise<void> {
  if (Platform.OS === "web" || !notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId,
    );
  } catch (error) {
    console.warn(
      "Unable to cancel activity reminder:",
      error,
    );
  }
}

/**
 * Cancel every scheduled TaskFlow notification.
 */
export async function cancelAllActivityReminders(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn(
      "Unable to cancel TaskFlow reminders:",
      error,
    );
  }
}

/**
 * Return all currently scheduled notifications.
 */
export async function getScheduledActivityReminders() {
  if (Platform.OS === "web") {
    return [];
  }

  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Build the actual notification time.
 */
function buildReminderDate(
  scheduledDate: string,
  startTime: string,
  reminderMinutes: number,
): Date | null {
  const dateParts = scheduledDate.split("-").map(Number);

  if (
    dateParts.length !== 3 ||
    dateParts.some(Number.isNaN)
  ) {
    return null;
  }

  const [year, month, day] = dateParts;

  const time = parseTime(startTime);

  if (!time) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    time.hours,
    time.minutes,
    0,
    0,
  );

  date.setMinutes(
    date.getMinutes() - reminderMinutes,
  );

  return date;
}

/**
 * Parse either:
 *
 * 09:30
 * 9:30 AM
 * 9 AM
 * 21:45
 */
function parseTime(
  value: string,
): { hours: number; minutes: number } | null {
  const input = value.trim();

  if (!input) {
    return null;
  }

  const twelveHourMatch = input.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i,
  );

  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);

    const minutes = Number(
      twelveHourMatch[2] ?? "0",
    );

    const period =
      twelveHourMatch[3].toUpperCase();

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    if (period === "PM" && hours !== 12) {
      hours += 12;
    }

    return {
      hours,
      minutes,
    };
  }

  const twentyFourHourMatch =
    input.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const hours = Number(
      twentyFourHourMatch[1],
    );

    const minutes = Number(
      twentyFourHourMatch[2],
    );

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return {
      hours,
      minutes,
    };
  }

  return null;
}

/**
 * Make reminder text natural.
 */
function formatReminderMinutes(
  minutes: number,
): string {
  if (minutes === 0) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    }`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;

    return `${hours} hour${
      hours === 1 ? "" : "s"
    }`;
  }

  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}
