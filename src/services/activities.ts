import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  cancelActivityReminder,
  scheduleActivityReminder,
} from '@/services/reminders';

import { supabase } from '@/utils/supabase';

/**
 * Supported activity repeat patterns.
 */
export type ActivityRepeat =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

/**
 * Supported activity priorities.
 */
export type ActivityPriority =
  | 'low'
  | 'medium'
  | 'high';

/**
 * Activity returned to the application.
 */
export type Activity = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  category_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  end_time: string | null;
  repeat: ActivityRepeat | string;
  priority: ActivityPriority | string;
  reminder: boolean;
  reminder_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
  carried_forward: boolean;
  original_task_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  category_icon?: string | null;
  category_color?: string | null;
};

/**
 * Data required to create an activity.
 */
export type CreateActivityInput = {
  title: string;
  description?: string;
  category: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time?: string;
  repeat?: ActivityRepeat | string;
  priority?: ActivityPriority | string;
  reminder?: boolean;
  reminder_minutes?: number;
};

/**
 * Data that can be changed when editing an activity.
 */
export type UpdateActivityInput = {
  title?: string;
  description?: string | null;
  category?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  end_time?: string | null;
  repeat?: ActivityRepeat | string;
  priority?: ActivityPriority | string;
  reminder?: boolean;
  reminder_minutes?: number | null;
  completed?: boolean;
};

/**
 * Raw task returned from Supabase.
 */
type TaskRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  task_date: string;
  start_time: string | null;
  end_time: string | null;
  priority: string | null;
  recurrence: string | null;
  reminder_enabled: boolean | null;
  reminder_minutes: number | null;
  completed: boolean | null;
  completed_at: string | null;
  carried_forward: boolean | null;
  original_task_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;

  categories:
    | {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
      }
    | null;
};

/**
 * Local reminder notification mapping.
 */
const REMINDER_KEY =
  '@taskflow_activity_reminders';

/**
 * Local reminder settings.
 */
const SETTINGS_KEY =
  '@taskflow_settings';

type StoredSettings = {
  notifications?: boolean;
  reminders?: boolean;
  sound?: boolean;
  defaultReminderMinutes?: number;
};

/**
 * Make sure the user is authenticated.
 */
async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      'Your session has expired. Please log in again.',
    );
  }

  return user;
}

/**
 * Get reminder notification IDs.
 */
async function getReminderMap(): Promise<
  Record<string, string>
> {
  try {
    const value =
      await AsyncStorage.getItem(
        REMINDER_KEY,
      );

    if (!value) {
      return {};
    }

    const parsed: unknown =
      JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const result: Record<
      string,
      string
    > = {};

    for (const [
      key,
      notificationId,
    ] of Object.entries(
      parsed as Record<
        string,
        unknown
      >,
    )) {
      if (
        typeof notificationId ===
        'string'
      ) {
        result[key] =
          notificationId;
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Save reminder notification IDs.
 */
async function saveReminderMap(
  map: Record<string, string>,
): Promise<void> {
  await AsyncStorage.setItem(
    REMINDER_KEY,
    JSON.stringify(map),
  );
}

/**
 * Cancel and remove a stored reminder.
 */
async function cancelStoredReminder(
  activityId: string,
): Promise<void> {
  const map =
    await getReminderMap();

  const notificationId =
    map[activityId];

  if (notificationId) {
    try {
      await cancelActivityReminder(
        notificationId,
      );
    } catch (error) {
      console.warn(
        'Unable to cancel activity reminder:',
        error,
      );
    }
  }

  delete map[activityId];

  await saveReminderMap(map);
}

/**
 * Get stored reminder settings.
 */
async function getReminderSettings(): Promise<StoredSettings> {
  try {
    const value =
      await AsyncStorage.getItem(
        SETTINGS_KEY,
      );

    if (!value) {
      return {};
    }

    const parsed: unknown =
      JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as StoredSettings;
  } catch {
    return {};
  }
}

/**
 * Schedule or reschedule a reminder.
 *
 * Notification failures must never prevent
 * task creation or updating.
 */
async function syncActivityReminder(
  activity: Activity,
): Promise<void> {
  try {
    await cancelStoredReminder(
      activity.id,
    );

    if (
      activity.completed ||
      activity.deleted_at ||
      !activity.reminder
    ) {
      return;
    }

    const settings =
      await getReminderSettings();

    if (
      settings.notifications ===
        false ||
      settings.reminders === false
    ) {
      return;
    }

    const reminderMinutes =
      activity.reminder_minutes ??
      settings.defaultReminderMinutes ??
      5;

    const notificationId =
      await scheduleActivityReminder({
        activityId: activity.id,
        title: activity.title,
        scheduledDate:
          activity.scheduled_date,
        startTime:
          activity.scheduled_time,
        reminderMinutes,
      });

    if (!notificationId) {
      return;
    }

    const map =
      await getReminderMap();

    map[activity.id] =
      notificationId;

    await saveReminderMap(map);
  } catch (error) {
    console.warn(
      `Unable to schedule reminder for "${activity.title}":`,
      error,
    );
  }
}

/**
 * Convert Supabase TIME into HH:mm.
 */
function normalizeTime(
  time: string | null | undefined,
): string {
  if (!time) {
    return '';
  }

  return time.substring(0, 5);
}

/**
 * Convert Supabase task into app Activity.
 */
function mapTaskToActivity(
  task: TaskRow,
): Activity {
  return {
    id: task.id,
    user_id: task.user_id,
    title: task.title,
    description: task.description,

    category:
      task.categories?.name ??
      'Uncategorized',

    category_id:
      task.category_id,

    scheduled_date:
      task.task_date,

    scheduled_time:
      normalizeTime(
        task.start_time,
      ),

    end_time:
      task.end_time
        ? normalizeTime(
            task.end_time,
          )
        : null,

    repeat:
      task.recurrence ??
      'none',

    priority:
      task.priority ??
      'medium',

    reminder:
      task.reminder_enabled ??
      false,

    reminder_minutes:
      task.reminder_minutes,

    completed:
      task.completed ??
      false,

    completed_at:
      task.completed_at,

    carried_forward:
      task.carried_forward ??
      false,

    original_task_id:
      task.original_task_id,

    created_at:
      task.created_at,

    updated_at:
      task.updated_at,

    deleted_at:
      task.deleted_at ??
      null,

    category_icon:
      task.categories?.icon ??
      null,

    category_color:
      task.categories?.color ??
      null,
  };
}

/**
 * UUID validation.
 */
function isUuid(
  value: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Validate YYYY-MM-DD without timezone conversion.
 */
function isValidDateString(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const daysInMonth =
    new Date(
      year,
      month,
      0,
    ).getDate();

  return day <= daysInMonth;
}

/**
 * Validate HH:mm or HH:mm:ss.
 */
function isValidTimeString(
  value: string,
): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
    value,
  );
}

/**
 * Resolve a category for the authenticated user.
 */
async function getCategoryId(
  category: string,
  userId: string,
): Promise<string> {
  const value =
    category.trim();

  if (!value) {
    throw new Error(
      'Please select a life area for this activity.',
    );
  }

  if (isUuid(value)) {
    const {
      data,
      error,
    } = await supabase
      .from('categories')
      .select('id')
      .eq('id', value)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data.id;
    }

    throw new Error(
      'The selected life area does not belong to your account.',
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .select(
      'id, user_id, name, icon, color, is_default',
    )
    .eq('user_id', userId)
    .ilike('name', value)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  const normalizedName =
    value.toLowerCase();

  let icon = 'apps';
  let color = '#64748B';

  switch (normalizedName) {
    case 'spiritual':
      icon = 'sparkles';
      color = '#8B5CF6';
      break;

    case 'health':
      icon = 'heart';
      color = '#EF4444';
      break;

    case 'relationship':
      icon = 'people';
      color = '#EC4899';
      break;

    case 'career':
      icon = 'briefcase';
      color = '#208AEF';
      break;

    case 'other':
      icon = 'apps';
      color = '#64748B';
      break;

    default:
      icon = 'apps';
      color = '#64748B';
      break;
  }

  const {
    data: createdCategory,
    error: createError,
  } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: value,
      icon,
      color,
      is_default: false,
    })
    .select(
      'id, user_id, name, icon, color, is_default',
    )
    .single();

  if (createError) {
    const {
      data: existingCategory,
      error: existingError,
    } = await supabase
      .from('categories')
      .select(
        'id, user_id, name, icon, color, is_default',
      )
      .eq('user_id', userId)
      .ilike('name', value)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingCategory?.id) {
      return existingCategory.id;
    }

    throw createError;
  }

  if (!createdCategory?.id) {
    throw new Error(
      'The life area could not be created.',
    );
  }

  return createdCategory.id;
}

/**
 * Validate create input.
 */
function validateActivityInput(
  activity: CreateActivityInput,
): void {
  const title =
    activity.title.trim();

  if (!title) {
    throw new Error(
      'Please enter an activity name.',
    );
  }

  if (title.length > 200) {
    throw new Error(
      'Activity names cannot be longer than 200 characters.',
    );
  }

  if (!activity.category.trim()) {
    throw new Error(
      'Please select a life area for this activity.',
    );
  }

  if (
    !isValidDateString(
      activity.scheduled_date,
    )
  ) {
    throw new Error(
      'Please select a valid date for this activity.',
    );
  }

  if (
    !isValidTimeString(
      activity.scheduled_time,
    )
  ) {
    throw new Error(
      'Please select a valid time for this activity.',
    );
  }

  if (
    activity.end_time &&
    !isValidTimeString(
      activity.end_time,
    )
  ) {
    throw new Error(
      'Please select a valid end time.',
    );
  }

  if (
    activity.reminder_minutes !==
      undefined &&
    activity.reminder_minutes < 0
  ) {
    throw new Error(
      'Reminder minutes cannot be negative.',
    );
  }
}

/**
 * Create a task in Supabase.
 */
export async function createActivity(
  activity: CreateActivityInput,
): Promise<Activity> {
  const user =
    await requireUser();

  validateActivityInput(
    activity,
  );

  const categoryId =
    await getCategoryId(
      activity.category,
      user.id,
    );

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      category_id: categoryId,
      title:
        activity.title.trim(),
      description:
        activity.description?.trim() ||
        null,
      task_date:
        activity.scheduled_date,
      start_time:
        activity.scheduled_time,
      end_time:
        activity.end_time?.trim() ||
        null,
      priority:
        activity.priority ??
        'medium',
      recurrence:
        activity.repeat ??
        'none',
      reminder_enabled:
        activity.reminder ??
        true,
      reminder_minutes:
        activity.reminder_minutes ??
        15,
      completed: false,
      completed_at: null,
      carried_forward: false,
      original_task_id: null,
      deleted_at: null,
    })
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'The task was created but could not be retrieved.',
    );
  }

  const created =
    mapTaskToActivity(
      data as TaskRow,
    );

  await syncActivityReminder(
    created,
  );

  return created;
}

/**
 * Fetch every active task belonging to
 * the authenticated user.
 */
export async function fetchActivities(): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('task_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Fetch one task, including Trash.
 */
export async function fetchActivity(
  id: string,
): Promise<Activity> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return mapTaskToActivity(
    data as TaskRow,
  );
}

/**
 * Update a real task in Supabase.
 */
export async function updateActivity(
  id: string,
  updates: UpdateActivityInput,
): Promise<Activity> {
  const user =
    await requireUser();

  const existing =
    await fetchActivity(id);

  if (existing.deleted_at) {
    throw new Error(
      'This task is currently in Trash. Restore it before editing.',
    );
  }

  const cleanedUpdates: Record<
    string,
    unknown
  > = {};

  if (
    updates.title !==
    undefined
  ) {
    const title =
      updates.title.trim();

    if (!title) {
      throw new Error(
        'Task name cannot be empty.',
      );
    }

    if (title.length > 200) {
      throw new Error(
        'Task names cannot be longer than 200 characters.',
      );
    }

    cleanedUpdates.title =
      title;
  }

  if (
    updates.description !==
    undefined
  ) {
    cleanedUpdates.description =
      updates.description?.trim() ||
      null;
  }

  if (
    updates.category !==
    undefined
  ) {
    cleanedUpdates.category_id =
      await getCategoryId(
        updates.category,
        user.id,
      );
  }

  if (
    updates.scheduled_date !==
    undefined
  ) {
    if (
      !isValidDateString(
        updates.scheduled_date,
      )
    ) {
      throw new Error(
        'Please select a valid date.',
      );
    }

    cleanedUpdates.task_date =
      updates.scheduled_date;
  }

  if (
    updates.scheduled_time !==
    undefined
  ) {
    if (
      !isValidTimeString(
        updates.scheduled_time,
      )
    ) {
      throw new Error(
        'Please select a valid start time.',
      );
    }

    cleanedUpdates.start_time =
      updates.scheduled_time;
  }

  if (
    updates.end_time !==
    undefined
  ) {
    if (
      updates.end_time &&
      !isValidTimeString(
        updates.end_time,
      )
    ) {
      throw new Error(
        'Please select a valid end time.',
      );
    }

    cleanedUpdates.end_time =
      updates.end_time?.trim() ||
      null;
  }

  if (
    updates.repeat !==
    undefined
  ) {
    cleanedUpdates.recurrence =
      updates.repeat;
  }

  if (
    updates.priority !==
    undefined
  ) {
    cleanedUpdates.priority =
      updates.priority;
  }

  if (
    updates.reminder !==
    undefined
  ) {
    cleanedUpdates.reminder_enabled =
      updates.reminder;
  }

  if (
    updates.reminder_minutes !==
    undefined
  ) {
    if (
      updates.reminder_minutes !==
        null &&
      updates.reminder_minutes <
        0
    ) {
      throw new Error(
        'Reminder minutes cannot be negative.',
      );
    }

    cleanedUpdates.reminder_minutes =
      updates.reminder_minutes;
  }

  if (
    updates.completed !==
    undefined
  ) {
    cleanedUpdates.completed =
      updates.completed;

    cleanedUpdates.completed_at =
      updates.completed
        ? new Date().toISOString()
        : null;
  }

  if (
    Object.keys(
      cleanedUpdates,
    ).length === 0
  ) {
    return existing;
  }

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .update(cleanedUpdates)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'The task could not be updated.',
    );
  }

  const updated =
    mapTaskToActivity(
      data as TaskRow,
    );

  await syncActivityReminder(
    updated,
  );

  return updated;
}

/**
 * Complete or reopen a task.
 */
export async function updateActivityCompletion(
  id: string,
  completed: boolean,
): Promise<Activity> {
  const user =
    await requireUser();

  const existing =
    await fetchActivity(id);

  if (existing.deleted_at) {
    throw new Error(
      'This task is currently in Trash. Restore it before changing its status.',
    );
  }

  const completedAt =
    completed
      ? new Date().toISOString()
      : null;

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .update({
      completed,
      completed_at:
        completedAt,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'The task status could not be updated.',
    );
  }

  if (completed) {
    await cancelStoredReminder(id);

    const today =
      getLocalDateString();

    const {
      error:
        completionError,
    } = await supabase
      .from('task_completions')
      .upsert(
        {
          task_id: id,
          user_id: user.id,
          completed_date: today,
          completed_at:
            completedAt,
        },
        {
          onConflict:
            'task_id,completed_date',
        },
      );

    if (completionError) {
      console.warn(
        'Task completion history could not be recorded:',
        completionError.message,
      );
    }
  }

  const updated =
    mapTaskToActivity(
      data as TaskRow,
    );

  if (!completed) {
    await syncActivityReminder(
      updated,
    );
  }

  return updated;
}

/**
 * Complete a task.
 */
export async function completeActivity(
  id: string,
): Promise<Activity> {
  return updateActivityCompletion(
    id,
    true,
  );
}

/**
 * Reopen a task.
 */
export async function reopenActivity(
  id: string,
): Promise<Activity> {
  return updateActivityCompletion(
    id,
    false,
  );
}

/**
 * Move a task to Trash.
 */
export async function deleteActivity(
  id: string,
): Promise<void> {
  const user =
    await requireUser();

  const activity =
    await fetchActivity(id);

  if (activity.deleted_at) {
    return;
  }

  await cancelStoredReminder(id);

  const {
    error,
  } = await supabase
    .from('tasks')
    .update({
      deleted_at:
        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }
}

/**
 * Fetch tasks currently in Trash.
 */
export async function fetchTrashedActivities(): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Restore task from Trash.
 */
export async function restoreActivity(
  id: string,
): Promise<void> {
  const user =
    await requireUser();

  const activity =
    await fetchActivity(id);

  if (!activity.deleted_at) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('tasks')
    .update({
      deleted_at: null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  const restored =
    await fetchActivity(id);

  await syncActivityReminder(
    restored,
  );
}

/**
 * Permanently delete one task.
 */
export async function permanentlyDeleteActivity(
  id: string,
): Promise<void> {
  const user =
    await requireUser();

  await cancelStoredReminder(id);

  const {
    error: completionError,
  } = await supabase
    .from('task_completions')
    .delete()
    .eq('task_id', id)
    .eq('user_id', user.id);

  if (completionError) {
    console.warn(
      'Could not remove task completion history:',
      completionError.message,
    );
  }

  const {
    error,
  } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

/**
 * Permanently delete everything currently in Trash.
 */
export async function emptyTrash(): Promise<void> {
  const user =
    await requireUser();

  const {
    data,
    error: fetchError,
  } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null);

  if (fetchError) {
    throw fetchError;
  }

  const ids =
    (data ?? [])
      .map(
        (item) => item.id,
      )
      .filter(
        (id): id is string =>
          typeof id === 'string',
      );

  if (ids.length === 0) {
    return;
  }

  const reminderMap =
    await getReminderMap();

  for (const id of ids) {
    const notificationId =
      reminderMap[id];

    if (notificationId) {
      try {
        await cancelActivityReminder(
          notificationId,
        );
      } catch (error) {
        console.warn(
          'Unable to cancel reminder:',
          error,
        );
      }

      delete reminderMap[id];
    }
  }

  await saveReminderMap(
    reminderMap,
  );

  const {
    error: completionError,
  } = await supabase
    .from('task_completions')
    .delete()
    .eq('user_id', user.id)
    .in('task_id', ids);

  if (completionError) {
    console.warn(
      'Could not remove completion history:',
      completionError.message,
    );
  }

  const {
    error,
  } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', user.id)
    .in('id', ids);

  if (error) {
    throw error;
  }
}

/**
 * Get tasks for a specific date.
 */
export async function fetchActivitiesForDate(
  date: string,
): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('task_date', date)
    .is('deleted_at', null)
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Get tasks between two dates.
 */
export async function fetchActivitiesBetweenDates(
  startDate: string,
  endDate: string,
): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .gte('task_date', startDate)
    .lte('task_date', endDate)
    .is('deleted_at', null)
    .order('task_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Get today's tasks.
 */
export async function fetchTodayActivities(): Promise<Activity[]> {
  return fetchActivitiesForDate(
    getLocalDateString(),
  );
}

/**
 * Get incomplete tasks.
 */
export async function fetchPendingActivities(): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('completed', false)
    .is('deleted_at', null)
    .order('task_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Get completed tasks.
 */
export async function fetchCompletedActivities(): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('completed', true)
    .is('deleted_at', null)
    .order('task_date', {
      ascending: false,
    })
    .order('start_time', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Search real tasks in Supabase.
 */
export async function searchActivities(
  searchTerm: string,
): Promise<Activity[]> {
  const user =
    await requireUser();

  const term =
    searchTerm.trim();

  if (!term) {
    return fetchActivities();
  }

  const escapedTerm =
    term
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .or(
      `title.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%`,
    )
    .order('task_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Find the next upcoming incomplete task.
 */
export async function fetchNextActivity(): Promise<Activity | null> {
  const activities =
    await fetchActivities();

  const now =
    Date.now();

  const upcoming =
    activities
      .filter((activity) => {
        if (activity.completed) {
          return false;
        }

        const dateTime =
          parseLocalDateTime(
            activity.scheduled_date,
            activity.scheduled_time,
          );

        return (
          dateTime.getTime() >= now
        );
      })
      .sort((a, b) => {
        const aTime =
          parseLocalDateTime(
            a.scheduled_date,
            a.scheduled_time,
          ).getTime();

        const bTime =
          parseLocalDateTime(
            b.scheduled_date,
            b.scheduled_time,
          ).getTime();

        return aTime - bTime;
      });

  return upcoming[0] ?? null;
}

/**
 * Get overdue tasks.
 */
export async function fetchOverdueActivities(): Promise<Activity[]> {
  const activities =
    await fetchActivities();

  const now =
    Date.now();

  return activities.filter(
    (activity) => {
      if (activity.completed) {
        return false;
      }

      const dateTime =
        parseLocalDateTime(
          activity.scheduled_date,
          activity.scheduled_time,
        );

      return (
        dateTime.getTime() < now
      );
    },
  );
}

/**
 * Get tasks belonging to a category.
 */
export async function fetchActivitiesByCategory(
  category: string,
): Promise<Activity[]> {
  const user =
    await requireUser();

  const categoryId =
    await getCategoryId(
      category,
      user.id,
    );

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .is('deleted_at', null)
    .order('task_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Get incomplete tasks by priority.
 */
export async function fetchActivitiesByPriority(
  priority: ActivityPriority,
): Promise<Activity[]> {
  const user =
    await requireUser();

  const {
    data,
    error,
  } = await supabase
    .from('tasks')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('priority', priority)
    .eq('completed', false)
    .is('deleted_at', null)
    .order('task_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (task) =>
      mapTaskToActivity(
        task as TaskRow,
      ),
  );
}

/**
 * Compatibility function.
 *
 * Overdue tasks are NOT automatically moved.
 */
export async function carryForwardOverdueActivities(): Promise<Activity[]> {
  return [];
}

/**
 * Move a task exactly one calendar day forward.
 *
 * IMPORTANT:
 * This uses date-only calendar arithmetic rather than
 * JavaScript Date timezone conversion.
 *
 * Example:
 * 2026-09-21 -> 2026-09-22
 *
 * It can never intentionally produce:
 * 2026-09-21 -> 2026-09-23
 * from a single call.
 */
export async function moveActivityToTomorrow(
  id: string,
): Promise<Activity> {
  const activity =
    await fetchActivity(id);

  if (activity.deleted_at) {
    throw new Error(
      'Tasks in Trash cannot be moved.',
    );
  }

  if (activity.completed) {
    throw new Error(
      'Completed tasks cannot be moved to another day.',
    );
  }

  const tomorrow =
    addDaysToDateString(
      activity.scheduled_date,
      1,
    );

  return moveActivityToDate(
    id,
    tomorrow,
    true,
  );
}

/**
 * Move a task to a selected date.
 *
 * `carriedForward` is used internally when the move
 * is specifically the carry-forward operation.
 */
export async function moveActivityToDate(
  id: string,
  date: string,
  carriedForward = false,
): Promise<Activity> {
  if (
    !isValidDateString(date)
  ) {
    throw new Error(
      'Please select a valid date.',
    );
  }

  const activity =
    await fetchActivity(id);

  if (activity.deleted_at) {
    throw new Error(
      'Tasks in Trash cannot be moved.',
    );
  }

  if (activity.completed) {
    throw new Error(
      'Completed tasks cannot be moved to another day.',
    );
  }

  const updates: UpdateActivityInput = {
    scheduled_date: date,
  };

  if (carriedForward) {
    const user =
      await requireUser();

    const originalTaskId =
      activity.original_task_id ??
      activity.id;

    const {
      data,
      error,
    } = await supabase
      .from('tasks')
      .update({
        task_date: date,
        carried_forward: true,
        original_task_id:
          originalTaskId,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select(`
        *,
        categories (
          id,
          name,
          icon,
          color
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        'The task could not be carried forward.',
      );
    }

    const result =
      mapTaskToActivity(
        data as TaskRow,
      );

    await syncActivityReminder(
      result,
    );

    return result;
  }

  return updateActivity(
    id,
    updates,
  );
}

/**
 * Get daily progress.
 */
export async function getDailyProgress(
  date?: string,
): Promise<{
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
}> {
  const activities =
    await fetchActivitiesForDate(
      date ??
        getLocalDateString(),
    );

  const total =
    activities.length;

  const completed =
    activities.filter(
      (activity) =>
        activity.completed,
    ).length;

  const remaining =
    total - completed;

  const percentage =
    total === 0
      ? 0
      : Math.round(
          (completed / total) *
            100,
        );

  return {
    total,
    completed,
    remaining,
    percentage,
  };
}

/**
 * Calculate minutes until task.
 */
export function getMinutesUntilActivity(
  activity: Activity,
): number {
  const activityDateTime =
    parseLocalDateTime(
      activity.scheduled_date,
      activity.scheduled_time,
    );

  return Math.round(
    (activityDateTime.getTime() -
      Date.now()) /
      (1000 * 60),
  );
}

/**
 * Get task status.
 */
export function getActivityStatus(
  activity: Activity,
): 'completed' | 'overdue' | 'upcoming' | 'now' {
  if (activity.completed) {
    return 'completed';
  }

  const minutes =
    getMinutesUntilActivity(
      activity,
    );

  if (minutes < 0) {
    return 'overdue';
  }

  if (minutes <= 1) {
    return 'now';
  }

  return 'upcoming';
}

/**
 * Generate human-friendly countdown.
 */
export function getActivityCountdown(
  activity: Activity,
): string {
  if (activity.completed) {
    return 'Completed';
  }

  const minutes =
    getMinutesUntilActivity(
      activity,
    );

  if (
    minutes <= 1 &&
    minutes >= 0
  ) {
    return 'Starts now';
  }

  if (minutes < 0) {
    const overdueMinutes =
      Math.abs(minutes);

    if (overdueMinutes < 60) {
      return `${overdueMinutes} ${
        overdueMinutes === 1
          ? 'minute'
          : 'minutes'
      } overdue`;
    }

    const hours =
      Math.floor(
        overdueMinutes / 60,
      );

    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    } overdue`;
  }

  if (minutes < 60) {
    return `Starts in ${minutes} ${
      minutes === 1
        ? 'minute'
        : 'minutes'
    }`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return `Starts in ${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    }`;
  }

  const days =
    Math.floor(hours / 24);

  if (days === 1) {
    return 'Starts tomorrow';
  }

  return `Starts in ${days} days`;
}

/**
 * Parse database date/time as local time.
 *
 * This is appropriate for comparing a task's
 * date + time against the device's current time.
 */
export function parseLocalDateTime(
  date: string,
  time: string,
): Date {
  const [
    year,
    month,
    day,
  ] = date
    .split('-')
    .map(Number);

  const [
    hours,
    minutes,
  ] = time
    .substring(0, 5)
    .split(':')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0,
  );
}

/**
 * Add calendar days to YYYY-MM-DD.
 *
 * This intentionally avoids constructing a Date
 * from the YYYY-MM-DD string because task dates are
 * calendar dates, not UTC timestamps.
 */
export function addDaysToDateString(
  dateString: string,
  days: number,
): string {
  if (
    !isValidDateString(
      dateString,
    )
  ) {
    throw new Error(
      `Invalid date: ${dateString}`,
    );
  }

  if (
    !Number.isInteger(days)
  ) {
    throw new Error(
      'The number of days must be a whole number.',
    );
  }

  let [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number);

  let remaining =
    Math.abs(days);

  const direction =
    days >= 0 ? 1 : -1;

  while (remaining > 0) {
    day += direction;

    if (direction > 0) {
      const daysInMonth =
        new Date(
          year,
          month,
          0,
        ).getDate();

      if (
        day > daysInMonth
      ) {
        day = 1;
        month += 1;

        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    } else {
      if (day < 1) {
        month -= 1;

        if (month < 1) {
          month = 12;
          year -= 1;
        }

        day =
          new Date(
            year,
            month,
            0,
          ).getDate();
      }
    }

    remaining -= 1;
  }

  return [
    String(year).padStart(
      4,
      '0',
    ),
    String(month).padStart(
      2,
      '0',
    ),
    String(day).padStart(
      2,
      '0',
    ),
  ].join('-');
}

/**
 * Get local date as YYYY-MM-DD.
 */
export function getLocalDateString(
  date = new Date(),
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get local time as HH:mm.
 */
export function getLocalTimeString(
  date = new Date(),
): string {
  const hours =
    String(
      date.getHours(),
    ).padStart(2, '0');

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(2, '0');

  return `${hours}:${minutes}`;
}
