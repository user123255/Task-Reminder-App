import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/hooks/use-auth';

export type TaskFlowSettings = {
  notifications: boolean;
  reminders: boolean;
  sound: boolean;
  compactMode: boolean;
  autoMoveMissed: boolean;
  use24HourClock: boolean;
  defaultReminderMinutes: number;
};

export const DEFAULT_TASKFLOW_SETTINGS: TaskFlowSettings = {
  notifications: true,
  reminders: true,
  sound: true,
  compactMode: false,
  autoMoveMissed: true,
  use24HourClock: false,
  defaultReminderMinutes: 5,
};

const SETTINGS_KEY_PREFIX = '@taskflow_settings:';
const LEGACY_SETTINGS_KEY = '@taskflow_settings';

export const TASKFLOW_REMINDER_OPTIONS = [
  0,
  5,
  10,
  15,
  30,
  60,
] as const;

type TaskFlowSettingsContextValue = {
  settings: TaskFlowSettings;
  loading: boolean;
  saving: boolean;
  updateSetting: <K extends keyof TaskFlowSettings>(
    key: K,
    value: TaskFlowSettings[K],
  ) => Promise<void>;
  updateSettings: (
    updates: Partial<TaskFlowSettings>,
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const TaskFlowSettingsContext =
  createContext<TaskFlowSettingsContextValue | null>(null);

function getStorageKey(userId: string): string {
  return `${SETTINGS_KEY_PREFIX}${userId}`;
}

function isValidReminderMinutes(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1440
  );
}

function sanitizeSettings(value: unknown): TaskFlowSettings {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return { ...DEFAULT_TASKFLOW_SETTINGS };
  }

  const parsed = value as Partial<TaskFlowSettings>;

  return {
    notifications:
      typeof parsed.notifications === 'boolean'
        ? parsed.notifications
        : DEFAULT_TASKFLOW_SETTINGS.notifications,

    reminders:
      typeof parsed.reminders === 'boolean'
        ? parsed.reminders
        : DEFAULT_TASKFLOW_SETTINGS.reminders,

    sound:
      typeof parsed.sound === 'boolean'
        ? parsed.sound
        : DEFAULT_TASKFLOW_SETTINGS.sound,

    compactMode:
      typeof parsed.compactMode === 'boolean'
        ? parsed.compactMode
        : DEFAULT_TASKFLOW_SETTINGS.compactMode,

    autoMoveMissed:
      typeof parsed.autoMoveMissed === 'boolean'
        ? parsed.autoMoveMissed
        : DEFAULT_TASKFLOW_SETTINGS.autoMoveMissed,

    use24HourClock:
      typeof parsed.use24HourClock === 'boolean'
        ? parsed.use24HourClock
        : DEFAULT_TASKFLOW_SETTINGS.use24HourClock,

    defaultReminderMinutes:
      isValidReminderMinutes(parsed.defaultReminderMinutes)
        ? Math.floor(parsed.defaultReminderMinutes)
        : DEFAULT_TASKFLOW_SETTINGS.defaultReminderMinutes,
  };
}

async function readSettings(userId: string): Promise<TaskFlowSettings> {
  try {
    const userKey = getStorageKey(userId);
    const stored = await AsyncStorage.getItem(userKey);

    if (stored) {
      return sanitizeSettings(JSON.parse(stored));
    }

    // Migrate older TaskFlow versions that used one global settings key.
    const legacyStored = await AsyncStorage.getItem(LEGACY_SETTINGS_KEY);

    if (legacyStored) {
      const migrated = sanitizeSettings(JSON.parse(legacyStored));
      await AsyncStorage.setItem(userKey, JSON.stringify(migrated));
      await AsyncStorage.removeItem(LEGACY_SETTINGS_KEY);
      return migrated;
    }

    return { ...DEFAULT_TASKFLOW_SETTINGS };
  } catch (error) {
    console.error('Failed to read TaskFlow settings:', error);
    return { ...DEFAULT_TASKFLOW_SETTINGS };
  }
}

async function writeSettings(
  userId: string,
  settings: TaskFlowSettings,
): Promise<void> {
  const sanitized = sanitizeSettings(settings);

  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(sanitized),
  );
}

function validateSettingValue<K extends keyof TaskFlowSettings>(
  key: K,
  value: TaskFlowSettings[K],
): void {
  switch (key) {
    case 'notifications':
    case 'reminders':
    case 'sound':
    case 'compactMode':
    case 'autoMoveMissed':
    case 'use24HourClock':
      if (typeof value !== 'boolean') {
        throw new Error(`${key} must be true or false.`);
      }
      return;

    case 'defaultReminderMinutes':
      if (!isValidReminderMinutes(value)) {
        throw new Error(
          'Default reminder must be between 0 and 1440 minutes.',
        );
      }
      return;

    default:
      return;
  }
}

export function TaskFlowSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [settings, setSettings] = useState<TaskFlowSettings>({
    ...DEFAULT_TASKFLOW_SETTINGS,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!userId) {
      setSettings({ ...DEFAULT_TASKFLOW_SETTINGS });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const storedSettings = await readSettings(userId);
      setSettings(storedSettings);
    } catch (error) {
      console.error(
        'Failed to refresh TaskFlow settings:',
        error,
      );
      setSettings({ ...DEFAULT_TASKFLOW_SETTINGS });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<TaskFlowSettings>) => {
      if (!userId) {
        throw new Error(
          'Please sign in before changing TaskFlow settings.',
        );
      }

      const nextSettings = sanitizeSettings({
        ...settings,
        ...updates,
      });

      for (const [key, value] of Object.entries(updates) as Array<
        [keyof TaskFlowSettings, TaskFlowSettings[keyof TaskFlowSettings]]
      >) {
        validateSettingValue(key, value);
      }

      const previousSettings = settings;

      setSettings(nextSettings);
      setSaving(true);

      try {
        await writeSettings(userId, nextSettings);
      } catch (error) {
        console.error(
          'Failed to save TaskFlow settings:',
          error,
        );
        setSettings(previousSettings);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [settings, userId],
  );

  const updateSetting = useCallback(
    async <K extends keyof TaskFlowSettings>(
      key: K,
      value: TaskFlowSettings[K],
    ) => {
      validateSettingValue(key, value);
      await updateSettings({ [key]: value } as Partial<TaskFlowSettings>);
    },
    [updateSettings],
  );

  const resetSettings = useCallback(async () => {
    const resetValue = {
      ...DEFAULT_TASKFLOW_SETTINGS,
    };

    if (!userId) {
      setSettings(resetValue);
      return;
    }

    const previousSettings = settings;

    setSettings(resetValue);
    setSaving(true);

    try {
      await writeSettings(userId, resetValue);
    } catch (error) {
      console.error(
        'Failed to reset TaskFlow settings:',
        error,
      );
      setSettings(previousSettings);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [settings, userId]);

  const value = useMemo<TaskFlowSettingsContextValue>(
    () => ({
      settings,
      loading,
      saving,
      updateSetting,
      updateSettings,
      resetSettings,
      refreshSettings,
    }),
    [
      settings,
      loading,
      saving,
      updateSetting,
      updateSettings,
      resetSettings,
      refreshSettings,
    ],
  );

  return (
    <TaskFlowSettingsContext.Provider value={value}>
      {children}
    </TaskFlowSettingsContext.Provider>
  );
}

export function useTaskFlowSettings(): TaskFlowSettingsContextValue {
  const context = useContext(TaskFlowSettingsContext);

  if (!context) {
    throw new Error(
      'useTaskFlowSettings must be used inside TaskFlowSettingsProvider',
    );
  }

  return context;
}
