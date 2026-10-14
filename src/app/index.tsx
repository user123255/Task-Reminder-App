
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Colors, Radii, Shadows } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import {
  carryForwardOverdueActivities,
  fetchActivities,
  updateActivityCompletion,
} from "@/services/activities";

type Activity = {
  id: string | number;
  title?: string | null;
  category?: string | null;
  priority?: string | null;
  completed?: boolean | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  repeat?: string | null;
};

const LIFE_AREAS = [
  { name: "Spiritual", icon: "sparkles-outline" as const, color: Colors.spiritual },
  { name: "Health", icon: "heart-outline" as const, color: Colors.health },
  { name: "Relationship", icon: "people-outline" as const, color: Colors.relationship },
  { name: "Career", icon: "briefcase-outline" as const, color: Colors.career },
  { name: "Other", icon: "grid-outline" as const, color: Colors.other },
];

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value?: string | null) {
  if (!value) return "No time";

  const [hourPart, minutePart = "00"] = value.split(":");
  const hour = Number(hourPart);

  if (Number.isNaN(hour)) return value;

  return `${hour % 12 || 12}:${minutePart} ${hour >= 12 ? "PM" : "AM"}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getActivityTitle(activity: Activity) {
  return activity.title?.trim() || "Untitled task";
}

function getArea(activity: Activity) {
  return activity.category || "Other";
}

function getPriorityColor(priority?: string | null) {
  switch (priority?.toLowerCase()) {
    case "high":
      return Colors.priorityHigh;
    case "low":
      return Colors.priorityLow;
    default:
      return Colors.priorityMedium;
  }
}

function getDisplayName(session: ReturnType<typeof useAuth>["session"]) {
  const metadata = session?.user?.user_metadata;
  const fullName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name.trim()
      : "";
  const name =
    typeof metadata?.name === "string"
      ? metadata.name.trim()
      : "";

  return fullName || name || "there";
}

function getInitials(name: string) {
  if (!name || name === "there") return "T";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

function createActivityDate(
  date?: string | null,
  time?: string | null
) {
  if (!date) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  if (!time) {
    return new Date(year, month - 1, day, 23, 59, 59);
  }

  const [hour = 0, minute = 0, second = 0] = time
    .split(":")
    .map(Number);

  return new Date(year, month - 1, day, hour, minute, second);
}

function getCountdownText(activity: Activity, now: Date) {
  const date = createActivityDate(
    activity.scheduled_date,
    activity.scheduled_time
  );

  if (!date) return "Scheduled";

  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);

  if (minutes < 0) return "Time has passed";
  if (minutes === 0) return "Starting now";
  if (minutes < 60) return `In ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes === 0
      ? `In ${hours}h`
      : `In ${hours}h ${remainingMinutes}m`;
  }

  return `In ${Math.floor(hours / 24)}d`;
}

function goTo(path: string) {
  router.push(path as never);
}

function SectionHeading({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>

      {action && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  subtitle: string;
  color: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>

      <View style={styles.statText}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={Colors.textMuted}
      />
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  buttonText?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={27} color={Colors.primary} />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>

      {buttonText && onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.primaryButtonText}>{buttonText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ActivityRow({
  activity,
  onToggle,
}: {
  activity: Activity;
  onToggle: () => void;
}) {
  const completed = Boolean(activity.completed);

  return (
    <View style={styles.activityRow}>
      <Pressable
        onPress={onToggle}
        style={[
          styles.checkbox,
          completed && styles.checkboxChecked,
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`Mark ${getActivityTitle(activity)} ${
          completed ? "incomplete" : "complete"
        }`}
      >
        {completed ? (
          <Ionicons name="checkmark" size={15} color={Colors.white} />
        ) : null}
      </Pressable>

      <View style={styles.activityMain}>
        <Text
          numberOfLines={2}
          style={[
            styles.activityTitle,
            completed && styles.activityTitleCompleted,
          ]}
        >
          {getActivityTitle(activity)}
        </Text>

        <View style={styles.activityMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{getArea(activity)}</Text>
          </View>

          {activity.priority ? (
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(activity.priority) },
              ]}
            />
          ) : null}

          {activity.repeat && activity.repeat !== "none" ? (
            <Ionicons
              name="repeat-outline"
              size={13}
              color={Colors.textMuted}
            />
          ) : null}
        </View>
      </View>

      <Text style={styles.activityTime}>
        {formatTime(activity.scheduled_time)}
      </Text>

      <Pressable
        onPress={() => goTo(`/add-activity?edit=${activity.id}`)}
        style={styles.moreButton}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${getActivityTitle(activity)}`}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={Colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

export default function Dashboard() {
const { width } = useWindowDimensions();
const { session } = useAuth();
const userId = session?.user?.id ?? null;
const requestId = useRef(0);

  const isMobile = width < 600;
  const isWide = width >= 900;

  const displayName = useMemo(() => getDisplayName(session), [session]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(new Date());

  const today = getLocalDate();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

 
  const loadActivities = useCallback(async () => {
    if (!userId) {
      setActivities([]);
      setLoadError(false);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const currentRequestId = ++requestId.current;
    setLoadError(false);

    try {
      await carryForwardOverdueActivities();
      const data = await fetchActivities();

      // Ignore results from an older account or an outdated request.
      if (requestId.current === currentRequestId) {
        setActivities(data as Activity[]);
      }
    } catch (error) {
      if (requestId.current === currentRequestId) {
        console.error("Failed to load activities:", error);
        setLoadError(true);
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    // Invalidate previous requests whenever the account changes.
    requestId.current += 1;
    setActivities([]);
    setLoadError(false);
    setRefreshing(false);

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadActivities();

    return () => {
      requestId.current += 1;
    };
  }, [userId, loadActivities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadActivities();
  }, [loadActivities]);

  const todayActivities = useMemo(
    () => activities.filter((activity) => activity.scheduled_date === today),
    [activities, today]
  );

  const completedToday = useMemo(
    () => todayActivities.filter((activity) => activity.completed),
    [todayActivities]
  );

  const upcoming = useMemo(
    () =>
      activities.filter(
        (activity) =>
          Boolean(activity.scheduled_date) &&
          activity.scheduled_date! > today &&
          !activity.completed
      ),
    [activities, today]
  );

  const overdue = useMemo(
    () =>
      activities.filter(
        (activity) =>
          Boolean(activity.scheduled_date) &&
          activity.scheduled_date! < today &&
          !activity.completed
      ),
    [activities, today]
  );

  const nextActivity = useMemo(() => {
    return activities
      .filter((activity) => !activity.completed)
      .map((activity) => ({
        activity,
        date: createActivityDate(
          activity.scheduled_date,
          activity.scheduled_time
        ),
      }))
      .filter(
        (item) => item.date !== null && item.date.getTime() >= now.getTime()
      )
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0]?.activity ?? null;
  }, [activities, now]);

  const progress =
    todayActivities.length > 0
      ? Math.round((completedToday.length / todayActivities.length) * 100)
      : 0;

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    todayActivities.forEach((activity) => {
      const area = getArea(activity);
      counts[area] = (counts[area] || 0) + 1;
    });

    return counts;
  }, [todayActivities]);

  const handleToggle = async (activity: Activity) => {
    const previousValue = Boolean(activity.completed);
    const newValue = !previousValue;

    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id ? { ...item, completed: newValue } : item
      )
    );

    try {
      await updateActivityCompletion(String(activity.id), newValue);
    } catch (error) {
      console.error("Failed to update activity:", error);

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id
            ? { ...item, completed: previousValue }
            : item
        )
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingLogo}>
          <Ionicons name="checkmark" size={30} color={Colors.white} />
        </View>
        <Text style={styles.loadingTitle}>TaskFlow</Text>
        <ActivityIndicator
          color={Colors.primary}
          size="small"
          style={styles.loadingSpinner}
        />
        <Text style={styles.loadingCaption}>Preparing your workspace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.main}>
        <View style={[styles.topbar, isMobile && styles.mobileTopbar]}>
          {!isWide ? (
            <View style={styles.mobileBrand}>
              <View style={styles.brandMark}>
                <Ionicons name="checkmark" size={21} color={Colors.white} />
              </View>
              <Text style={styles.brandName}>TaskFlow</Text>
            </View>
          ) : (
            <Text style={styles.workspaceLabel}>MY WORKSPACE</Text>
          )}

          <Pressable
            onPress={() => goTo("/tasks")}
            style={[styles.searchBox, isMobile && styles.mobileSearchBox]}
            accessibilityRole="button"
            accessibilityLabel="Open tasks"
          >
            <Ionicons
              name="search-outline"
              size={19}
              color={Colors.textSecondary}
            />
            {!isMobile ? (
              <Text style={styles.searchPlaceholder}>
                Search your workspace...
              </Text>
            ) : (
              <Text style={styles.searchPlaceholder}>Search tasks</Text>
            )}
            {isWide ? (
              <View style={styles.shortcut}>
                <Text style={styles.shortcutText}>⌘ K</Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.topbarActions}>
            <Pressable
              onPress={() => goTo("/settings")}
              style={styles.notificationButton}
              accessibilityRole="button"
              accessibilityLabel="Open settings and notifications"
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={Colors.textStrong}
              />
            </Pressable>

            {isWide ? (
              <Pressable
                onPress={() => goTo("/ai-assist")}
                style={styles.aiButton}
              >
                <Ionicons name="sparkles" size={16} color={Colors.white} />
                <Text style={styles.aiButtonText}>AI Assist</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => goTo("/settings")}
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={[
            styles.content,
            isMobile && styles.mobileContent,
          ]}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={[styles.greeting, isMobile && styles.mobileGreeting]}>
                {getGreeting()}, {displayName}
              </Text>
              <Text style={styles.subtitle}>
                Make today count, one task at a time.
              </Text>
            </View>

            <Pressable
              onPress={() => goTo("/add-activity")}
              style={styles.newTaskButton}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={21} color={Colors.white} />
              {!isMobile ? (
                <Text style={styles.newTaskText}>New task</Text>
              ) : null}
            </Pressable>
          </View>

          {loadError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="cloud-offline-outline"
                size={22}
                color={Colors.danger}
              />
              <View style={styles.errorTextWrap}>
                <Text style={styles.errorTitle}>Couldn't load your activities</Text>
                <Text style={styles.errorMessage}>
                  Check your connection and try again. Your dashboard may be
                  incomplete until activities load.
                </Text>
              </View>
              <Pressable onPress={onRefresh} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View style={styles.progressCopy}>
                <View style={styles.eyebrowRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.eyebrow}>YOUR DAILY MOMENTUM</Text>
                </View>
                <Text style={styles.progressTitle}>Today's progress</Text>
                <Text style={styles.progressSubtitle}>
                  {completedToday.length} of {todayActivities.length} tasks
                  completed
                </Text>
              </View>

              <View style={styles.progressCircle}>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>

            <View style={styles.progressBottom}>
              <Text style={styles.progressMessage}>
                {progress === 100 && todayActivities.length > 0
                  ? "Wonderful work — you've completed today's plan."
                  : progress >= 60
                    ? "You're building great momentum."
                    : "Small steps add up. Keep going."}
              </Text>
              <Ionicons
name="arrow-up-right-box"             
   size={19}
                color={Colors.lavender}
              />
            </View>
          </View>

          <View style={[styles.statsGrid, isMobile && styles.mobileStatsGrid]}>
            <StatCard
              icon="sunny-outline"
              label="Today"
              value={todayActivities.length}
              subtitle={`${completedToday.length} completed`}
              color={Colors.primary}
              tint={Colors.primaryLight}
              onPress={() => goTo("/tasks")}
            />
            <StatCard
              icon="calendar-outline"
              label="Upcoming"
              value={upcoming.length}
              subtitle="Future tasks"
              color={Colors.lavender}
              tint={Colors.lavenderLight}
              onPress={() => goTo("/calendar")}
            />
            <StatCard
              icon="alert-circle-outline"
              label="Overdue"
              value={overdue.length}
              subtitle={overdue.length ? "Needs attention" : "All caught up"}
              color={Colors.danger}
              tint={Colors.dangerLight}
              onPress={() => goTo("/tasks")}
            />
          </View>

          <View style={styles.section}>
            <SectionHeading
              title="Next up"
              subtitle="Your next scheduled activity"
              action="View calendar"
              onAction={() => goTo("/calendar")}
            />

            {nextActivity ? (
              <View style={styles.nextCard}>
                <View style={styles.nextIcon}>
                  <Ionicons
                    name="arrow-forward"
                    size={23}
                    color={Colors.white}
                  />
                </View>

                <View style={styles.nextMain}>
                  <Text style={styles.nextTitle} numberOfLines={2}>
                    {getActivityTitle(nextActivity)}
                  </Text>
                  <View style={styles.nextMeta}>
                    <Text style={styles.nextCategory}>
                      {getArea(nextActivity)}
                    </Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.nextCountdown}>
                      {getCountdownText(nextActivity, now)}
                    </Text>
                  </View>
                </View>

                <View style={styles.nextTimeWrap}>
                  <Text style={styles.nextTime}>
                    {formatTime(nextActivity.scheduled_time)}
                  </Text>
                  <Text style={styles.nextDate}>
                    {nextActivity.scheduled_date === today
                      ? "TODAY"
                      : nextActivity.scheduled_date || "SCHEDULED"}
                  </Text>
                </View>
              </View>
            ) : (
              <EmptyState
                icon="checkmark-done-circle-outline"
                title="Nothing else on the horizon"
                description="Add an activity when you're ready to plan your next step."
                buttonText="Add a task"
                onPress={() => goTo("/add-activity")}
              />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeading
              title="Today's activities"
              subtitle="Keep your attention on what matters"
              action="See tasks"
              onAction={() => goTo("/tasks")}
            />

            <View style={styles.activitiesCard}>
              {todayActivities.length ? (
                todayActivities.map((activity, index) => (
                  <View
                    key={activity.id}
                    style={
                      index < todayActivities.length - 1
                        ? styles.activityDivider
                        : undefined
                    }
                  >
                    <ActivityRow
                      activity={activity}
                      onToggle={() => handleToggle(activity)}
                    />
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="calendar-clear-outline"
                  title="Give your day a plan"
                  description="You don't have any activities scheduled for today yet."
                  buttonText="Create your first task"
                  onPress={() => goTo("/add-activity")}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading
              title="Life areas"
              subtitle="A little progress in the areas that matter"
            />

            <View style={styles.lifeAreaGrid}>
              {LIFE_AREAS.map((area) => {
                const count = areaCounts[area.name] || 0;

                return (
                  <View
                    key={area.name}
                    style={[styles.lifeAreaCard, isMobile && styles.mobileLifeAreaCard]}
                  >
                    <View
                      style={[
                        styles.lifeAreaIcon,
                        { backgroundColor: `${area.color}18` },
                      ]}
                    >
                      <Ionicons
                        name={area.icon}
                        size={21}
                        color={area.color}
                      />
                    </View>
                    <Text style={styles.lifeAreaName}>{area.name}</Text>
                    <Text style={styles.lifeAreaCount}>
                      {count} {count === 1 ? "task" : "tasks"} today
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {overdue.length > 0 ? (
            <Pressable
              onPress={() => goTo("/tasks")}
              style={styles.overdueBanner}
            >
              <View style={styles.overdueIcon}>
                <Ionicons
                  name="alert-outline"
                  size={22}
                  color={Colors.danger}
                />
              </View>
              <View style={styles.overdueCopy}>
                <Text style={styles.overdueTitle}>
                  {overdue.length} overdue {overdue.length === 1 ? "task" : "tasks"}
                </Text>
                <Text style={styles.overdueDescription}>
                  Review your schedule and decide what to do next.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={Colors.danger}
              />
            </Pressable>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.footerMark}>
              <Ionicons name="checkmark" size={13} color={Colors.white} />
            </View>
            <Text style={styles.footerText}>
              TaskFlow · Your work. Your goals. Your flow.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navyDeep,
  },
  loadingLogo: {
    width: 68,
    height: 68,
    borderRadius: Radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    ...Shadows.elevated,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 25,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  loadingSpinner: {
    marginTop: 22,
  },
  loadingCaption: {
    marginTop: 10,
    fontSize: 13,
    color: "#B7C4D6",
  },
  topbar: {
    minHeight: 76,
    paddingHorizontal: 28,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  mobileTopbar: {
    minHeight: 76,
    paddingLeft: 70,
    paddingRight: 14,
    gap: 10,
  },
  workspaceLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  brandMark: {
    width: 33,
    height: 33,
    borderRadius: Radii.sm,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: Colors.textStrong,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  searchBox: {
    flex: 1,
    maxWidth: 600,
    minWidth: 0,
    height: 43,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 9,
  },
  mobileSearchBox: {
    height: 40,
    paddingHorizontal: 10,
    flex: 1,
  },
  searchPlaceholder: {
    flex: 1,
    minWidth: 0,
    color: Colors.textMuted,
    fontSize: 12,
  },
  shortcut: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: Radii.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  shortcutText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  topbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  aiButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  aiButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: Radii.round,
    backgroundColor: Colors.lavenderLight,
    borderWidth: 1,
    borderColor: Colors.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.textOnLavender,
    fontSize: 12,
    fontWeight: "800",
  },
  content: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 32,
  },
  mobileContent: {
    paddingHorizontal: 17,
    paddingTop: 23,
    paddingBottom: 28,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  greetingText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: Colors.textStrong,
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.9,
  },
  mobileGreeting: {
    fontSize: 24,
    lineHeight: 31,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  newTaskButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    ...Shadows.card,
  },
  newTaskText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 14,
    marginBottom: 18,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: "#F5C8C5",
    borderRadius: Radii.lg,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    color: Colors.textStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  errorMessage: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
  },
  retryText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  progressCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.xxl,
    padding: 23,
    marginBottom: 17,
    overflow: "hidden",
    ...Shadows.card,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressCopy: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.lavender,
  },
  eyebrow: {
    color: "#C6C2FF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  progressTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  progressSubtitle: {
    color: "#B8C4D6",
    fontSize: 12,
    marginTop: 6,
  },
  progressCircle: {
    width: 65,
    height: 65,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(139,125,237,0.45)",
    backgroundColor: "rgba(139,125,237,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercent: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.round,
    backgroundColor: "rgba(255,255,255,0.13)",
    marginTop: 23,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radii.round,
    backgroundColor: Colors.lavender,
  },
  progressBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 13,
  },
  progressMessage: {
    flex: 1,
    color: "#C5CFDE",
    fontSize: 11,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 13,
    marginBottom: 29,
  },
  mobileStatsGrid: {
    flexDirection: "column",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    padding: 15,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    ...Shadows.card,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statText: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    color: Colors.textStrong,
    fontSize: 25,
    fontWeight: "800",
    marginTop: 2,
  },
  statSubtitle: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  section: {
    marginBottom: 29,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionTitle: {
    color: Colors.textStrong,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  sectionAction: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  nextCard: {
    minHeight: 105,
    padding: 16,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Shadows.card,
  },
  nextIcon: {
    width: 46,
    height: 46,
    borderRadius: Radii.md,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  nextMain: {
    flex: 1,
    minWidth: 0,
  },
  nextTitle: {
    color: Colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  nextMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7,
  },
  nextCategory: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lavender,
  },
  nextCountdown: {
    color: Colors.textOnLavender,
    fontSize: 11,
    fontWeight: "700",
  },
  nextTimeWrap: {
    alignItems: "flex-end",
    marginLeft: 2,
  },
  nextTime: {
    color: Colors.textStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  nextDate: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: Colors.textStrong,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  emptyDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 300,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  activitiesCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...Shadows.card,
  },
  activityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityRow: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.7,
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  activityMain: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    color: Colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  activityTitleCompleted: {
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    borderRadius: Radii.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activityTime: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  moreButton: {
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  lifeAreaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
  },
  lifeAreaCard: {
    flexGrow: 1,
    flexBasis: "17%",
    minWidth: 120,
    padding: 14,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  mobileLifeAreaCard: {
    flexBasis: "44%",
    minWidth: 0,
  },
  lifeAreaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lifeAreaName: {
    color: Colors.textStrong,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 11,
  },
  lifeAreaCount: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: "#F4C9C6",
    backgroundColor: Colors.dangerLight,
  },
  overdueIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  overdueCopy: {
    flex: 1,
  },
  overdueTitle: {
    color: Colors.textStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  overdueDescription: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 25,
    paddingBottom: 5,
  },
  footerMark: {
    width: 19,
    height: 19,
    borderRadius: 6,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});
