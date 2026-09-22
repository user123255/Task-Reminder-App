import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useTaskFlowSettings } from '@/hooks/use-taskflow-settings';

import {
  deleteActivity,
  fetchActivities,
  moveActivityToTomorrow,
  updateActivityCompletion,
  type Activity,
} from '@/services/activities';

type FilterType =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'overdue'
  | 'completed';

type PriorityFilter =
  | 'all'
  | 'high'
  | 'medium'
  | 'low';

const COLORS = {
  navy: '#071A2F',
  navy2: '#0B2239',
  navy3: '#102E4A',

  orange: '#FF7A00',
  orangeDark: '#E76500',
  orangeSoft: '#FFF1E5',

  background: '#F5F6F8',
  white: '#FFFFFF',

  text: '#172033',
  muted: '#667085',
  lightMuted: '#98A2B3',

  border: '#E2E6EB',

  success: '#15803D',
  successSoft: '#ECFDF3',

  danger: '#C62828',
  dangerSoft: '#FFF0F0',

  warning: '#B45309',
  warningSoft: '#FFF7E8',
};

const FILTERS: {
  key: FilterType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'all',
    label: 'All Tasks',
    icon: 'grid-outline',
  },
  {
    key: 'today',
    label: 'Today',
    icon: 'today-outline',
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    icon: 'calendar-outline',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: 'alert-circle-outline',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'checkmark-circle-outline',
  },
];

const DEFAULT_LIFE_AREAS = [
  'Spiritual',
  'Health',
  'Relationship',
  'Career',
  'Other',
];

function todayString() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseActivityDate(activity: Activity) {
  if (!activity.scheduled_date) {
    return null;
  }

  const date = new Date(
    `${activity.scheduled_date}T${
      activity.scheduled_time || '00:00:00'
    }`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(dateString?: string | null) {
  if (!dateString) {
    return 'No date';
  }

  const date = new Date(
    `${dateString}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value?: string | null) {
  if (!value) {
    return 'No time';
  }

  const parts = value.split(':');
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) {
    return value;
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    '0',
  )} ${suffix}`;
}

function isToday(activity: Activity) {
  return (
    activity.scheduled_date ===
    todayString()
  );
}

function isUpcoming(activity: Activity) {
  if (activity.completed) {
    return false;
  }

  return (
    Boolean(activity.scheduled_date) &&
    activity.scheduled_date! > todayString()
  );
}

function isOverdue(activity: Activity) {
  if (activity.completed) {
    return false;
  }

  const date = parseActivityDate(activity);

  return Boolean(
    date && date.getTime() < Date.now(),
  );
}

function priorityColor(
  priority?: Activity['priority'],
) {
  if (priority === 'high') {
    return COLORS.danger;
  }

  if (priority === 'low') {
    return COLORS.success;
  }

  return COLORS.orange;
}

function priorityLabel(
  priority?: Activity['priority'],
) {
  if (priority === 'high') {
    return 'High';
  }

  if (priority === 'low') {
    return 'Low';
  }

  return 'Medium';
}

function categoryIcon(
  activity: Activity,
): keyof typeof Ionicons.glyphMap {
  const category =
    activity.category?.toLowerCase();

  if (category === 'health') {
    return 'heart-outline';
  }

  if (category === 'spiritual') {
    return 'sparkles-outline';
  }

  if (category === 'relationship') {
    return 'people-outline';
  }

  if (category === 'career') {
    return 'briefcase-outline';
  }

  return 'grid-outline';
}

function EmptyState({
  filter,
  search,
}: {
  filter: FilterType;
  search: string;
}) {
  let title = 'Your task list is empty';
  let description =
    'Create an activity and start organizing your day.';

  if (search.trim()) {
    title = 'No matching tasks';
    description =
      'Try another search term.';
  } else if (filter === 'today') {
    title = 'Nothing scheduled today';
    description =
      'You do not have any tasks scheduled for today.';
  } else if (filter === 'upcoming') {
    title = 'No upcoming tasks';
    description =
      'Your future schedule is currently clear.';
  } else if (filter === 'overdue') {
    title = 'You are all caught up';
    description =
      'There are no overdue tasks.';
  } else if (filter === 'completed') {
    title = 'No completed tasks';
    description =
      'Completed activities will appear here.';
  }

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="checkmark"
          size={29}
          color={COLORS.orange}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>

      {!search.trim() &&
        filter !== 'completed' && (
          <Pressable
            onPress={() =>
              router.push('/add-activity')
            }
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="add"
              size={17}
              color={COLORS.white}
            />

            <Text style={styles.emptyButtonText}>
              Create Task
            </Text>
          </Pressable>
        )}
    </View>
  );
}

function TaskCard({
  activity,
  compactMode,
  onToggle,
  onOpen,
  onDelete,
  onMove,
}: {
  activity: Activity;
  compactMode: boolean;
  onToggle: (activity: Activity) => void;
  onOpen: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onMove: (activity: Activity) => void;
}) {
  const overdue = isOverdue(activity);
  const color = priorityColor(
    activity.priority,
  );

  return (
    <View
      style={[
        styles.taskCard,
        compactMode && styles.taskCardCompact,
        overdue && styles.taskCardOverdue,
        activity.completed &&
          styles.taskCardCompleted,
      ]}
    >
      <Pressable
        onPress={() => onToggle(activity)}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: Boolean(activity.completed),
        }}
        style={({ pressed }) => [
          styles.checkbox,
          activity.completed &&
            styles.checkboxCompleted,
          pressed && styles.pressed,
        ]}
      >
        {activity.completed && (
          <Ionicons
            name="checkmark"
            size={15}
            color={COLORS.white}
          />
        )}
      </Pressable>

      <Pressable
        onPress={() => onOpen(activity)}
        style={styles.taskBody}
      >
        <View style={styles.taskTitleRow}>
          <Text
            style={[
              styles.taskTitle,
              compactMode &&
                styles.taskTitleCompact,
              activity.completed &&
                styles.completedTitle,
            ]}
          >
            {activity.title ||
              'Untitled task'}
          </Text>

          <View
            style={[
              styles.priorityDot,
              {
                backgroundColor: color,
              },
            ]}
          />
        </View>

        {!compactMode &&
          activity.description && (
            <Text style={styles.taskDescription}>
              {activity.description}
            </Text>
          )}

        <View
          style={[
            styles.metaRow,
            compactMode &&
              styles.metaRowCompact,
          ]}
        >
          <View style={styles.metaItem}>
            <Ionicons
              name={categoryIcon(activity)}
              size={14}
              color={COLORS.orange}
            />

            <Text
              style={styles.metaText}
              numberOfLines={1}
            >
              {activity.category || 'Other'}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={13}
              color={COLORS.lightMuted}
            />

            <Text
              style={styles.metaText}
              numberOfLines={1}
            >
              {formatDate(
                activity.scheduled_date,
              )}
            </Text>
          </View>

          {activity.scheduled_time && (
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={13}
                color={COLORS.lightMuted}
              />

              <Text
                style={styles.metaText}
                numberOfLines={1}
              >
                {formatTime(
                  activity.scheduled_time,
                )}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: `${color}15`,
              },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color },
              ]}
            >
              {priorityLabel(
                activity.priority,
              )}
            </Text>
          </View>

          {overdue && (
            <View style={styles.overdueBadge}>
              <Text
                style={styles.overdueBadgeText}
              >
                Overdue
              </Text>
            </View>
          )}

          {activity.carried_forward && (
            <View style={styles.carriedBadge}>
              <Text
                style={styles.carriedBadgeText}
              >
                Carried forward
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.taskActions}>
        {overdue && (
          <Pressable
            onPress={() => onMove(activity)}
            accessibilityLabel="Move task to tomorrow"
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-forward-circle-outline"
              size={20}
              color={COLORS.orange}
            />
          </Pressable>
        )}

        <Pressable
          onPress={() => onOpen(activity)}
          accessibilityLabel="Open task details"
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={COLORS.muted}
          />
        </Pressable>

        <Pressable
          onPress={() => onDelete(activity)}
          accessibilityLabel="Move task to trash"
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteAction,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={COLORS.danger}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const { width } =
    useWindowDimensions();

  const { displayName } = useAuth();

  const { settings } =
    useTaskFlowSettings();

  const compactMode =
    settings.compactMode;

  const mobile = width < 600;
  const tablet = width >= 600 && width < 1000;
  const desktop = width >= 1000;

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [activeFilter, setActiveFilter] =
    useState<FilterType>('all');

  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>('all');

  const [areaFilter, setAreaFilter] =
    useState('All');

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedTask, setSelectedTask] =
    useState<Activity | null>(null);

  const [deleteTask, setDeleteTask] =
    useState<Activity | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  const [toast, setToast] =
    useState<string | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setToast(message);

      setTimeout(() => {
        setToast(null);
      }, 2800);
    },
    [],
  );

  const loadTasks =
    useCallback(async () => {
      try {
        setError(null);

        const data =
          await fetchActivities();

        setActivities(data);
      } catch (err) {
        console.error(
          'Failed to load tasks:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your tasks.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadTasks();
  };

  const lifeAreas = useMemo(() => {
    const values =
      activities
        .map(
          (activity) =>
            activity.category?.trim(),
        )
        .filter(Boolean) as string[];

    const unique = Array.from(
      new Set(values),
    );

    const ordered =
      DEFAULT_LIFE_AREAS.filter(
        (area) =>
          unique.some(
            (item) =>
              item.toLowerCase() ===
              area.toLowerCase(),
          ),
      );

    const custom = unique.filter(
      (item) =>
        !DEFAULT_LIFE_AREAS.some(
          (area) =>
            area.toLowerCase() ===
            item.toLowerCase(),
        ),
    );

    return [
      'All',
      ...ordered,
      ...custom,
    ];
  }, [activities]);

  const counts = useMemo(
    () => ({
      all: activities.length,

      today: activities.filter(
        isToday,
      ).length,

      upcoming: activities.filter(
        isUpcoming,
      ).length,

      overdue: activities.filter(
        isOverdue,
      ).length,

      completed: activities.filter(
        (activity) =>
          activity.completed,
      ).length,
    }),
    [activities],
  );

  const filteredActivities =
    useMemo(() => {
      let result = [...activities];

      if (activeFilter === 'today') {
        result = result.filter(
          isToday,
        );
      }

      if (activeFilter === 'upcoming') {
        result = result.filter(
          isUpcoming,
        );
      }

      if (activeFilter === 'overdue') {
        result = result.filter(
          isOverdue,
        );
      }

      if (activeFilter === 'completed') {
        result = result.filter(
          (activity) =>
            activity.completed,
        );
      }

      if (priorityFilter !== 'all') {
        result = result.filter(
          (activity) =>
            activity.priority ===
            priorityFilter,
        );
      }

      if (areaFilter !== 'All') {
        result = result.filter(
          (activity) =>
            activity.category
              ?.toLowerCase() ===
            areaFilter.toLowerCase(),
        );
      }

      if (search.trim()) {
        const query =
          search
            .trim()
            .toLowerCase();

        result = result.filter(
          (activity) =>
            activity.title
              ?.toLowerCase()
              .includes(query) ||
            activity.description
              ?.toLowerCase()
              .includes(query) ||
            activity.category
              ?.toLowerCase()
              .includes(query),
        );
      }

      result.sort((a, b) => {
        const aDate =
          parseActivityDate(
            a,
          )?.getTime() ?? 0;

        const bDate =
          parseActivityDate(
            b,
          )?.getTime() ?? 0;

        return aDate - bDate;
      });

      return result;
    }, [
      activities,
      activeFilter,
      priorityFilter,
      areaFilter,
      search,
    ]);

  const toggleTask = async (
    activity: Activity,
  ) => {
    const completed =
      !activity.completed;

    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? {
              ...item,
              completed,
              completed_at: completed
                ? new Date().toISOString()
                : null,
            }
          : item,
      ),
    );

    if (selectedTask?.id === activity.id) {
      setSelectedTask((current) =>
        current
          ? {
              ...current,
              completed,
              completed_at: completed
                ? new Date().toISOString()
                : null,
            }
          : current,
      );
    }

    try {
      await updateActivityCompletion(
        activity.id,
        completed,
      );

      showToast(
        completed
          ? 'Task completed'
          : 'Task reopened',
      );
    } catch (err) {
      console.error(err);

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id
            ? activity
            : item,
        ),
      );

      if (selectedTask?.id === activity.id) {
        setSelectedTask(activity);
      }

      showToast(
        'Could not update the task',
      );
    }
  };

  const moveTask = async (
    activity: Activity,
  ) => {
    try {
      await moveActivityToTomorrow(
        activity.id,
      );

      setSelectedTask(null);

      await loadTasks();

      showToast(
        'Task moved to tomorrow',
      );
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Could not move task',
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTask || deleting) {
      return;
    }

    try {
      setDeleting(true);

      await deleteActivity(
        deleteTask.id,
      );

      setActivities((current) =>
        current.filter(
          (item) =>
            item.id !== deleteTask.id,
        ),
      );

      if (
        selectedTask?.id ===
        deleteTask.id
      ) {
        setSelectedTask(null);
      }

      setDeleteTask(null);

      showToast(
        'Task moved to Trash',
      );
    } catch (err) {
      console.error(err);

      showToast(
        'Could not move task to Trash',
      );
    } finally {
      setDeleting(false);
    }
  };

  const editTask = () => {
    if (!selectedTask) {
      return;
    }

    const id = selectedTask.id;

    setSelectedTask(null);

    router.push({
      pathname: '/add-activity',
      params: {
        edit: String(id),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingLogo}>
          <Ionicons
            name="checkmark"
            size={27}
            color={COLORS.white}
          />
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.orange}
        />

        <Text style={styles.loadingText}>
          Loading your tasks...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.main}>
        {/* TOP BAR */}

        <View
          style={[
            styles.topbar,
            mobile && styles.mobileTopbar,
            tablet && styles.tabletTopbar,
          ]}
        >
          <Pressable
            onPress={() =>
              router.replace('/')
            }
            style={[
              styles.mobileBrand,
              mobile &&
                styles.mobileBrandCompact,
            ]}
          >
            <View style={styles.mobileLogo}>
              <Ionicons
                name="checkmark"
                size={18}
                color={COLORS.white}
              />
            </View>

            {!mobile && (
              <Text
                style={
                  styles.mobileBrandText
                }
              >
                TaskFlow
              </Text>
            )}
          </Pressable>

          <View
            style={[
              styles.search,
              mobile &&
                styles.mobileSearch,
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={COLORS.muted}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tasks..."
              placeholderTextColor={
                COLORS.lightMuted
              }
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="never"
            />

            {search.length > 0 && (
              <Pressable
                onPress={() =>
                  setSearch('')
                }
                accessibilityLabel="Clear search"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={
                    COLORS.lightMuted
                  }
                />
              </Pressable>
            )}
          </View>

          <View style={styles.topActions}>
            <Pressable
              onPress={() =>
                router.push('/ai-assist')
              }
              style={({ pressed }) => [
                styles.aiButton,
                mobile &&
                  styles.aiButtonMobile,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="AI Assist"
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={COLORS.white}
              />

              {desktop && (
                <Text style={styles.aiText}>
                  AI Assist
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                router.push('/settings')
              }
              style={({ pressed }) => [
                styles.avatarButton,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Open settings"
            >
              <Text
                style={
                  styles.avatarButtonText
                }
              >
                {(displayName ||
                  'N')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={COLORS.orange}
            />
          }
          contentContainerStyle={[
            styles.content,
            mobile &&
              styles.mobileContent,
            tablet &&
              styles.tabletContent,
          ]}
        >
          {/* PAGE HERO */}

          <View
            style={[
              styles.pageHero,
              mobile &&
                styles.pageHeroMobile,
              tablet &&
                styles.pageHeroTablet,
            ]}
          >
            <View
              style={styles.heroText}
            >
              <View
                style={styles.orangeLine}
              />

              <Text
                style={styles.heroEyebrow}
              >
                YOUR WORKSPACE
              </Text>

              <Text
                style={styles.pageTitle}
              >
                Tasks
              </Text>

              <Text
                style={styles.pageSubtitle}
              >
                Organize your activities,
                manage priorities, and
                keep your day moving.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push(
                  '/add-activity',
                )
              }
              style={({ pressed }) => [
                styles.newTaskButton,
                mobile &&
                  styles.newTaskButtonMobile,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="add"
                size={19}
                color={COLORS.white}
              />

              <Text
                style={
                  styles.newTaskText
                }
              >
                New Task
              </Text>
            </Pressable>
          </View>

          {/* ERROR */}

          {error && (
            <View
              style={styles.errorBox}
            >
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={COLORS.danger}
              />

              <View
                style={styles.errorBody}
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Couldn't load tasks
                </Text>

                <Text
                  style={styles.errorText}
                >
                  {error}
                </Text>
              </View>

              <Pressable
                onPress={loadTasks}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={styles.retryText}
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          )}

          {/* STATISTICS */}

          <View
            style={[
              styles.statsGrid,
              mobile &&
                styles.statsGridMobile,
            ]}
          >
            <Stat
              icon="grid-outline"
              label="All Tasks"
              value={counts.all}
            />

            <Stat
              icon="today-outline"
              label="Today"
              value={counts.today}
              orange
            />

            <Stat
              icon="calendar-outline"
              label="Upcoming"
              value={counts.upcoming}
            />

            <Stat
              icon="alert-circle-outline"
              label="Overdue"
              value={counts.overdue}
              danger={
                counts.overdue > 0
              }
            />

            <Stat
              icon="checkmark-circle-outline"
              label="Completed"
              value={counts.completed}
              success
            />
          </View>

          {/* FILTERS */}

          <View
            style={styles.filterCard}
          >
            <View
              style={
                styles.filterHeader
              }
            >
              <View
                style={
                  styles.filterHeaderText
                }
              >
                <View
                  style={
                    styles.sectionLabel
                  }
                >
                  <View
                    style={
                      styles.sectionLabelLine
                    }
                  />

                  <Text
                    style={
                      styles.sectionLabelText
                    }
                  >
                    ORGANIZE
                  </Text>
                </View>

                <Text
                  style={
                    styles.filterTitle
                  }
                >
                  Find what you need
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterScroll
              }
            >
              {FILTERS.map(
                (filter) => {
                  const active =
                    activeFilter ===
                    filter.key;

                  return (
                    <Pressable
                      key={
                        filter.key
                      }
                      onPress={() =>
                        setActiveFilter(
                          filter.key,
                        )
                      }
                      style={({ pressed }) => [
                        styles.filterButton,
                        active &&
                          styles.filterButtonActive,
                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={
                          filter.icon
                        }
                        size={16}
                        color={
                          active
                            ? COLORS.white
                            : COLORS.muted
                        }
                      />

                      <Text
                        style={[
                          styles.filterButtonText,
                          active &&
                            styles.filterButtonTextActive,
                        ]}
                      >
                        {
                          filter.label
                        }
                      </Text>

                      <View
                        style={[
                          styles.filterCount,
                          active &&
                            styles.filterCountActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterCountText,
                            active &&
                              styles.filterCountTextActive,
                          ]}
                        >
                          {
                            counts[
                              filter.key
                            ]
                          }
                        </Text>
                      </View>
                    </Pressable>
                  );
                },
              )}
            </ScrollView>

            <View
              style={styles.filterDivider}
            />

            <View
              style={[
                styles.filterGroup,
                mobile &&
                  styles.filterGroupMobile,
              ]}
            >
              <Text
                style={[
                  styles.filterGroupTitle,
                  mobile &&
                    styles.filterGroupTitleMobile,
                ]}
              >
                Priority
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.smallFilterScroll
                }
              >
                {(
                  [
                    [
                      'all',
                      'All',
                    ],
                    [
                      'high',
                      'High',
                    ],
                    [
                      'medium',
                      'Medium',
                    ],
                    [
                      'low',
                      'Low',
                    ],
                  ] as [
                    PriorityFilter,
                    string,
                  ][]
                ).map(
                  ([key, label]) => {
                    const active =
                      priorityFilter ===
                      key;

                    return (
                      <Pressable
                        key={key}
                        onPress={() =>
                          setPriorityFilter(
                            key,
                          )
                        }
                        style={({ pressed }) => [
                          styles.smallFilter,
                          active &&
                            styles.smallFilterActive,
                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        {key !==
                          'all' && (
                          <View
                            style={[
                              styles.prioritySmallDot,
                              {
                                backgroundColor:
                                  priorityColor(
                                    key as Activity['priority'],
                                  ),
                              },
                            ]}
                          />
                        )}

                        <Text
                          style={[
                            styles.smallFilterText,
                            active &&
                              styles.smallFilterTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </ScrollView>
            </View>

            <View
              style={[
                styles.filterGroup,
                mobile &&
                  styles.filterGroupMobile,
              ]}
            >
              <Text
                style={[
                  styles.filterGroupTitle,
                  mobile &&
                    styles.filterGroupTitleMobile,
                ]}
              >
                Life Area
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.smallFilterScroll
                }
              >
                {lifeAreas.map(
                  (area) => {
                    const active =
                      areaFilter ===
                      area;

                    return (
                      <Pressable
                        key={area}
                        onPress={() =>
                          setAreaFilter(
                            area,
                          )
                        }
                        style={({ pressed }) => [
                          styles.smallFilter,
                          active &&
                            styles.smallFilterActive,
                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.smallFilterText,
                            active &&
                              styles.smallFilterTextActive,
                          ]}
                        >
                          {area}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </ScrollView>
            </View>
          </View>

          {/* RESULTS */}

          <View
            style={[
              styles.resultsHeader,
              mobile &&
                styles.resultsHeaderMobile,
            ]}
          >
            <View
              style={
                styles.resultsHeaderText
              }
            >
              <View
                style={
                  styles.sectionLabel
                }
              >
                <View
                  style={
                    styles.sectionLabelLine
                  }
                />

                <Text
                  style={
                    styles.sectionLabelText
                  }
                >
                  ACTIVITIES
                </Text>
              </View>

              <Text
                style={styles.resultsTitle}
              >
                {FILTERS.find(
                  (item) =>
                    item.key ===
                    activeFilter,
                )?.label ||
                  'All Tasks'}
              </Text>

              <Text
                style={
                  styles.resultsSubtitle
                }
              >
                {filteredActivities.length}{' '}
                {filteredActivities.length ===
                1
                  ? 'task'
                  : 'tasks'}
                {search.trim()
                  ? ` matching "${search}"`
                  : ''}
              </Text>
            </View>

            <Pressable
              onPress={refresh}
              style={({ pressed }) => [
                styles.refreshButton,
                mobile &&
                  styles.refreshButtonMobile,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={COLORS.navy}
              />

              {!mobile && (
                <Text
                  style={
                    styles.refreshText
                  }
                >
                  Refresh
                </Text>
              )}
            </Pressable>
          </View>

          {filteredActivities.length ===
          0 ? (
            <EmptyState
              filter={activeFilter}
              search={search}
            />
          ) : (
            <View
              style={styles.taskList}
            >
              {filteredActivities.map(
                (activity) => (
                  <TaskCard
                    key={
                      activity.id
                    }
                    activity={
                      activity
                    }
                    compactMode={
                      compactMode
                    }
                    onToggle={
                      toggleTask
                    }
                    onOpen={
                      setSelectedTask
                    }
                    onDelete={
                      setDeleteTask
                    }
                    onMove={
                      moveTask
                    }
                  />
                ),
              )}
            </View>
          )}

          <View
            style={styles.bottomSpace}
          />
        </ScrollView>
      </View>

      {/* DETAILS MODAL */}

      <Modal
        visible={Boolean(
          selectedTask,
        )}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectedTask(null)
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() =>
              setSelectedTask(null)
            }
          />

          {selectedTask && (
            <View
              style={[
                styles.modal,
                mobile &&
                  styles.modalMobile,
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View
                    style={
                      styles.modalHeaderText
                    }
                  >
                    <View
                      style={
                        styles.sectionLabel
                      }
                    >
                      <View
                        style={
                          styles.sectionLabelLine
                        }
                      />

                      <Text
                        style={
                          styles.sectionLabelText
                        }
                      >
                        TASK DETAILS
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      {
                        selectedTask.title ||
                        'Untitled task'
                      }
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      setSelectedTask(
                        null,
                      )
                    }
                    style={({ pressed }) => [
                      styles.closeButton,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={21}
                      color={
                        COLORS.muted
                      }
                    />
                  </Pressable>
                </View>

                <Text
                  style={
                    styles.modalDescription
                  }
                >
                  {selectedTask.description ||
                    'No description added for this task.'}
                </Text>

                <View
                  style={
                    styles.detailGrid
                  }
                >
                  <Detail
                    icon="grid-outline"
                    label="Life Area"
                    value={
                      selectedTask.category ||
                      'Other'
                    }
                  />

                  <Detail
                    icon="calendar-outline"
                    label="Date"
                    value={formatDate(
                      selectedTask.scheduled_date,
                    )}
                  />

                  <Detail
                    icon="time-outline"
                    label="Time"
                    value={formatTime(
                      selectedTask.scheduled_time,
                    )}
                  />

                  <Detail
                    icon="flag-outline"
                    label="Priority"
                    value={priorityLabel(
                      selectedTask.priority,
                    )}
                  />

                  <Detail
                    icon="repeat-outline"
                    label="Repeat"
                    value={
                      selectedTask.repeat ||
                      'None'
                    }
                  />

                  <Detail
                    icon="notifications-outline"
                    label="Reminder"
                    value={
                      selectedTask.reminder
                        ? `${selectedTask.reminder_minutes ?? 15} min before`
                        : 'Off'
                    }
                  />
                </View>

                {isOverdue(
                  selectedTask,
                ) && (
                  <View
                    style={
                      styles.warningBox
                    }
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={22}
                      color={
                        COLORS.danger
                      }
                    />

                    <View
                      style={
                        styles.warningBody
                      }
                    >
                      <Text
                        style={
                          styles.warningTitle
                        }
                      >
                        This task is overdue
                      </Text>

                      <Text
                        style={
                          styles.warningText
                        }
                      >
                        You can move it to tomorrow
                        or edit its schedule.
                      </Text>
                    </View>
                  </View>
                )}

                <View
                  style={
                    styles.modalActions
                  }
                >
                  <Pressable
                    onPress={editTask}
                    style={({ pressed }) => [
                      styles.modalAction,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={
                        COLORS.navy
                      }
                    />

                    <Text
                      style={
                        styles.modalActionText
                      }
                    >
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      toggleTask(
                        selectedTask,
                      )
                    }
                    style={({ pressed }) => [
                      styles.modalAction,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={
                        selectedTask.completed
                          ? 'refresh-outline'
                          : 'checkmark-outline'
                      }
                      size={18}
                      color={
                        COLORS.navy
                      }
                    />

                    <Text
                      style={
                        styles.modalActionText
                      }
                    >
                      {selectedTask.completed
                        ? 'Reopen'
                        : 'Complete'}
                    </Text>
                  </Pressable>

                  {isOverdue(
                    selectedTask,
                  ) && (
                    <Pressable
                      onPress={() =>
                        moveTask(
                          selectedTask,
                        )
                      }
                      style={({ pressed }) => [
                        styles.modalAction,
                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="arrow-forward-outline"
                        size={18}
                        color={
                          COLORS.orange
                        }
                      />

                      <Text
                        style={[
                          styles.modalActionText,
                          {
                            color:
                              COLORS.orange,
                          },
                        ]}
                      >
                        Tomorrow
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => {
                      setSelectedTask(
                        null,
                      );
                      setDeleteTask(
                        selectedTask,
                      );
                    }}
                    style={({ pressed }) => [
                      styles.modalAction,
                      styles.modalDangerAction,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={
                        COLORS.danger
                      }
                    />

                    <Text
                      style={
                        styles.modalDangerText
                      }
                    >
                      Trash
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* DELETE MODAL */}

      <Modal
        visible={Boolean(
          deleteTask,
        )}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDeleteTask(null)
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <Pressable
            style={styles.backdrop}
            onPress={() =>
              setDeleteTask(null)
            }
          />

          {deleteTask && (
            <View
              style={[
                styles.confirmModal,
                mobile &&
                  styles.confirmModalMobile,
              ]}
            >
              <View
                style={
                  styles.confirmIcon
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={25}
                  color={
                    COLORS.danger
                  }
                />
              </View>

              <Text
                style={
                  styles.confirmTitle
                }
              >
                Move to Trash?
              </Text>

              <Text
                style={
                  styles.confirmText
                }
              >
                This task will be moved to
                Trash. You can restore it later.
              </Text>

              <View
                style={
                  styles.confirmTask
                }
              >
                <Text
                  style={
                    styles.confirmTaskTitle
                  }
                >
                  {deleteTask.title ||
                    'Untitled task'}
                </Text>

                <Text
                  style={
                    styles.confirmTaskMeta
                  }
                >
                  {formatDate(
                    deleteTask.scheduled_date,
                  )}
                  {' • '}
                  {formatTime(
                    deleteTask.scheduled_time,
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.confirmActions,
                  mobile &&
                    styles.confirmActionsMobile,
                ]}
              >
                <Pressable
                  onPress={() =>
                    setDeleteTask(
                      null,
                    )
                  }
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.cancelText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={deleting}
                  onPress={
                    confirmDelete
                  }
                  style={({ pressed }) => [
                    styles.deleteConfirmButton,
                    deleting &&
                      styles.disabled,
                    pressed &&
                      !deleting &&
                      styles.pressed,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.deleteConfirmText
                        }
                      >
                        Move to Trash
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {toast && (
        <View
          style={[
            styles.toast,
            mobile &&
              styles.toastMobile,
          ]}
        >
          <View
            style={styles.toastIcon}
          >
            <Ionicons
              name="checkmark"
              size={15}
              color={
                COLORS.white
              }
            />
          </View>

          <Text
            style={styles.toastText}
          >
            {toast}
          </Text>
        </View>
      )}
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  orange,
  danger,
  success,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  orange?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  const iconColor = danger
    ? COLORS.danger
    : success
      ? COLORS.success
      : orange
        ? COLORS.orange
        : COLORS.navy;

  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              danger
                ? COLORS.dangerSoft
                : success
                  ? COLORS.successSoft
                  : orange
                    ? COLORS.orangeSoft
                    : '#EEF2F6',
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={iconColor}
        />
      </View>

      <Text
        style={styles.statLabel}
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.statNumber,
          danger &&
            styles.dangerNumber,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <View
        style={styles.detailIcon}
      >
        <Ionicons
          name={icon}
          size={16}
          color={COLORS.orange}
        />
      </View>

      <View
        style={styles.detailBody}
      >
        <Text
          style={styles.detailLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.detailValue}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      COLORS.background,
    padding: 24,
  },

  loadingLogo: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor:
      COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  topbar: {
    minHeight: 76,
    backgroundColor:
      COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  mobileTopbar: {
    minHeight: 66,
    paddingHorizontal: 12,
    gap: 8,
  },

  tabletTopbar: {
    paddingHorizontal: 16,
  },

  mobileBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },

  mobileBrandCompact: {
    width: 35,
  },

  mobileLogo: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor:
      COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mobileBrandText: {
    marginLeft: 8,
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
  },

  search: {
    flex: 1,
    minWidth: 0,
    maxWidth: 680,
    height: 43,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    backgroundColor:
      '#FAFBFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  mobileSearch: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 9,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
    color: COLORS.text,
    fontSize: 12,
    outlineStyle: 'none',
  } as any,

  topActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  aiButton: {
    height: 41,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor:
      COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  aiButtonMobile: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    borderRadius: 10,
  },

  aiText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarButtonText: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: '900',
  },

  content: {
    width: '100%',
    maxWidth: 1420,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 40,
  },

  mobileContent: {
    padding: 14,
    paddingBottom: 30,
  },

  tabletContent: {
    padding: 18,
    paddingBottom: 35,
  },

  pageHero: {
    minHeight: 205,
    borderRadius: 21,
    backgroundColor:
      COLORS.navy,
    padding: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    overflow: 'hidden',
  },

  pageHeroTablet: {
    padding: 23,
  },

  pageHeroMobile: {
    minHeight: 0,
    padding: 20,
    borderRadius: 18,
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  heroText: {
    flex: 1,
    minWidth: 0,
  },

  orangeLine: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor:
      COLORS.orange,
    marginBottom: 12,
  },

  heroEyebrow: {
    color: '#B4C5D5',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  pageTitle: {
    color: COLORS.white,
    fontSize: 35,
    fontWeight: '900',
    marginTop: 5,
    letterSpacing: -0.7,
  },

  pageSubtitle: {
    color: '#C3D0DC',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 550,
  },

  newTaskButton: {
    minHeight: 45,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor:
      COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginLeft: 20,
    flexShrink: 0,
  },

  newTaskButtonMobile: {
    marginLeft: 0,
    marginTop: 18,
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
  },

  newTaskText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  errorBox: {
    borderRadius: 14,
    backgroundColor:
      COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#F4C7C7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },

  errorBody: {
    flex: 1,
    minWidth: 0,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '900',
  },

  errorText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  retryButton: {
    backgroundColor:
      COLORS.danger,
    borderRadius: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexShrink: 0,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },

  statsGridMobile: {
    gap: 9,
  },

  statCard: {
    flex: 1,
    minWidth: 145,
    minHeight: 110,
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 15,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 10,
  },

  statNumber: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },

  dangerNumber: {
    color: COLORS.danger,
  },

  filterCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 17,
    padding: 17,
    marginBottom: 26,
  },

  filterHeader: {
    marginBottom: 14,
  },

  filterHeaderText: {
    minWidth: 0,
  },

  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },

  sectionLabelLine: {
    width: 23,
    height: 3,
    borderRadius: 2,
    backgroundColor:
      COLORS.orange,
  },

  sectionLabelText: {
    color: COLORS.orange,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  filterTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  filterScroll: {
    gap: 7,
    paddingRight: 4,
  },

  filterButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor:
      '#F3F5F7',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.orange,
  },

  filterButtonText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },

  filterButtonTextActive: {
    color: COLORS.white,
  },

  filterCount: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor:
      '#E6E9ED',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  filterCountActive: {
    backgroundColor:
      'rgba(255,255,255,0.22)',
  },

  filterCountText: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '900',
  },

  filterCountTextActive: {
    color: COLORS.white,
  },

  filterDivider: {
    height: 1,
    backgroundColor:
      COLORS.border,
    marginVertical: 15,
  },

  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    minWidth: 0,
  },

  filterGroupMobile: {
    alignItems: 'flex-start',
  },

  filterGroupTitle: {
    width: 72,
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '900',
    flexShrink: 0,
    paddingTop: 9,
  },

  filterGroupTitleMobile: {
    width: 68,
  },

  smallFilterScroll: {
    paddingRight: 4,
  },

  smallFilter: {
    minHeight: 32,
    borderRadius: 7,
    backgroundColor:
      '#F4F6F8',
    paddingHorizontal: 10,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  smallFilterActive: {
    backgroundColor:
      COLORS.orangeSoft,
    borderWidth: 1,
    borderColor:
      '#FFD0AA',
  },

  smallFilterText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
  },

  smallFilterTextActive: {
    color: COLORS.orangeDark,
  },

  prioritySmallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  resultsHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 13,
  },

  resultsHeaderMobile: {
    alignItems: 'flex-start',
  },

  resultsHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  resultsTitle: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '900',
  },

  resultsSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  refreshButton: {
    height: 35,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 8,
    backgroundColor:
      COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 0,
  },

  refreshButtonMobile: {
    width: 36,
    paddingHorizontal: 0,
  },

  refreshText: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '800',
  },

  taskList: {
    gap: 10,
  },

  taskCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },

  taskCardCompact: {
    paddingVertical: 10,
  },

  taskCardOverdue: {
    borderColor: '#F2C8C8',
  },

  taskCardCompleted: {
    opacity: 0.68,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD2DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    marginTop: 2,
    flexShrink: 0,
  },

  checkboxCompleted: {
    backgroundColor:
      COLORS.orange,
    borderColor:
      COLORS.orange,
  },

  taskBody: {
    flex: 1,
    minWidth: 0,
  },

  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },

  taskTitle: {
    flex: 1,
    minWidth: 0,
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
  },

  taskTitleCompact: {
    fontSize: 12,
    lineHeight: 18,
  },

  completedTitle: {
    color: COLORS.muted,
    textDecorationLine:
      'line-through',
  },

  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 8,
    flexShrink: 0,
  },

  taskDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 9,
  },

  metaRowCompact: {
    marginTop: 4,
    gap: 7,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },

  metaText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
    flexShrink: 1,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },

  priorityBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  priorityText: {
    fontSize: 8,
    fontWeight: '900',
  },

  overdueBadge: {
    backgroundColor:
      COLORS.dangerSoft,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  overdueBadgeText: {
    color: COLORS.danger,
    fontSize: 8,
    fontWeight: '900',
  },

  carriedBadge: {
    backgroundColor:
      '#F1EEFF',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  carriedBadgeText: {
    color: '#6941C6',
    fontSize: 8,
    fontWeight: '900',
  },

  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
    flexShrink: 0,
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor:
      '#F6F7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteAction: {
    backgroundColor:
      '#FFF5F5',
  },

  emptyState: {
    minHeight: 300,
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  emptyIcon: {
    width: 63,
    height: 63,
    borderRadius: 19,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },

  emptyDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 360,
    marginTop: 4,
  },

  emptyButton: {
    minHeight: 39,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor:
      COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  bottomSpace: {
    height: 30,
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor:
      'rgba(7,26,47,0.58)',
  },

  modal: {
    width: '100%',
    maxWidth: 650,
    maxHeight: '90%',
    backgroundColor:
      COLORS.white,
    borderRadius: 22,
    padding: 23,
  },

  modalMobile: {
    maxHeight: '88%',
    borderRadius: 18,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  modalTitle: {
    color: COLORS.navy,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 3,
  },

  closeButton: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor:
      '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  modalDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 15,
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 17,
  },

  detail: {
    flex: 1,
    minWidth: 190,
    backgroundColor:
      '#F8F9FA',
    borderRadius: 11,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  detailBody: {
    flex: 1,
    minWidth: 0,
  },

  detailLabel: {
    color: COLORS.lightMuted,
    fontSize: 8,
    fontWeight: '800',
  },

  detailValue: {
    color: COLORS.navy,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    marginTop: 3,
  },

  warningBox: {
    marginTop: 15,
    borderRadius: 11,
    backgroundColor:
      COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#F3C7C7',
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  warningBody: {
    flex: 1,
    minWidth: 0,
  },

  warningTitle: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '900',
  },

  warningText: {
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },

  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 18,
    paddingBottom: 2,
  },

  modalAction: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor:
      '#F2F4F6',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  modalActionText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '900',
  },

  modalDangerAction: {
    backgroundColor:
      COLORS.dangerSoft,
  },

  modalDangerText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '900',
  },

  confirmModal: {
    width: '100%',
    maxWidth: 430,
    backgroundColor:
      COLORS.white,
    borderRadius: 21,
    padding: 24,
    alignItems: 'center',
  },

  confirmModalMobile: {
    maxWidth: '100%',
    padding: 20,
    borderRadius: 18,
  },

  confirmIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor:
      COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmTitle: {
    color: COLORS.navy,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 13,
    textAlign: 'center',
  },

  confirmText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: 5,
  },

  confirmTask: {
    width: '100%',
    borderRadius: 10,
    backgroundColor:
      '#F7F8F9',
    padding: 11,
    marginTop: 15,
  },

  confirmTaskTitle: {
    color: COLORS.navy,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
  },

  confirmTaskMeta: {
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  confirmActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 17,
  },

  confirmActionsMobile: {
    flexDirection: 'column-reverse',
  },

  cancelButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 9,
    backgroundColor:
      '#EEF1F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '900',
  },

  deleteConfirmButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 9,
    backgroundColor:
      COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },

  deleteConfirmText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },

  disabled: {
    opacity: 0.6,
  },

  toast: {
    position: 'absolute',
    left: 20,
    bottom: 25,
    maxWidth: 360,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor:
      COLORS.navy,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 8,
  },

  toastMobile: {
    left: 14,
    right: 14,
    bottom: 18,
    maxWidth: undefined,
  },

  toastIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor:
      COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  toastText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.78,
  },
});