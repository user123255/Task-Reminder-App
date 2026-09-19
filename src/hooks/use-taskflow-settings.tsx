import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/use-auth";

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

const SETTINGS_KEY_PREFIX = "@taskflow_settings:";

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

function getStorageKey(userId: string) {
  return `${SETTINGS_KEY_PREFIX}${userId}`;
}

async function readSettings(
  userId: string,
): Promise<TaskFlowSettings> {
  try {
    const stored = await AsyncStorage.getItem(
      getStorageKey(userId),
    );

    if (!stored) {
      return { ...DEFAULT_TASKFLOW_SETTINGS };
    }

    const parsed: unknown = JSON.parse(stored);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULT_TASKFLOW_SETTINGS };
    }

    return {
      ...DEFAULT_TASKFLOW_SETTINGS,
      ...(parsed as Partial<TaskFlowSettings>),
    };
  } catch (error) {
    console.error(
      "Failed to read TaskFlow settings:",
      error,
    );

    return { ...DEFAULT_TASKFLOW_SETTINGS };
  }
}

async function writeSettings(
  userId: string,
  settings: TaskFlowSettings,
) {
  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(settings),
  );
}

export function TaskFlowSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [settings, setSettings] =
    useState<TaskFlowSettings>({
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
      const storedSettings =
        await readSettings(userId);

      setSettings(storedSettings);
    } catch (error) {
      console.error(
        "Failed to refresh TaskFlow settings:",
        error,
      );

      setSettings({
        ...DEFAULT_TASKFLOW_SETTINGS,
      });
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
        return;
      }

      const previousSettings = settings;

      const nextSettings: TaskFlowSettings = {
        ...settings,
        ...updates,
      };

      setSettings(nextSettings);
      setSaving(true);

      try {
        await writeSettings(
          userId,
          nextSettings,
        );
      } catch (error) {
        console.error(
          "Failed to save TaskFlow settings:",
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
      await updateSettings({
        [key]: value,
      } as Partial<TaskFlowSettings>);
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
      await writeSettings(
        userId,
        resetValue,
      );
    } catch (error) {
      console.error(
        "Failed to reset TaskFlow settings:",
        error,
      );

      setSettings(previousSettings);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [settings, userId]);

  const value = useMemo(
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

export function useTaskFlowSettings() {
  const context = useContext(
    TaskFlowSettingsContext,
  );

  if (!context) {
    throw new Error(
      "useTaskFlowSettings must be used inside TaskFlowSettingsProvider",
    );
  }

  return context;
}
