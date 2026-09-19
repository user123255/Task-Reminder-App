import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
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

import { useAuth } from "@/hooks/use-auth";
import {
  carryForwardOverdueActivities,
  fetchActivities,
  updateActivityCompletion,
} from "@/services/activities";
import { Colors } from "@/constants/theme";

const LIFE_AREAS = [
  {
    name: "Spiritual",
    icon: "sparkles-outline" as const,
    color: Colors.spiritual,
  },
  {
    name: "Health",
    icon: "heart-outline" as const,
    color: Colors.health,
  },
  {
    name: "Relationship",
    icon: "people-outline" as const,
    color: Colors.relationship,
  },
  {
    name: "Career",
    icon: "briefcase-outline" as const,
    color: Colors.career,
  },
  {
    name: "Other",
    icon: "grid-outline" as const,
    color: Colors.other,
  },
];

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

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(value?: string | null) {
  if (!value) {
    return "No time";
  }

  const parts = value.split(":");
  const hour = Number(parts[0]);
  const minute = parts[1] ?? "00";

  if (Number.isNaN(hour)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getActivityTitle(activity: Activity) {
  return activity.title || "Untitled task";
}

function getArea(activity: Activity) {
  return activity.category || "Other";
}

function getPriorityColor(priority?: string | null) {
  switch (priority?.toLowerCase()) {
    case "high":
      return Colors.danger;

    case "low":
      return Colors.success;

    default:
      return Colors.warning;
  }
}

function getDisplayName(
  session: ReturnType<typeof useAuth>["session"]
) {
  const metadata = session?.user?.user_metadata;

  const fullName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name.trim()
      : "";

  const name =
    typeof metadata?.name === "string"
      ? metadata.name.trim()
      : "";

  if (fullName) {
    return fullName;
  }

  if (name) {
    return name;
  }

  return "there";
}

function getInitials(name: string) {
  if (!name || name === "there") {
    return "T";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function createActivityDate(
  date?: string | null,
  time?: string | null
) {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  if (!time) {
    return new Date(
      year,
      month - 1,
      day,
      23,
      59,
      59
    );
  }

  const [hour = 0, minute = 0, second = 0] = time
    .split(":")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );
}

function getMinutesUntil(activity: Activity) {
  const date = createActivityDate(
    activity.scheduled_date,
    activity.scheduled_time
  );

  if (!date) {
    return null;
  }

  return Math.round(
    (date.getTime() - Date.now()) / 60000
  );
}

function getCountdownText(activity: Activity) {
  const minutes = getMinutesUntil(activity);

  if (minutes === null) {
    return "Scheduled";
  }

  if (minutes < 0) {
    return "Started";
  }

  if (minutes === 0) {
    return "Starting now";
  }

  if (minutes < 60) {
    return `In ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `In ${hours}h`;
    }

    return `In ${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);

  return `In ${days}d`;
}

function navigateTo(path: string) {
  router.push(path as never);
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: `${color}16`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={color}
        />
      </View>

      <View style={styles.statContent}>
        <Text style={styles.statLabel}>
          {label}
        </Text>

        <Text style={styles.statValue}>
          {value}
        </Text>

        <Text style={styles.statSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sidebarItem,
        active && styles.sidebarItemActive,
        pressed && styles.sidebarItemPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          active
            ? Colors.primary
            : "#B7C4D6"
        }
      />

      <Text
        style={[
          styles.sidebarItemText,
          active &&
            styles.sidebarItemTextActive,
        ]}
      >
        {label}
      </Text>

      {active && (
        <View style={styles.activeIndicator} />
      )}
    </Pressable>
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

  const priorityColor = getPriorityColor(
    activity.priority
  );

  return (
    <View style={styles.activityRow}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.checkbox,
          completed &&
            styles.checkboxCompleted,
          pressed && styles.checkboxPressed,
        ]}
      >
        {completed && (
          <Ionicons
            name="checkmark"
            size={15}
            color={Colors.white}
          />
        )}
      </Pressable>

      <View style={styles.activityMain}>
        <Text
          numberOfLines={1}
          style={[
            styles.activityTitle,
            completed &&
              styles.activityTitleCompleted,
          ]}
        >
          {getActivityTitle(activity)}
        </Text>

        <View style={styles.activityMeta}>
          <View style={styles.areaBadge}>
            <Text style={styles.areaBadgeText}>
              {getArea(activity)}
            </Text>
          </View>

          {activity.priority && (
            <View
              style={[
                styles.priorityDot,
                {
                  backgroundColor:
                    priorityColor,
                },
              ]}
            />
          )}

          {activity.repeat &&
            activity.repeat !== "none" && (
              <Ionicons
                name="repeat-outline"
                size={13}
                color={Colors.textMuted}
                style={{
                  marginLeft: 7,
                }}
              />
            )}
        </View>
      </View>

      <Text style={styles.activityTime}>
        {formatTime(
          activity.scheduled_time
        )}
      </Text>

      <Pressable
        style={styles.moreButton}
        onPress={() =>
          navigateTo(
            `/add-activity?edit=${activity.id}`
          )
        }
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={Colors.textMuted}
        />
      </Pressable>
    </View>
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
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={28}
          color={Colors.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyText}>
        {description}
      </Text>

      {buttonText && onPress && (
        <Pressable
          style={({ pressed }) => [
            styles.smallAddButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={onPress}
        >
          <Ionicons
            name="add"
            size={17}
            color={Colors.white}
          />

          <Text style={styles.smallAddText}>
            {buttonText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Dashboard() {
  const { width } = useWindowDimensions();
  const { session } = useAuth();

  const isDesktop = width >= 900;
  const isMobile = width < 600;

  const displayName = useMemo(
    () => getDisplayName(session),
    [session]
  );

  const initials = useMemo(
    () => getInitials(displayName),
    [displayName]
  );

  const email =
    session?.user?.email || "Personal workspace";

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [now, setNow] =
    useState(new Date());

  const today = getLocalDate();

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadActivities =
    useCallback(async () => {
      try {
        await carryForwardOverdueActivities();

        const data = await fetchActivities();

        setActivities(data);
      } catch (error) {
        console.error(
          "Failed to load activities:",
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivities();
  }, [loadActivities]);

  const todayActivities = useMemo(() => {
    return activities
      .filter(
        (activity) =>
          activity.scheduled_date === today
      )
      .sort((a, b) =>
        (
          a.scheduled_time || ""
        ).localeCompare(
          b.scheduled_time || ""
        )
      );
  }, [activities, today]);

  const completedToday = useMemo(() => {
    return todayActivities.filter(
      (activity) =>
        Boolean(activity.completed)
    );
  }, [todayActivities]);

  const upcoming = useMemo(() => {
    return activities.filter(
      (activity) =>
        Boolean(activity.scheduled_date) &&
        activity.scheduled_date! > today &&
        !activity.completed
    );
  }, [activities, today]);

  const overdue = useMemo(() => {
    return activities.filter(
      (activity) =>
        Boolean(activity.scheduled_date) &&
        activity.scheduled_date! < today &&
        !activity.completed
    );
  }, [activities, today]);

  const nextActivity = useMemo(() => {
    const currentTime = now.getTime();

    const candidates = activities
      .filter(
        (activity) =>
          !activity.completed
      )
      .map((activity) => {
        const date = createActivityDate(
          activity.scheduled_date,
          activity.scheduled_time
        );

        return {
          activity,
          date,
        };
      })
      .filter(
        (item) =>
          item.date !== null &&
          item.date.getTime() >=
            currentTime
      )
      .sort(
        (a, b) =>
          a.date!.getTime() -
          b.date!.getTime()
      );

    return (
      candidates[0]?.activity || null
    );
  }, [activities, now]);

  const progress =
    todayActivities.length > 0
      ? Math.round(
          (completedToday.length /
            todayActivities.length) *
            100
        )
      : 0;

  const areaCounts = useMemo(() => {
    const counts: Record<
      string,
      number
    > = {};

    todayActivities.forEach(
      (activity) => {
        const area = getArea(activity);

        counts[area] =
          (counts[area] || 0) + 1;
      }
    );

    return counts;
  }, [todayActivities]);

  const handleToggle = async (
    activity: Activity
  ) => {
    const newValue =
      !activity.completed;

    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? {
              ...item,
              completed: newValue,
            }
          : item
      )
    );

    try {
      await updateActivityCompletion(
        String(activity.id),
        newValue
      );
    } catch (error) {
      console.error(
        "Failed to update activity:",
        error
      );

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id
            ? {
                ...item,
                completed:
                  activity.completed,
              }
            : item
        )
      );
    }
  };

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <View style={styles.loadingLogo}>
          <View style={styles.loadingLogoInner}>
            <Ionicons
              name="checkmark"
              size={27}
              color={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.loadingTitle}>
          TaskFlow
        </Text>

        <ActivityIndicator
          size="small"
          color={Colors.primary}
          style={{
            marginTop: 18,
          }}
        />

        <Text style={styles.loadingText}>
          Preparing your workspace...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isDesktop && (
        <View style={styles.sidebar}>
          <View style={styles.brand}>
            <View
              style={styles.brandLogo}
            >
              <Ionicons
                name="checkmark"
                size={23}
                color={Colors.white}
              />
            </View>

            <View>
              <Text style={styles.brandName}>
                TaskFlow
              </Text>

              <Text
                style={styles.brandSubtitle}
              >
                YOUR DAY. YOUR WAY.
              </Text>
            </View>
          </View>

          <Text style={styles.menuLabel}>
            WORKSPACE
          </Text>

          <SidebarItem
            icon="home-outline"
            label="Home"
            active
          />

          <SidebarItem
            icon="checkmark-circle-outline"
            label="Tasks"
            onPress={() =>
              navigateTo("/tasks")
            }
          />

          <SidebarItem
            icon="calendar-outline"
            label="Calendar"
            onPress={() =>
              navigateTo("/calendar")
            }
          />

          <SidebarItem
            icon="library-outline"
            label="Library"
            onPress={() =>
              navigateTo("/library")
            }
          />

          <SidebarItem
            icon="bar-chart-outline"
            label="Reports"
            onPress={() =>
              navigateTo("/reports")
            }
          />

          <SidebarItem
            icon="sparkles-outline"
            label="AI Assist"
            onPress={() =>
              navigateTo("/ai-assist")
            }
          />

          <SidebarItem
            icon="videocam-outline"
            label="Meetings"
            onPress={() =>
              navigateTo("/meetings")
            }
          />

          <View
            style={styles.sidebarSpacer}
          />

          <Text style={styles.menuLabel}>
            MORE
          </Text>

          <SidebarItem
            icon="trash-outline"
            label="Trash"
            onPress={() =>
              navigateTo("/trash")
            }
          />

          <SidebarItem
            icon="help-circle-outline"
            label="Help"
            onPress={() =>
              navigateTo("/help")
            }
          />

          <SidebarItem
            icon="settings-outline"
            label="Settings"
            onPress={() =>
              navigateTo("/settings")
            }
          />

          <View
            style={styles.sidebarProfile}
          >
            <View
              style={styles.profileAvatar}
            >
              <Text
                style={
                  styles.profileAvatarText
                }
              >
                {initials}
              </Text>
            </View>

            <View
              style={styles.profileInfo}
            >
              <Text
                numberOfLines={1}
                style={styles.profileName}
              >
                {displayName}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.profileEmail}
              >
                {email}
              </Text>
            </View>

            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color="#8190A5"
            />
          </View>
        </View>
      )}

      <View style={styles.main}>
        <View style={styles.topbar}>
          {!isDesktop && (
            <View
              style={styles.mobileBrand}
            >
              <View
                style={styles.mobileLogo}
              >
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={Colors.white}
                />
              </View>

              <Text
                style={
                  styles.mobileBrandText
                }
              >
                TaskFlow
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.searchBox,
              !isDesktop &&
                styles.mobileSearchBox,
            ]}
            onPress={() =>
              navigateTo("/tasks")
            }
          >
            <Ionicons
              name="search-outline"
              size={19}
              color={Colors.textMuted}
            />

            <Text
              numberOfLines={1}
              style={
                styles.searchPlaceholder
              }
            >
              Search tasks, meetings,
              reports...
            </Text>

            {isDesktop && (
              <View
                style={
                  styles.searchShortcut
                }
              >
                <Text
                  style={
                    styles.searchShortcutText
                  }
                >
                  Ctrl K
                </Text>
              </View>
            )}
          </Pressable>

          <View
            style={styles.topbarActions}
          >
            <Pressable
              style={styles.iconButton}
              onPress={() =>
                navigateTo("/settings")
              }
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={
                  Colors.textOnDark
                }
              />

              <View
                style={
                  styles.notificationDot
                }
              />
            </Pressable>

            <Pressable
              style={styles.aiButton}
              onPress={() =>
                navigateTo("/ai-assist")
              }
            >
              <Ionicons
                name="sparkles"
                size={17}
                color={Colors.white}
              />

              {isDesktop && (
                <Text
                  style={
                    styles.aiButtonText
                  }
                >
                  AI Assist
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.topAvatar}
              onPress={() =>
                navigateTo("/settings")
              }
            >
              <Text
                style={
                  styles.topAvatarText
                }
              >
                {initials}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={[
            styles.content,
            isMobile &&
              styles.mobileContent,
          ]}
        >
          <View
            style={[
              styles.greetingRow,
              isMobile &&
                styles.mobileGreetingRow,
            ]}
          >
            <View
              style={styles.greetingContent}
            >
              <Text
                style={[
                  styles.greeting,
                  isMobile &&
                    styles.mobileGreeting,
                ]}
              >
                {getGreeting()},{" "}
                {displayName}
              </Text>

              <Text
                style={styles.subtitle}
              >
                Here's what's happening
                with your day.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={() =>
                navigateTo(
                  "/add-activity"
                )
              }
            >
              <Ionicons
                name="add"
                size={21}
                color={Colors.white}
              />

              {!isMobile && (
                <Text
                  style={
                    styles.addButtonText
                  }
                >
                  New Task
                </Text>
              )}
            </Pressable>
          </View>

          <View
            style={styles.progressCard}
          >
            <View
              style={
                styles.progressHeader
              }
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.progressTitle
                  }
                >
                  Today's progress
                </Text>

                <Text
                  style={
                    styles.progressDescription
                  }
                >
                  {completedToday.length}{" "}
                  of{" "}
                  {todayActivities.length}{" "}
                  tasks completed
                </Text>
              </View>

              <View
                style={
                  styles.progressPercentageBox
                }
              >
                <Text
                  style={
                    styles.progressPercentage
                  }
                >
                  {progress}%
                </Text>
              </View>
            </View>

            <View
              style={styles.progressTrack}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>

            <View
              style={
                styles.progressFooter
              }
            >
              <Text
                style={
                  styles.progressFooterText
                }
              >
                {progress >= 80
                  ? "Excellent progress today."
                  : progress >= 50
                  ? "You're making good progress."
                  : "Let's get your day moving."}
              </Text>

              <View
                style={
                  styles.progressArrow
                }
              >
                <Ionicons
                  name={
                    progress >= 80
                      ? "rocket-outline"
                      : "arrow-forward-outline"
                  }
                  size={17}
                  color={Colors.primary}
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statsGrid,
              isMobile &&
                styles.mobileStatsGrid,
            ]}
          >
            <StatCard
              icon="today-outline"
              label="Today"
              value={
                todayActivities.length
              }
              subtitle={`${completedToday.length} completed`}
              color={Colors.primary}
            />

            <StatCard
              icon="calendar-outline"
              label="Upcoming"
              value={upcoming.length}
              subtitle="Future tasks"
              color="#7F56D9"
            />

            <StatCard
              icon="alert-circle-outline"
              label="Overdue"
              value={overdue.length}
              subtitle={
                overdue.length === 0
                  ? "You're all caught up"
                  : "Needs attention"
              }
              color={Colors.danger}
            />
          </View>

          <View style={styles.section}>
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Next up
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Your next scheduled
                  activity
                </Text>
              </View>

              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
            </View>

            {nextActivity ? (
              <View
                style={styles.nextCard}
              >
                <View
                  style={styles.nextIcon}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={23}
                    color={Colors.white}
                  />
                </View>

                <View
                  style={styles.nextMain}
                >
                  <Text
                    numberOfLines={1}
                    style={
                      styles.nextTitle
                    }
                  >
                    {getActivityTitle(
                      nextActivity
                    )}
                  </Text>

                  <View
                    style={
                      styles.nextMetaRow
                    }
                  >
                    <Text
                      style={
                        styles.nextArea
                      }
                    >
                      {getArea(
                        nextActivity
                      )}
                    </Text>

                    <View
                      style={
                        styles.nextDot
                      }
                    />

                    <Text
                      style={
                        styles.nextCountdown
                      }
                    >
                      {getCountdownText(
                        nextActivity
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.nextTimeContainer
                  }
                >
                  <Text
                    style={styles.nextTime}
                  >
                    {formatTime(
                      nextActivity.scheduled_time
                    )}
                  </Text>

                  <Text
                    style={
                      styles.nextTimeLabel
                    }
                  >
                    {nextActivity.scheduled_date ===
                    today
                      ? "TODAY"
                      : nextActivity.scheduled_date}
                  </Text>
                </View>
              </View>
            ) : (
              <EmptyState
                icon="checkmark-done-circle-outline"
                title="You're all caught up"
                description="There are no pending activities scheduled."
                buttonText="Add task"
                onPress={() =>
                  navigateTo(
                    "/add-activity"
                  )
                }
              />
            )}
          </View>

          <View style={styles.section}>
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Today's activities
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Stay focused on what
                  matters today
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  navigateTo(
                    "/add-activity"
                  )
                }
                style={({ pressed }) =>
                  pressed &&
                  styles.linkPressed
                }
              >
                <Text
                  style={styles.viewAll}
                >
                  + Add task
                </Text>
              </Pressable>
            </View>

            <View
              style={styles.activitiesCard}
            >
              {todayActivities.length >
              0 ? (
                todayActivities.map(
                  (activity, index) => (
                    <View
                      key={activity.id}
                      style={
                        index ===
                        todayActivities.length -
                          1
                          ? undefined
                          : styles.activityBorder
                      }
                    >
                      <ActivityRow
                        activity={activity}
                        onToggle={() =>
                          handleToggle(
                            activity
                          )
                        }
                      />
                    </View>
                  )
                )
              ) : (
                <EmptyState
                  icon="calendar-clear-outline"
                  title="Nothing scheduled"
                  description="Add your first task for today."
                  buttonText="Add task"
                  onPress={() =>
                    navigateTo(
                      "/add-activity"
                    )
                  }
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Life areas
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  See where your attention
                  is going
                </Text>
              </View>
            </View>

            <View
              style={styles.lifeAreaGrid}
            >
              {LIFE_AREAS.map(
                (area) => {
                  const count =
                    areaCounts[
                      area.name
                    ] || 0;

                  return (
                    <View
                      key={area.name}
                      style={[
                        styles.lifeAreaCard,
                        isMobile &&
                          styles.mobileLifeAreaCard,
                      ]}
                    >
                      <View
                        style={[
                          styles.lifeAreaIcon,
                          {
                            backgroundColor: `${area.color}16`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={area.icon}
                          size={20}
                          color={
                            area.color
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.lifeAreaName
                        }
                      >
                        {area.name}
                      </Text>

                      <Text
                        style={
                          styles.lifeAreaCount
                        }
                      >
                        {count}{" "}
                        {count === 1
                          ? "task"
                          : "tasks"}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          </View>

          {overdue.length > 0 && (
            <View
              style={styles.overdueCard}
            >
              <View
                style={styles.overdueIcon}
              >
                <Ionicons
                  name="alert-outline"
                  size={22}
                  color={Colors.danger}
                />
              </View>

              <View
                style={styles.overdueContent}
              >
                <Text
                  style={
                    styles.overdueTitle
                  }
                >
                  You have{" "}
                  {overdue.length} overdue{" "}
                  {overdue.length === 1
                    ? "task"
                    : "tasks"}
                </Text>

                <Text
                  style={
                    styles.overdueText
                  }
                >
                  Review these tasks and
                  reschedule or carry them
                  forward.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  navigateTo("/trash")
                }
                style={
                  styles.overdueArrow
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.danger}
                />
              </Pressable>
            </View>
          )}

          <View
            style={{ height: 40 }}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navyDeep,
  },

  loadingLogo: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },

  loadingLogoInner: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  loadingTitle: {
    marginTop: 15,
    fontSize: 25,
    fontWeight: "800",
    color: Colors.white,
  },

  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9FB0C5",
  },

  sidebar: {
    width: 248,
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingTop: 26,
    paddingBottom: 18,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 38,
  },

  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  brandName: {
    marginLeft: 11,
    fontSize: 21,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.3,
  },

  brandSubtitle: {
    marginLeft: 11,
    marginTop: 2,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#8EA0B8",
  },

  menuLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#71839B",
    letterSpacing: 1.4,
    marginHorizontal: 10,
    marginBottom: 10,
  },

  sidebarItem: {
    height: 47,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 4,
    position: "relative",
  },

  sidebarItemPressed: {
    opacity: 0.72,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  sidebarItemActive: {
    backgroundColor: "rgba(255,122,0,0.12)",
  },

  sidebarItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#B7C4D6",
  },

  sidebarItemTextActive: {
    color: Colors.primary,
    fontWeight: "800",
  },

  activeIndicator: {
    position: "absolute",
    right: 0,
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  sidebarSpacer: {
    flex: 1,
  },

  sidebarProfile: {
    marginTop: 15,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  profileAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "rgba(255,122,0,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  profileAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.white,
  },

  profileEmail: {
    fontSize: 9,
    color: "#7F91A9",
    marginTop: 3,
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  topbar: {
    minHeight: 76,
    paddingHorizontal: 22,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 2,
  },

  mobileLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileBrandText: {
    marginLeft: 8,
    fontSize: 19,
    fontWeight: "800",
    color: Colors.navy,
  },

  searchBox: {
    flex: 1,
    maxWidth: 650,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FAFBFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  mobileSearchBox: {
    minWidth: 0,
  },

  searchPlaceholder: {
    marginLeft: 9,
    color: Colors.textMuted,
    fontSize: 13,
    flex: 1,
  },

  searchShortcut: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  searchShortcutText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "600",
  },

  topbarActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navy,
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.navy,
  },

  aiButton: {
    height: 42,
    minWidth: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  aiButtonText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 12,
  },

  topAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  topAvatarText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 13,
  },

  content: {
    paddingHorizontal: 32,
    paddingTop: 30,
    paddingBottom: 30,
    maxWidth: 1250,
    width: "100%",
    alignSelf: "center",
  },

  mobileContent: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  mobileGreetingRow: {
    alignItems: "flex-start",
  },

  greetingContent: {
    flex: 1,
  },

  greeting: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.navy,
    letterSpacing: -0.7,
  },

  mobileGreeting: {
    fontSize: 25,
    lineHeight: 31,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  addButton: {
    minHeight: 45,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginLeft: 12,
  },

  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  progressCard: {
    backgroundColor: Colors.navy,
    borderRadius: 20,
    padding: 23,
    marginBottom: 16,
    overflow: "hidden",
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.white,
  },

  progressDescription: {
    marginTop: 5,
    color: "#A8B8CC",
    fontSize: 12,
  },

  progressPercentageBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(255,122,0,0.13)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.20)",
  },

  progressPercentage: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
  },

  progressTrack: {
    height: 9,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginTop: 20,
  },

  progressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },

  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },

  progressFooterText: {
    fontSize: 12,
    color: "#A8B8CC",
  },

  progressArrow: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,122,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  statsGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 27,
  },

  mobileStatsGrid: {
    flexDirection: "column",
  },

  statCard: {
    flex: 1,
    minHeight: 115,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 17,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  statIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  statContent: {
    marginLeft: 11,
    flex: 1,
  },

  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },

  statValue: {
    fontSize: 26,
    color: Colors.navy,
    fontWeight: "800",
    marginTop: 3,
  },

  statSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.navy,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  sectionIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  viewAll: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  linkPressed: {
    opacity: 0.6,
  },

  nextCard: {
    backgroundColor: Colors.navy,
    minHeight: 105,
    borderRadius: 19,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  nextIcon: {
    width: 49,
    height: 49,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  nextMain: {
    flex: 1,
    minWidth: 0,
  },

  nextTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "800",
  },

  nextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  nextArea: {
    color: "#B6C3D5",
    fontSize: 12,
  },

  nextDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#667891",
    marginHorizontal: 7,
  },

  nextCountdown: {
    color: "#FFB36D",
    fontSize: 11,
    fontWeight: "800",
  },

  nextTimeContainer: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  nextTime: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "800",
  },

  nextTimeLabel: {
    color: "#7F91A9",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
  },

  emptyCard: {
    minHeight: 150,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  emptyIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 9,
    color: Colors.navy,
    fontSize: 15,
    fontWeight: "800",
  },

  emptyText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },

  activitiesCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },

  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  activityRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CBD3DF",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxPressed: {
    opacity: 0.65,
  },

  checkboxCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  activityMain: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },

  activityTitleCompleted: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },

  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F3F6",
  },

  areaBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 7,
  },

  activityTime: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "700",
    marginRight: 7,
  },

  moreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  smallAddButton: {
    marginTop: 15,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  smallAddText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },

  lifeAreaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  lifeAreaCard: {
    flex: 1,
    minWidth: 145,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },

  mobileLifeAreaCard: {
    minWidth: "46%",
  },

  lifeAreaIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  lifeAreaName: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.navy,
  },

  lifeAreaCount: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  overdueCard: {
    backgroundColor: "#FFF8F6",
    borderWidth: 1,
    borderColor: "#F5D9D2",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  overdueIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FDECEA",
    alignItems: "center",
    justifyContent: "center",
  },

  overdueContent: {
    flex: 1,
  },

  overdueTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },

  overdueText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },

  overdueArrow: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});