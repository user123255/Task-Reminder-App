import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

const BLUE = '#208AEF';
const BACKGROUND = '#F6F8FC';
const TEXT = '#172033';
const MUTED = '#71809A';
const BORDER = '#E3E9F2';
const WHITE = '#FFFFFF';

const DEFAULT_LIFE_AREAS = [
  'Spiritual',
  'Health',
  'Relationship',
  'Career',
  'Other',
];

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Tasks' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
];

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseActivityDate(activity: Activity) {
  if (!activity.scheduled_date) {
    return null;
  }

  const time = activity.scheduled_time || '00:00:00';

  return new Date(`${activity.scheduled_date}T${time}`);
}

function formatDate(dateString: string) {
  if (!dateString) {
    return '';
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(time?: string | null) {
  if (!time) {
    return '';
  }

  const parts = time.split(':');
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function getPriorityLabel(priority?: Activity['priority']) {
  switch (priority) {
    case 'high':
      return 'High';
    case 'low':
      return 'Low';
    default:
      return 'Medium';
  }
}

function getPriorityColor(priority?: Activity['priority']) {
  switch (priority) {
    case 'high':
      return '#EF4444';
    case 'low':
      return '#22C55E';
    default:
      return '#F59E0B';
  }
}

function getCategoryIcon(activity: Activity) {
  if (activity.category_icon) {
    return activity.category_icon;
  }

  switch (activity.category?.toLowerCase()) {
    case 'spiritual':
      return '🙏';
    case 'health':
      return '❤️';
    case 'relationship':
      return '🤝';
    case 'career':
      return '💼';
    case 'other':
      return '✨';
    default:
      return '✓';
  }
}

function isOverdue(activity: Activity) {
  if (activity.completed) {
    return false;
  }

  const activityDate = parseActivityDate(activity);

  if (!activityDate) {
    return false;
  }

  return activityDate.getTime() < Date.now();
}

function isToday(activity: Activity) {
  return activity.scheduled_date === getTodayString();
}

function isUpcoming(activity: Activity) {
  if (activity.completed) {
    return false;
  }

  return activity.scheduled_date > getTodayString();
}

function EmptyState({
  filter,
  search,
}: {
  filter: FilterType;
  search: string;
}) {
  let title = 'No tasks yet';
  let subtitle =
    'Create your first task and start organizing your day.';

  if (search.trim()) {
    title = 'No matching tasks';
    subtitle = 'Try a different search term.';
  } else if (filter === 'today') {
    title = 'Nothing scheduled today';
    subtitle = 'You have no tasks scheduled for today.';
  } else if (filter === 'upcoming') {
    title = 'No upcoming tasks';
    subtitle = 'Your future schedule is clear.';
  } else if (filter === 'overdue') {
    title = 'You are all caught up';
    subtitle = 'There are no overdue tasks.';
  } else if (filter === 'completed') {
    title = 'No completed tasks';
    subtitle = 'Completed tasks will appear here.';
  }

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>✓</Text>
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>

      <Text style={styles.emptySubtitle}>{subtitle}</Text>

      {!search.trim() && filter !== 'completed' && (
        <Pressable
          style={styles.emptyButton}
          onPress={() => router.push('/add-activity')}
        >
          <Text style={styles.emptyButtonText}>
            + Create Task
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function TaskCard({
  activity,
  onToggle,
  onDelete,
  onMoveToTomorrow,
  onOpen,
}: {
  activity: Activity;
  onToggle: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onMoveToTomorrow: (activity: Activity) => void;
  onOpen: (activity: Activity) => void;
}) {
  const overdue = isOverdue(activity);

  return (
    <View
      style={[
        styles.taskCard,
        activity.completed && styles.taskCardCompleted,
        overdue && styles.taskCardOverdue,
      ]}
    >
      <Pressable
        onPress={() => onToggle(activity)}
        style={[
          styles.checkbox,
          activity.completed && styles.checkboxCompleted,
        ]}
      >
        {activity.completed && (
          <Text style={styles.checkboxCheck}>✓</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.taskMain}
        onPress={() => onOpen(activity)}
      >
        <View style={styles.taskTopRow}>
          <Text
            numberOfLines={2}
            style={[
              styles.taskTitle,
              activity.completed && styles.taskTitleCompleted,
            ]}
          >
            {activity.title}
          </Text>

          <View
            style={[
              styles.priorityDot,
              {
                backgroundColor: getPriorityColor(
                  activity.priority,
                ),
              },
            ]}
          />
        </View>

        {activity.description ? (
          <Text
            numberOfLines={2}
            style={styles.taskDescription}
          >
            {activity.description}
          </Text>
        ) : null}

        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>
              {getCategoryIcon(activity)}
            </Text>

            <Text style={styles.metaText}>
              {activity.category || 'Other'}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📅</Text>

            <Text style={styles.metaText}>
              {formatDate(activity.scheduled_date)}
            </Text>
          </View>

          {activity.scheduled_time ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🕐</Text>

              <Text style={styles.metaText}>
                {formatTime(activity.scheduled_time)}
              </Text>
            </View>
          ) : null}

          {activity.repeat && activity.repeat !== 'none' ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>↻</Text>

              <Text style={styles.metaText}>
                {activity.repeat}
              </Text>
            </View>
          ) : null}

          {activity.reminder ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🔔</Text>

              <Text style={styles.metaText}>
                {activity.reminder_minutes ?? 15} min
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.taskBottomRow}>
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: `${getPriorityColor(
                  activity.priority,
                )}14`,
              },
            ]}
          >
            <Text
              style={[
                styles.priorityBadgeText,
                {
                  color: getPriorityColor(activity.priority),
                },
              ]}
            >
              {getPriorityLabel(activity.priority)}
            </Text>
          </View>

          {overdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>
                Overdue
              </Text>
            </View>
          )}

          {activity.carried_forward && (
            <View style={styles.carriedBadge}>
              <Text style={styles.carriedBadgeText}>
                Carried forward
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.taskActions}>
        {overdue && (
          <Pressable
            style={styles.actionButton}
            onPress={() => onMoveToTomorrow(activity)}
          >
            <Text style={styles.moveIcon}>↷</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.actionButton}
          onPress={() => onOpen(activity)}
        >
          <Text style={styles.actionIcon}>⋯</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.deleteActionButton]}
          onPress={() => onDelete(activity)}
        >
          <Text style={styles.deleteIcon}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 900;
  const isSmallMobile = width < 430;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<FilterType>('all');
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>('all');
  const [areaFilter, setAreaFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null);

  const [trashActivity, setTrashActivity] =
    useState<Activity | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (
      type: 'success' | 'error',
      message: string,
    ) => {
      setToast({ type, message });

      setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    [],
  );

  const loadTasks = useCallback(async () => {
    try {
      setError(null);

      const data = await fetchActivities();

      setActivities(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
  };

  const lifeAreas = useMemo(() => {
    const categories = activities
      .map((activity) => activity.category?.trim())
      .filter(Boolean) as string[];

    const unique = Array.from(
      new Set(
        categories.map(
          (category) =>
            category.charAt(0).toUpperCase() +
            category.slice(1),
        ),
      ),
    );

    const ordered = DEFAULT_LIFE_AREAS.filter((area) =>
      unique.some(
        (item) => item.toLowerCase() === area.toLowerCase(),
      ),
    );

    const custom = unique.filter(
      (item) =>
        !DEFAULT_LIFE_AREAS.some(
          (area) =>
            area.toLowerCase() === item.toLowerCase(),
        ),
    );

    return ['All', ...ordered, ...custom];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    let result = [...activities];

    if (activeFilter === 'today') {
      result = result.filter(isToday);
    }

    if (activeFilter === 'upcoming') {
      result = result.filter(isUpcoming);
    }

    if (activeFilter === 'overdue') {
      result = result.filter(isOverdue);
    }

    if (activeFilter === 'completed') {
      result = result.filter(
        (activity) => activity.completed,
      );
    }

    if (priorityFilter !== 'all') {
      result = result.filter(
        (activity) => activity.priority === priorityFilter,
      );
    }

    if (areaFilter !== 'All') {
      result = result.filter(
        (activity) =>
          activity.category?.toLowerCase() ===
          areaFilter.toLowerCase(),
      );
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((activity) => {
        return (
          activity.title.toLowerCase().includes(query) ||
          activity.description
            ?.toLowerCase()
            .includes(query) ||
          activity.category
            ?.toLowerCase()
            .includes(query)
        );
      });
    }

    result.sort((a, b) => {
      const aDate =
        parseActivityDate(a)?.getTime() ?? 0;

      const bDate =
        parseActivityDate(b)?.getTime() ?? 0;

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

  const counts = useMemo(() => {
    return {
      all: activities.length,
      today: activities.filter(isToday).length,
      upcoming: activities.filter(isUpcoming).length,
      overdue: activities.filter(isOverdue).length,
      completed: activities.filter(
        (activity) => activity.completed,
      ).length,
    };
  }, [activities]);

  const handleToggle = async (activity: Activity) => {
    const newCompletedState = !activity.completed;

    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? {
              ...item,
              completed: newCompletedState,
              completed_at: newCompletedState
                ? new Date().toISOString()
                : null,
            }
          : item,
      ),
    );

    setSelectedActivity((current) =>
      current?.id === activity.id
        ? {
            ...current,
            completed: newCompletedState,
            completed_at: newCompletedState
              ? new Date().toISOString()
              : null,
          }
        : current,
    );

    try {
      await updateActivityCompletion(
        activity.id,
        newCompletedState,
      );

      showToast(
        'success',
        newCompletedState
          ? 'Task completed ✓'
          : 'Task reopened',
      );
    } catch (err) {
      console.error('Failed to update task:', err);

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id ? activity : item,
        ),
      );

      setSelectedActivity((current) =>
        current?.id === activity.id
          ? activity
          : current,
      );

      showToast(
        'error',
        'Could not update the task. Please try again.',
      );
    }
  };

  const handleDelete = (activity: Activity) => {
    setSelectedActivity(null);
    setTrashActivity(activity);
  };

  const confirmDelete = async () => {
    if (!trashActivity || isDeleting) {
      return;
    }

    const activity = trashActivity;

    try {
      setIsDeleting(true);

      await deleteActivity(activity.id);

      setActivities((current) =>
        current.filter(
          (item) => item.id !== activity.id,
        ),
      );

      setSelectedActivity(null);
      setTrashActivity(null);

      showToast(
        'success',
        `"${activity.title}" moved to Trash`,
      );
    } catch (err) {
      console.error(
        'Failed to move task to trash:',
        err,
      );

      showToast(
        'error',
        'Could not move the task to Trash. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveToTomorrow = (activity: Activity) => {
    setSelectedActivity(null);

    moveToTomorrow(activity);
  };

  const moveToTomorrow = async (activity: Activity) => {
    try {
      await moveActivityToTomorrow(activity.id);

      await loadTasks();

      showToast(
        'success',
        `"${activity.title}" moved to tomorrow`,
      );
    } catch (err) {
      console.error(
        'Failed to move task:',
        err,
      );

      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Could not move the task. Please try again.',
      );
    }
  };

  const openActivity = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const closeActivity = () => {
    setSelectedActivity(null);
  };

  const editActivity = () => {
    if (!selectedActivity) {
      return;
    }

    const id = selectedActivity.id;

    setSelectedActivity(null);

    router.push({
      pathname: '/add-activity',
      params: {
        edit: id,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>✓</Text>
        </View>

        <ActivityIndicator
          size="large"
          color={BLUE}
        />

        <Text style={styles.loadingText}>
          Loading your tasks...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isDesktop && (
        <View style={styles.sidebar}>
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Text style={styles.logoCheck}>✓</Text>
            </View>

            <Text style={styles.logoText}>
              TaskFlow
            </Text>
          </View>

          <Text style={styles.workspaceLabel}>
            WORKSPACE
          </Text>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.sideIcon}>⌂</Text>
            <Text style={styles.sideText}>Home</Text>
          </Pressable>

          <Pressable
            style={[
              styles.sideItem,
              styles.sideItemActive,
            ]}
          >
            <Text style={styles.sideIconActive}>
              ✓
            </Text>

            <Text style={styles.sideTextActive}>
              Tasks
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/calendar')}
          >
            <Text style={styles.sideIcon}>▣</Text>
            <Text style={styles.sideText}>
              Calendar
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/library')}
          >
            <Text style={styles.sideIcon}>▤</Text>
            <Text style={styles.sideText}>
              Library
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/reports')}
          >
            <Text style={styles.sideIcon}>▥</Text>
            <Text style={styles.sideText}>
              Reports
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/ai-assist')}
          >
            <Text style={styles.sideIcon}>✦</Text>
            <Text style={styles.sideText}>
              AI Assist
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/meetings')}
          >
            <Text style={styles.sideIcon}>□</Text>
            <Text style={styles.sideText}>
              Meetings
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/trash')}
          >
            <Text style={styles.sideIcon}>♜</Text>
            <Text style={styles.sideText}>
              Trash
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/help')}
          >
            <Text style={styles.sideIcon}>?</Text>
            <Text style={styles.sideText}>
              Help
            </Text>
          </Pressable>

          <Pressable
            style={styles.sideItem}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.sideIcon}>⚙</Text>
            <Text style={styles.sideText}>
              Settings
            </Text>
          </Pressable>

          <View style={styles.profileBottom}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                N
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                Nyayath
              </Text>

              <Text style={styles.profileSubtitle}>
                Personal workspace
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View
          style={[
            styles.topBar,
            !isDesktop && styles.mobileTopBar,
          ]}
        >
          {!isDesktop && (
            <Pressable
              onPress={() => router.replace('/')}
              style={styles.mobileBrand}
            >
              <View style={styles.smallLogo}>
                <Text style={styles.logoCheck}>
                  ✓
                </Text>
              </View>

              {!isSmallMobile && (
                <Text style={styles.mobileBrandText}>
                  TaskFlow
                </Text>
              )}
            </Pressable>
          )}

          <View
            style={[
              styles.searchBox,
              !isDesktop && styles.mobileSearchBox,
            ]}
          >
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tasks..."
              placeholderTextColor="#91A0B7"
              style={styles.searchInput}
              returnKeyType="search"
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
              >
                <Text style={styles.clearSearch}>
                  ×
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.topActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() =>
                showToast(
                  counts.overdue > 0
                    ? 'error'
                    : 'success',
                  counts.overdue > 0
                    ? `You have ${counts.overdue} overdue ${
                        counts.overdue === 1
                          ? 'task'
                          : 'tasks'
                      }.`
                    : 'You are all caught up.',
                )
              }
            >
              <Text style={styles.topIcon}>♧</Text>

              {counts.overdue > 0 && (
                <View style={styles.notificationDot}>
                  <Text style={styles.notificationDotText}>
                    {counts.overdue > 9
                      ? '9+'
                      : counts.overdue}
                  </Text>
                </View>
              )}
            </Pressable>

            {isDesktop && (
              <Pressable
                style={styles.aiButton}
                onPress={() =>
                  router.push('/ai-assist')
                }
              >
                <Text style={styles.aiButtonText}>
                  ✦ AI
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.avatarButton}
              onPress={() =>
                router.push('/settings')
              }
            >
              <Text style={styles.avatarButtonText}>
                N
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLUE}
            />
          }
        >
          <View
            style={[
              styles.pageHeader,
              !isDesktop && styles.mobilePageHeader,
            ]}
          >
            <View style={styles.pageHeaderText}>
              <Text style={styles.pageTitle}>
                Tasks
              </Text>

              <Text style={styles.pageSubtitle}>
                Organize, manage, and complete your
                activities.
              </Text>
            </View>

            <Pressable
              style={styles.newTaskButton}
              onPress={() =>
                router.push('/add-activity')
              }
            >
              <Text
                style={styles.newTaskButtonText}
              >
                + New Task
              </Text>
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>
                Couldn't load tasks
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>

              <Pressable
                style={styles.retryButton}
                onPress={loadTasks}
              >
                <Text
                  style={styles.retryButtonText}
                >
                  Try Again
                </Text>
              </Pressable>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                All Tasks
              </Text>

              <Text style={styles.statNumber}>
                {counts.all}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Today
              </Text>

              <Text style={styles.statNumber}>
                {counts.today}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Upcoming
              </Text>

              <Text style={styles.statNumber}>
                {counts.upcoming}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Overdue
              </Text>

              <Text
                style={[
                  styles.statNumber,
                  counts.overdue > 0 &&
                    styles.overdueNumber,
                ]}
              >
                {counts.overdue}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Completed
              </Text>

              <Text style={styles.statNumber}>
                {counts.completed}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.filterScroll
              }
            >
              {FILTERS.map((filter) => {
                const active =
                  activeFilter === filter.key;

                return (
                  <Pressable
                    key={filter.key}
                    onPress={() =>
                      setActiveFilter(
                        filter.key,
                      )
                    }
                    style={[
                      styles.filterButton,
                      active &&
                        styles.filterButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active &&
                          styles.filterTextActive,
                      ]}
                    >
                      {filter.label}
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
                        {counts[filter.key]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.filterPanel}>
            <View style={styles.filterGroup}>
              <Text
                style={styles.filterGroupLabel}
              >
                Priority
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {(
                  [
                    ['all', 'All'],
                    ['high', 'High'],
                    ['medium', 'Medium'],
                    ['low', 'Low'],
                  ] as [
                    PriorityFilter,
                    string,
                  ][]
                ).map(([key, label]) => {
                  const active =
                    priorityFilter === key;

                  return (
                    <Pressable
                      key={key}
                      onPress={() =>
                        setPriorityFilter(
                          key,
                        )
                      }
                      style={[
                        styles.smallFilter,
                        active &&
                          styles.smallFilterActive,
                      ]}
                    >
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
                })}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text
                style={styles.filterGroupLabel}
              >
                Life Area
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {lifeAreas.map((area) => {
                  const active =
                    areaFilter === area;

                  return (
                    <Pressable
                      key={area}
                      onPress={() =>
                        setAreaFilter(area)
                      }
                      style={[
                        styles.smallFilter,
                        active &&
                          styles.smallFilterActive,
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
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.resultsTitle}>
                {activeFilter === 'all'
                  ? 'All Tasks'
                  : FILTERS.find(
                      (item) =>
                        item.key ===
                        activeFilter,
                    )?.label}
              </Text>

              <Text style={styles.resultsSubtitle}>
                {filteredActivities.length}{' '}
                {filteredActivities.length === 1
                  ? 'task'
                  : 'tasks'}
                {search
                  ? ` matching "${search}"`
                  : ''}
              </Text>
            </View>

            <Pressable
              onPress={onRefresh}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>
                ↻ Refresh
              </Text>
            </Pressable>
          </View>

          {filteredActivities.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              search={search}
            />
          ) : (
            <View style={styles.taskList}>
              {filteredActivities.map(
                (activity) => (
                  <TaskCard
                    key={activity.id}
                    activity={activity}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onMoveToTomorrow={
                      handleMoveToTomorrow
                    }
                    onOpen={openActivity}
                  />
                ),
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* TASK DETAILS MODAL */}
      <Modal
        visible={Boolean(selectedActivity)}
        transparent
        animationType="fade"
        onRequestClose={closeActivity}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeActivity}
          />

          {selectedActivity && (
            <View
              style={[
                styles.taskModal,
                !isDesktop &&
                  styles.mobileTaskModal,
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalEyebrow}>
                    TASK DETAILS
                  </Text>

                  <Text style={styles.modalTitle}>
                    {selectedActivity.title}
                  </Text>
                </View>

                <Pressable
                  style={styles.modalClose}
                  onPress={closeActivity}
                >
                  <Text style={styles.modalCloseText}>
                    ×
                  </Text>
                </Pressable>
              </View>

              {selectedActivity.description ? (
                <Text style={styles.modalDescription}>
                  {selectedActivity.description}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.modalDescription,
                    styles.modalMutedText,
                  ]}
                >
                  No description added.
                </Text>
              )}

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Life Area
                  </Text>

                  <Text style={styles.detailValue}>
                    {getCategoryIcon(
                      selectedActivity,
                    )}{' '}
                    {selectedActivity.category ||
                      'Other'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Date
                  </Text>

                  <Text style={styles.detailValue}>
                    {formatDate(
                      selectedActivity.scheduled_date,
                    )}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Time
                  </Text>

                  <Text style={styles.detailValue}>
                    {selectedActivity.scheduled_time
                      ? formatTime(
                          selectedActivity.scheduled_time,
                        )
                      : 'No time set'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Priority
                  </Text>

                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color: getPriorityColor(
                          selectedActivity.priority,
                        ),
                      },
                    ]}
                  >
                    {getPriorityLabel(
                      selectedActivity.priority,
                    )}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Repeat
                  </Text>

                  <Text style={styles.detailValue}>
                    {selectedActivity.repeat ||
                      'none'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Reminder
                  </Text>

                  <Text style={styles.detailValue}>
                    {selectedActivity.reminder
                      ? `${selectedActivity.reminder_minutes ?? 15} min before`
                      : 'Off'}
                  </Text>
                </View>
              </View>

              {isOverdue(selectedActivity) && (
                <View style={styles.modalWarning}>
                  <Text style={styles.modalWarningIcon}>
                    !
                  </Text>

                  <View style={styles.modalWarningText}>
                    <Text
                      style={styles.modalWarningTitle}
                    >
                      This task is overdue
                    </Text>

                    <Text
                      style={styles.modalWarningSubtitle}
                    >
                      Move it to tomorrow or edit its
                      schedule.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={editActivity}
                >
                  <Text
                    style={styles.secondaryActionIcon}
                  >
                    ✎
                  </Text>

                  <Text
                    style={styles.secondaryActionText}
                  >
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryAction}
                  onPress={() =>
                    handleToggle(selectedActivity)
                  }
                >
                  <Text
                    style={styles.secondaryActionIcon}
                  >
                    {selectedActivity.completed
                      ? '↶'
                      : '✓'}
                  </Text>

                  <Text
                    style={styles.secondaryActionText}
                  >
                    {selectedActivity.completed
                      ? 'Reopen'
                      : 'Complete'}
                  </Text>
                </Pressable>

                {isOverdue(selectedActivity) && (
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() =>
                      handleMoveToTomorrow(
                        selectedActivity,
                      )
                    }
                  >
                    <Text
                      style={styles.secondaryActionIcon}
                    >
                      ↷
                    </Text>

                    <Text
                      style={styles.secondaryActionText}
                    >
                      Tomorrow
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.secondaryAction,
                    styles.dangerAction,
                  ]}
                  onPress={() =>
                    handleDelete(selectedActivity)
                  }
                >
                  <Text
                    style={styles.dangerActionIcon}
                  >
                    🗑
                  </Text>

                  <Text
                    style={styles.dangerActionText}
                  >
                    Trash
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* TRASH CONFIRMATION MODAL */}
      <Modal
        visible={Boolean(trashActivity)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setTrashActivity(null);
          }
        }}
      >
        <View style={styles.confirmOverlay}>
          <Pressable
            style={styles.confirmBackdrop}
            onPress={() => {
              if (!isDeleting) {
                setTrashActivity(null);
              }
            }}
          />

          {trashActivity && (
            <View
              style={[
                styles.confirmModal,
                !isDesktop &&
                  styles.confirmModalMobile,
              ]}
            >
              <View style={styles.confirmIcon}>
                <Text style={styles.confirmIconText}>
                  🗑
                </Text>
              </View>

              <Text style={styles.confirmTitle}>
                Move to Trash?
              </Text>

              <Text style={styles.confirmMessage}>
                This task will be moved to Trash. You
                can restore it later.
              </Text>

              <View style={styles.confirmTask}>
                <Text
                  numberOfLines={2}
                  style={styles.confirmTaskTitle}
                >
                  {trashActivity.title}
                </Text>

                <Text style={styles.confirmTaskMeta}>
                  {trashActivity.category ||
                    'Other'}{' '}
                  •{' '}
                  {formatDate(
                    trashActivity.scheduled_date,
                  )}
                </Text>
              </View>

              <View style={styles.confirmActions}>
                <Pressable
                  disabled={isDeleting}
                  style={styles.cancelConfirmButton}
                  onPress={() =>
                    setTrashActivity(null)
                  }
                >
                  <Text
                    style={styles.cancelConfirmText}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={isDeleting}
                  style={[
                    styles.confirmDeleteButton,
                    isDeleting &&
                      styles.disabledButton,
                  ]}
                  onPress={confirmDelete}
                >
                  {isDeleting ? (
                    <ActivityIndicator
                      size="small"
                      color={WHITE}
                    />
                  ) : (
                    <>
                      <Text
                        style={
                          styles.confirmDeleteIcon
                        }
                      >
                        🗑
                      </Text>

                      <Text
                        style={
                          styles.confirmDeleteText
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

      {/* TOAST */}
      {toast && (
        <View
          pointerEvents="none"
          style={[
            styles.toast,
            toast.type === 'error'
              ? styles.toastError
              : styles.toastSuccess,
          ]}
        >
          <View
            style={[
              styles.toastIcon,
              toast.type === 'error'
                ? styles.toastIconError
                : styles.toastIconSuccess,
            ]}
          >
            <Text style={styles.toastIconText}>
              {toast.type === 'error' ? '!' : '✓'}
            </Text>
          </View>

          <Text style={styles.toastText}>
            {toast.message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: BACKGROUND,
  },

  sidebar: {
    width: 280,
    backgroundColor: WHITE,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    paddingHorizontal: 15,
    paddingTop: 30,
    paddingBottom: 20,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 48,
  },

  logo: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  smallLogo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  logoCheck: {
    color: WHITE,
    fontSize: 25,
    fontWeight: '700',
  },

  logoText: {
    color: TEXT,
    fontSize: 23,
    fontWeight: '800',
  },

  workspaceLabel: {
    color: '#8996AA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginHorizontal: 12,
    marginBottom: 12,
  },

  sideItem: {
    height: 55,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 4,
  },

  sideItemActive: {
    backgroundColor: '#EAF5FF',
  },

  sideIcon: {
    width: 32,
    color: '#6D7F99',
    fontSize: 22,
  },

  sideIconActive: {
    width: 32,
    color: BLUE,
    fontSize: 22,
    fontWeight: '700',
  },

  sideText: {
    color: '#65758F',
    fontSize: 16,
    fontWeight: '600',
  },

  sideTextActive: {
    color: BLUE,
    fontSize: 16,
    fontWeight: '700',
  },

  profileBottom: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 18,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  profileAvatarText: {
    color: BLUE,
    fontSize: 18,
    fontWeight: '800',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 14,
  },

  profileSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  topBar: {
    height: 90,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  mobileTopBar: {
    height: 76,
    paddingHorizontal: 14,
    gap: 10,
  },

  mobileBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mobileBrandText: {
    color: TEXT,
    fontSize: 19,
    fontWeight: '800',
  },

  searchBox: {
    flex: 1,
    maxWidth: 780,
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: '#FBFCFE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  mobileSearchBox: {
    height: 46,
    paddingHorizontal: 12,
  },

  searchIcon: {
    color: '#71809A',
    fontSize: 27,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    outlineStyle: 'none',
  } as any,

  clearSearch: {
    color: MUTED,
    fontSize: 25,
    paddingLeft: 10,
  },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },

  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F8FAFD',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  topIcon: {
    fontSize: 22,
    color: TEXT,
  },

  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDotText: {
    color: WHITE,
    fontSize: 8,
    fontWeight: '800',
  },

  aiButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: BLUE,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },

  avatarButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarButtonText: {
    color: BLUE,
    fontSize: 17,
    fontWeight: '800',
  },

  scrollContent: {
    padding: 22,
    paddingBottom: 50,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },

  mobilePageHeader: {
    alignItems: 'flex-start',
  },

  pageHeaderText: {
    flex: 1,
  },

  pageTitle: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  pageSubtitle: {
    color: MUTED,
    fontSize: 15,
    marginTop: 5,
    lineHeight: 21,
  },

  newTaskButton: {
    backgroundColor: BLUE,
    borderRadius: 13,
    minHeight: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  newTaskButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },

  statsRow: {
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    width: 150,
    minHeight: 105,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 17,
    justifyContent: 'center',
  },

  statLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },

  statNumber: {
    color: TEXT,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 5,
  },

  overdueNumber: {
    color: '#EF4444',
  },

  filterSection: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    marginBottom: 14,
  },

  filterScroll: {
    padding: 7,
    gap: 5,
  },

  filterButton: {
    minHeight: 45,
    paddingHorizontal: 15,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  filterButtonActive: {
    backgroundColor: BLUE,
  },

  filterText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  filterTextActive: {
    color: WHITE,
  },

  filterCount: {
    minWidth: 25,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  filterCountText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  filterCountTextActive: {
    color: WHITE,
  },

  filterPanel: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 15,
    marginBottom: 22,
    gap: 15,
  },

  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  filterGroupLabel: {
    width: 75,
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },

  smallFilter: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  smallFilterActive: {
    backgroundColor: '#EAF5FF',
    borderWidth: 1,
    borderColor: '#C7E4FF',
  },

  smallFilterText: {
    color: '#71809A',
    fontSize: 12,
    fontWeight: '700',
  },

  smallFilterTextActive: {
    color: BLUE,
  },

  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  resultsTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: '800',
  },

  resultsSubtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 3,
  },

  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  refreshText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
  },

  taskList: {
    gap: 10,
  },

  taskCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  taskCardCompleted: {
    opacity: 0.7,
  },

  taskCardOverdue: {
    borderColor: '#F7CACA',
  },

  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C9D3E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    marginTop: 2,
  },

  checkboxCompleted: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  checkboxCheck: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },

  taskMain: {
    flex: 1,
    minWidth: 0,
  },

  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  taskTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },

  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8491A5',
  },

  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    marginLeft: 10,
  },

  taskDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 11,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaIcon: {
    fontSize: 12,
  },

  metaText: {
    color: '#74839A',
    fontSize: 12,
    fontWeight: '600',
  },

  taskBottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
  },

  priorityBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  overdueBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  overdueBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },

  carriedBadge: {
    backgroundColor: '#F2EDFF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  carriedBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
  },

  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 3,
  },

  actionButton: {
    width: 35,
    height: 35,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },

  deleteActionButton: {
    backgroundColor: '#FFF7F7',
  },

  actionIcon: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '700',
  },

  moveIcon: {
    color: BLUE,
    fontSize: 19,
    fontWeight: '800',
  },

  deleteIcon: {
    fontSize: 14,
  },

  emptyState: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#EAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyIconText: {
    color: BLUE,
    fontSize: 32,
    fontWeight: '800',
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },

  emptySubtitle: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 400,
    lineHeight: 21,
  },

  emptyButton: {
    backgroundColor: BLUE,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 20,
  },

  emptyButtonText: {
    color: WHITE,
    fontWeight: '800',
    fontSize: 13,
  },

  errorBox: {
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#FFD1D1',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },

  errorTitle: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '800',
  },

  errorText: {
    color: '#8D3A35',
    fontSize: 13,
    marginTop: 5,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#B42318',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
  },

  retryButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '800',
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 19,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  loadingLogoText: {
    color: WHITE,
    fontSize: 35,
    fontWeight: '800',
  },

  loadingText: {
    color: MUTED,
    fontSize: 14,
    marginTop: 14,
  },

  /* DETAILS MODAL */

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(17, 27, 45, 0.48)',
  },

  taskModal: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 10,
  },

  mobileTaskModal: {
    padding: 20,
    borderRadius: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  modalEyebrow: {
    color: BLUE,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    color: MUTED,
    fontSize: 25,
    lineHeight: 27,
  },

  modalDescription: {
    color: '#596981',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  modalMutedText: {
    color: '#9AA6B8',
    fontStyle: 'italic',
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },

  detailItem: {
    width: '48%',
    minWidth: 190,
    backgroundColor: '#F8FAFD',
    borderRadius: 13,
    padding: 13,
  },

  detailLabel: {
    color: '#8996AA',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },

  detailValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },

  modalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6F6',
    borderWidth: 1,
    borderColor: '#FFDCDC',
    borderRadius: 13,
    padding: 12,
    marginBottom: 18,
  },

  modalWarningIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 16,
    fontWeight: '800',
    marginRight: 10,
  },

  modalWarningText: {
    flex: 1,
  },

  modalWarningTitle: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '800',
  },

  modalWarningSubtitle: {
    color: '#8D3A35',
    fontSize: 12,
    marginTop: 2,
  },

  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  secondaryAction: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F4F7FA',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  dangerAction: {
    backgroundColor: '#FFF4F4',
  },

  secondaryActionIcon: {
    color: BLUE,
    fontSize: 16,
    fontWeight: '800',
  },

  secondaryActionText: {
    color: '#526174',
    fontSize: 13,
    fontWeight: '800',
  },

  dangerActionIcon: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '800',
  },

  dangerActionText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },

  /* TRASH CONFIRMATION */

  confirmOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(17, 27, 45, 0.55)',
  },

  confirmModal: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 35,
    shadowOffset: {
      width: 0,
      height: 15,
    },
    elevation: 12,
  },

  confirmModalMobile: {
    borderRadius: 22,
    padding: 22,
  },

  confirmIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  confirmIconText: {
    fontSize: 25,
  },

  confirmTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },

  confirmMessage: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 350,
  },

  confirmTask: {
    width: '100%',
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 13,
    marginTop: 18,
    marginBottom: 18,
  },

  confirmTaskTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },

  confirmTaskMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },

  confirmActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },

  cancelConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelConfirmText: {
    color: '#526174',
    fontSize: 13,
    fontWeight: '800',
  },

  confirmDeleteButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  confirmDeleteIcon: {
    fontSize: 14,
  },

  confirmDeleteText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.65,
  },

  /* TOAST */

  toast: {
    position: 'absolute',
    top: 22,
    right: 22,
    minHeight: 58,
    maxWidth: 420,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },

  toastSuccess: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#D7F0DF',
  },

  toastError: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#FFD5D5',
  },

  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toastIconSuccess: {
    backgroundColor: '#DCFCE7',
  },

  toastIconError: {
    backgroundColor: '#FEE2E2',
  },

  toastIconText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '900',
  },

  toastText: {
    flexShrink: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});