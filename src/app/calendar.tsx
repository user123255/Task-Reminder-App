import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  fetchActivitiesForDate,
  updateActivityCompletion,
  type Activity,
} from "@/services/activities";

/* -------------------------------------------------------------------------- */
/*                               DESIGN SYSTEM                                */
/* -------------------------------------------------------------------------- */

const COLORS = {
  navy: "#0B1F3A",
  navyDark: "#07162A",
  navySoft: "#163354",

  orange: "#FF7A00",
  orangeDark: "#E96500",
  orangeSoft: "#FFF1E5",

  gold: "#DFAE45",
  goldSoft: "#FBF5E7",

  background: "#F4F5F7",
  white: "#FFFFFF",

  text: "#10213A",
  muted: "#64748B",
  lightMuted: "#94A3B8",

  border: "#E2E6EB",
  borderStrong: "#D4DAE2",

  success: "#198754",
  successSoft: "#EAF6EF",

  danger: "#C94A4A",
  dangerSoft: "#FCECEC",

  warning: "#B7791F",
  warningSoft: "#FFF7E5",
};

const NAV_ITEMS = [
  { label: "Home", icon: "home-outline", route: "/" },
  { label: "Tasks", icon: "checkmark-square-outline", route: "/tasks" },
  { label: "Calendar", icon: "calendar-outline", route: "/calendar" },
  { label: "Library", icon: "library-outline", route: "/library" },
  { label: "Reports", icon: "bar-chart-outline", route: "/reports" },
  { label: "AI Assist", icon: "sparkles-outline", route: "/ai-assist" },
  { label: "Meetings", icon: "people-outline", route: "/meetings" },
  { label: "Trash", icon: "trash-outline", route: "/trash" },
  { label: "Help", icon: "help-circle-outline", route: "/help" },
  { label: "Settings", icon: "settings-outline", route: "/settings" },
];

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatSelectedDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityTime(value?: string | null) {
  if (!value) return "No time";

  const parts = value.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${pad(minute)} ${suffix}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const previousMonthDays = new Date(year, month, 0).getDate();

  const days: {
    day: number;
    date: Date;
    currentMonth: boolean;
    key: string;
  }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = previousMonthDays - i;
    const date = new Date(year, month - 1, day);

    days.push({
      day,
      date,
      currentMonth: false,
      key: toDateKey(date),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);

    days.push({
      day,
      date,
      currentMonth: true,
      key: toDateKey(date),
    });
  }

  let nextDay = 1;

  while (days.length < 42) {
    const date = new Date(year, month + 1, nextDay);

    days.push({
      day: nextDay,
      date,
      currentMonth: false,
      key: toDateKey(date),
    });

    nextDay++;
  }

  return days;
}

/* -------------------------------------------------------------------------- */
/*                              NAVIGATION                                    */
/* -------------------------------------------------------------------------- */

function navigate(route: string) {
  router.push(route as never);
}

/* -------------------------------------------------------------------------- */
/*                            CALENDAR SCREEN                                  */
/* -------------------------------------------------------------------------- */

export default function CalendarScreen() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1000;
  const isTablet = width >= 700;

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadActivities = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await fetchActivitiesForDate(selectedDate);
        setActivities(data || []);
      } catch (error) {
        console.error("Failed to load calendar activities:", error);
        setActivities([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const calendarDays = useMemo(
    () =>
      getCalendarDays(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth()
      ),
    [visibleMonth]
  );

  const completedCount = activities.filter(
    (activity) => activity.completed
  ).length;

  const pendingCount = activities.length - completedCount;

  const progress =
    activities.length > 0
      ? Math.round((completedCount / activities.length) * 100)
      : 0;

  const goToPreviousMonth = () => {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    setVisibleMonth(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );
    setSelectedDate(todayKey);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(toDateKey(date));

    if (
      date.getMonth() !== visibleMonth.getMonth() ||
      date.getFullYear() !== visibleMonth.getFullYear()
    ) {
      setVisibleMonth(
        new Date(date.getFullYear(), date.getMonth(), 1)
      );
    }
  };

  const toggleActivity = async (activity: Activity) => {
    if (updatingId) return;

    try {
      setUpdatingId(activity.id);

      await updateActivityCompletion(activity.id, !activity.completed);

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id
            ? {
                ...item,
                completed: !item.completed,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to update activity:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const selectedDateObject = parseDateKey(selectedDate);

  return (
    <View style={styles.screen}>
      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP TOP NAVIGATION                                             */}
      {/* ------------------------------------------------------------------ */}

      {isDesktop && (
        <View style={styles.desktopTopBar}>
          <Pressable
            style={styles.brand}
            onPress={() => navigate("/")}
          >
            <View style={styles.brandMark}>
              <Ionicons
                name="checkmark"
                size={19}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.brandText}>TaskFlow</Text>
          </Pressable>

          <View style={styles.desktopNav}>
            {NAV_ITEMS.slice(0, 7).map((item) => {
              const active = item.route === "/calendar";

              return (
                <Pressable
                  key={item.route}
                  style={[
                    styles.desktopNavItem,
                    active && styles.desktopNavItemActive,
                  ]}
                  onPress={() => navigate(item.route)}
                >
                  <Text
                    style={[
                      styles.desktopNavText,
                      active && styles.desktopNavTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.topRightActions}>
            <Pressable
              style={styles.topIconButton}
              onPress={() => navigate("/help")}
            >
              <Ionicons
                name="help-circle-outline"
                size={21}
                color={COLORS.white}
              />
            </Pressable>

            <Pressable
              style={styles.profileButton}
              onPress={() => navigate("/settings")}
            >
              <Text style={styles.profileLetter}>N</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.mainArea}>
        {/* -------------------------------------------------------------- */}
        {/* MOBILE HEADER                                                   */}
        {/* -------------------------------------------------------------- */}

        {!isDesktop && (
          <View style={styles.mobileHeader}>
            <Pressable
              style={styles.mobileMenuButton}
              onPress={() => setDrawerOpen(true)}
            >
              <Ionicons
                name="menu-outline"
                size={27}
                color={COLORS.white}
              />
            </Pressable>

            <Pressable
              style={styles.mobileBrand}
              onPress={() => navigate("/")}
            >
              <View style={styles.mobileBrandMark}>
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.mobileBrandText}>TaskFlow</Text>
            </Pressable>

            <Pressable
              style={styles.mobileProfile}
              onPress={() => navigate("/settings")}
            >
              <Text style={styles.mobileProfileText}>N</Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: isDesktop
                ? 48
                : isTablet
                ? 28
                : 18,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadActivities(true)}
              tintColor={COLORS.orange}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ------------------------------------------------------------ */}
          {/* HERO                                                          */}
          {/* ------------------------------------------------------------ */}

          <View style={styles.hero}>
            <View style={styles.heroDecorOne} />
            <View style={styles.heroDecorTwo} />

            <View style={styles.heroContent}>
              <Text style={styles.eyebrow}>PLAN YOUR TIME</Text>

              <Text style={styles.heroTitle}>Calendar</Text>

              <Text style={styles.heroSubtitle}>
                See your schedule, stay organized, and keep your
                important activities moving forward.
              </Text>
            </View>

            <View style={styles.heroActions}>
              <Pressable
                style={styles.heroSecondaryButton}
                onPress={goToToday}
              >
                <Text style={styles.heroSecondaryText}>
                  Today
                </Text>
              </Pressable>

              <Pressable
                style={styles.heroPrimaryButton}
                onPress={() => navigate("/add-activity")}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={COLORS.white}
                />

                <Text style={styles.heroPrimaryText}>
                  New Task
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ------------------------------------------------------------ */}
          {/* CALENDAR SECTION                                               */}
          {/* ------------------------------------------------------------ */}

          <View style={styles.calendarCard}>
            <View
              style={[
                styles.calendarHeader,
                !isTablet && styles.calendarHeaderMobile,
              ]}
            >
              <View>
                <Text style={styles.sectionEyebrow}>
                  MONTHLY VIEW
                </Text>

                <Text style={styles.monthTitle}>
                  {MONTHS[visibleMonth.getMonth()]}{" "}
                  {visibleMonth.getFullYear()}
                </Text>
              </View>

              <View style={styles.monthControls}>
                <Pressable
                  style={styles.monthButton}
                  onPress={goToPreviousMonth}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={COLORS.navy}
                  />
                </Pressable>

                <Pressable
                  style={styles.monthButton}
                  onPress={goToToday}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={COLORS.orange}
                  />
                </Pressable>

                <Pressable
                  style={styles.monthButton}
                  onPress={goToNextMonth}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.navy}
                  />
                </Pressable>
              </View>
            </View>

            {/* Week labels */}

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}

            <View style={styles.calendarGrid}>
              {calendarDays.map((item) => {
                const isSelected = item.key === selectedDate;
                const isToday = item.key === todayKey;

                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.dayCell,
                      !item.currentMonth &&
                        styles.dayCellOutsideMonth,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => selectDate(item.date)}
                  >
                    <View
                      style={[
                        styles.dayNumber,
                        isToday && styles.todayNumber,
                        isSelected && styles.selectedDayNumber,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !item.currentMonth &&
                            styles.dayTextOutsideMonth,
                          isSelected && styles.selectedDayText,
                          isToday &&
                            !isSelected &&
                            styles.todayDayText,
                        ]}
                      >
                        {item.day}
                      </Text>
                    </View>

                    {isToday && (
                      <View
                        style={[
                          styles.todayDot,
                          isSelected && styles.todayDotSelected,
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Legend */}

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: COLORS.orange },
                  ]}
                />

                <Text style={styles.legendText}>Selected</Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: COLORS.gold },
                  ]}
                />

                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </View>

          {/* ------------------------------------------------------------ */}
          {/* SELECTED DATE + SUMMARY                                       */}
          {/* ------------------------------------------------------------ */}

          <View
            style={[
              styles.lowerSection,
              isDesktop && styles.lowerSectionDesktop,
            ]}
          >
            <View
              style={[
                styles.activitiesColumn,
                isDesktop && styles.activitiesColumnDesktop,
              ]}
            >
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    SELECTED DAY
                  </Text>

                  <Text style={styles.sectionTitle}>
                    {formatSelectedDate(selectedDateObject)}
                  </Text>
                </View>

                <Pressable
                  style={styles.refreshButton}
                  onPress={() => loadActivities(true)}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={COLORS.navy}
                  />
                </Pressable>
              </View>

              {loading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.orange}
                  />

                  <Text style={styles.loadingText}>
                    Loading activities...
                  </Text>
                </View>
              ) : activities.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="calendar-clear-outline"
                      size={25}
                      color={COLORS.orange}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>
                    Nothing scheduled
                  </Text>

                  <Text style={styles.emptyText}>
                    There are no activities planned for this
                    date. Add a task to start organizing your
                    day.
                  </Text>

                  <Pressable
                    style={styles.emptyButton}
                    onPress={() => navigate("/add-activity")}
                  >
                    <Ionicons
                      name="add"
                      size={17}
                      color={COLORS.white}
                    />

                    <Text style={styles.emptyButtonText}>
                      Add Activity
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.activityList}>
                  {activities.map((activity, index) => {
                    const isUpdating =
                      updatingId === activity.id;

                    const priority =
                      activity.priority || "medium";

                    return (
                      <View
                        key={activity.id}
                        style={[
                          styles.activityCard,
                          activity.completed &&
                            styles.activityCardCompleted,
                        ]}
                      >
                        <View
                          style={[
                            styles.activityAccent,
                            {
                              backgroundColor:
                                activity.category_color ||
                                COLORS.orange,
                            },
                          ]}
                        />

                        <View style={styles.activityMain}>
                          <View style={styles.activityTop}>
                            <View
                              style={[
                                styles.categoryIcon,
                                {
                                  backgroundColor:
                                    activity.category_color
                                      ? `${activity.category_color}18`
                                      : COLORS.orangeSoft,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  (activity.category_icon as any) ||
                                  "ellipse-outline"
                                }
                                size={18}
                                color={
                                  activity.category_color ||
                                  COLORS.orange
                                }
                              />
                            </View>

                            <View style={styles.activityTitleArea}>
                              <Text
                                numberOfLines={2}
                                style={[
                                  styles.activityTitle,
                                  activity.completed &&
                                    styles.activityTitleCompleted,
                                ]}
                              >
                                {activity.title}
                              </Text>

                              <View
                                style={
                                  styles.activityMeta
                                }
                              >
                                <Text
                                  style={
                                    styles.activityTime
                                  }
                                >
                                  {formatActivityTime(
                                    activity.scheduled_time
                                  )}
                                </Text>

                                {!!activity.category && (
                                  <>
                                    <View
                                      style={
                                        styles.metaDivider
                                      }
                                    />

                                    <Text
                                      style={
                                        styles.activityCategory
                                      }
                                    >
                                      {activity.category}
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>

                            <Pressable
                              style={[
                                styles.completeButton,
                                activity.completed &&
                                  styles.completeButtonDone,
                              ]}
                              onPress={() =>
                                toggleActivity(activity)
                              }
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <ActivityIndicator
                                  size="small"
                                  color={
                                    activity.completed
                                      ? COLORS.success
                                      : COLORS.orange
                                  }
                                />
                              ) : (
                                <Ionicons
                                  name={
                                    activity.completed
                                      ? "checkmark"
                                      : "ellipse-outline"
                                  }
                                  size={21}
                                  color={
                                    activity.completed
                                      ? COLORS.success
                                      : COLORS.lightMuted
                                  }
                                />
                              )}
                            </Pressable>
                          </View>

                          <View style={styles.activityBottom}>
                            <View
                              style={[
                                styles.priorityBadge,
                                priority === "high" &&
                                  styles.highPriority,
                                priority === "low" &&
                                  styles.lowPriority,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.priorityText,
                                  priority === "high" &&
                                    styles.highPriorityText,
                                  priority === "low" &&
                                    styles.lowPriorityText,
                                ]}
                              >
                                {String(priority).toUpperCase()}
                              </Text>
                            </View>

                            <Pressable
                              style={styles.editButton}
                              onPress={() =>
                                navigate(
                                  `/add-activity?edit=${activity.id}`
                                )
                              }
                            >
                              <Ionicons
                                name="create-outline"
                                size={16}
                                color={COLORS.navy}
                              />

                              <Text
                                style={styles.editButtonText}
                              >
                                Edit
                              </Text>
                            </Pressable>
                          </View>
                        </View>

                        <Text style={styles.activityIndex}>
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ---------------------------------------------------------- */}
            {/* SUMMARY                                                     */}
            {/* ---------------------------------------------------------- */}

            <View
              style={[
                styles.summaryColumn,
                isDesktop && styles.summaryColumnDesktop,
              ]}
            >
              <Text style={styles.sectionEyebrow}>
                DAY SUMMARY
              </Text>

              <Text style={styles.summaryTitle}>
                Your progress
              </Text>

              <View style={styles.progressCard}>
                <View style={styles.progressTop}>
                  <View>
                    <Text style={styles.progressLabel}>
                      COMPLETION
                    </Text>

                    <Text style={styles.progressValue}>
                      {progress}%
                    </Text>
                  </View>

                  <View style={styles.progressCircle}>
                    <Text style={styles.progressCircleText}>
                      {completedCount}/{activities.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.progressDescription}>
                  {activities.length === 0
                    ? "No activities scheduled yet."
                    : completedCount === activities.length
                    ? "Everything scheduled for this day is complete."
                    : `${pendingCount} ${
                        pendingCount === 1
                          ? "activity remains"
                          : "activities remain"
                      } for this day.`}
                </Text>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIcon,
                      styles.statIconOrange,
                    ]}
                  >
                    <Ionicons
                      name="list-outline"
                      size={19}
                      color={COLORS.orange}
                    />
                  </View>

                  <Text style={styles.statValue}>
                    {activities.length}
                  </Text>

                  <Text style={styles.statLabel}>
                    Total
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIcon,
                      styles.statIconGreen,
                    ]}
                  >
                    <Ionicons
                      name="checkmark-outline"
                      size={19}
                      color={COLORS.success}
                    />
                  </View>

                  <Text style={styles.statValue}>
                    {completedCount}
                  </Text>

                  <Text style={styles.statLabel}>
                    Completed
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIcon,
                      styles.statIconGold,
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={COLORS.gold}
                    />
                  </View>

                  <Text style={styles.statValue}>
                    {pendingCount}
                  </Text>

                  <Text style={styles.statLabel}>
                    Pending
                  </Text>
                </View>
              </View>

              <View style={styles.tipCard}>
                <View style={styles.tipIcon}>
                  <Ionicons
                    name="bulb-outline"
                    size={20}
                    color={COLORS.gold}
                  />
                </View>

                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>
                    Keep your day focused
                  </Text>

                  <Text style={styles.tipText}>
                    Use the calendar to balance your priorities
                    and make space for what matters most.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ------------------------------------------------------------ */}
          {/* FOOTER                                                        */}
          {/* ------------------------------------------------------------ */}

          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              <View style={styles.footerMark}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.footerBrandText}>
                TaskFlow
              </Text>
            </View>

            <Text style={styles.footerText}>
              Organize your time. Focus on what matters.
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE DRAWER                                                      */}
      {/* ------------------------------------------------------------------ */}

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() => setDrawerOpen(false)}
          />

          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Pressable
                style={styles.drawerBrand}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate("/");
                }}
              >
                <View style={styles.drawerBrandMark}>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={COLORS.white}
                  />
                </View>

                <Text style={styles.drawerBrandText}>
                  TaskFlow
                </Text>
              </Pressable>

              <Pressable
                style={styles.drawerClose}
                onPress={() => setDrawerOpen(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={COLORS.white}
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.drawerContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerLabel}>
                WORKSPACE
              </Text>

              {NAV_ITEMS.map((item) => {
                const active = item.route === "/calendar";

                return (
                  <Pressable
                    key={item.route}
                    style={[
                      styles.drawerItem,
                      active && styles.drawerItemActive,
                    ]}
                    onPress={() => {
                      setDrawerOpen(false);
                      navigate(item.route);
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={
                        active
                          ? COLORS.orange
                          : COLORS.white
                      }
                    />

                    <Text
                      style={[
                        styles.drawerItemText,
                        active &&
                          styles.drawerItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>
                TaskFlow
              </Text>

              <Text style={styles.drawerVersion}>
                Version 1.0.0
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* Desktop navigation */

  desktopTopBar: {
    height: 72,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 38,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    width: 170,
  },

  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  brandText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  desktopNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  desktopNavItem: {
    paddingHorizontal: 12,
    height: 72,
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },

  desktopNavItemActive: {
    borderBottomColor: COLORS.orange,
  },

  desktopNavText: {
    color: "#B8C4D3",
    fontSize: 13,
    fontWeight: "600",
  },

  desktopNavTextActive: {
    color: COLORS.white,
  },

  topRightActions: {
    width: 170,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },

  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  profileLetter: {
    color: COLORS.navy,
    fontWeight: "800",
    fontSize: 14,
  },

  mainArea: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingTop: 30,
    paddingBottom: 40,
    maxWidth: 1500,
    width: "100%",
    alignSelf: "center",
  },

  /* Mobile header */

  mobileHeader: {
    height: 64,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
  },

  mobileMenuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  mobileBrandMark: {
    width: 29,
    height: 29,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  mobileBrandText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },

  mobileProfile: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileProfileText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "800",
  },

  /* Hero */

  hero: {
    minHeight: 205,
    backgroundColor: COLORS.navy,
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 30,
    paddingVertical: 28,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },

  heroContent: {
    flex: 1,
    maxWidth: 720,
    zIndex: 2,
  },

  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.1,
    marginBottom: 9,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1.1,
    marginBottom: 8,
  },

  heroSubtitle: {
    color: "#C2CEDC",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 650,
  },

  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 25,
    zIndex: 3,
  },

  heroSecondaryButton: {
    height: 44,
    paddingHorizontal: 17,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroSecondaryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  heroPrimaryButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  heroPrimaryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  heroDecorOne: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    right: 80,
    top: -130,
  },

  heroDecorTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.13)",
    right: -45,
    bottom: -80,
  },

  /* Calendar */

  calendarCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
  },

  calendarHeader: {
    paddingHorizontal: 24,
    paddingVertical: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  calendarHeaderMobile: {
    alignItems: "flex-start",
    gap: 15,
  },

  sectionEyebrow: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 6,
  },

  monthTitle: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  monthControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  monthButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  weekRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FAFBFC",
  },

  weekDayCell: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  weekDayText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: "14.2857%",
    height: 74,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightColor: COLORS.border,
    borderBottomColor: COLORS.border,
    padding: 8,
    alignItems: "center",
  },

  dayCellOutsideMonth: {
    backgroundColor: "#FAFBFC",
  },

  dayCellSelected: {
    backgroundColor: COLORS.orangeSoft,
  },

  dayNumber: {
    width: 31,
    height: 31,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  todayNumber: {
    borderWidth: 1,
    borderColor: COLORS.gold,
  },

  selectedDayNumber: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
    borderWidth: 0,
  },

  dayText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "700",
  },

  dayTextOutsideMonth: {
    color: "#B7C0CB",
  },

  selectedDayText: {
    color: COLORS.white,
  },

  todayDayText: {
    color: COLORS.warning,
  },

  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 5,
  },

  todayDotSelected: {
    backgroundColor: COLORS.orange,
  },

  legend: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  legendText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  /* Lower content */

  lowerSection: {
    marginTop: 24,
  },

  lowerSectionDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 22,
  },

  activitiesColumn: {
    width: "100%",
  },

  activitiesColumnDesktop: {
    flex: 1.65,
  },

  summaryColumn: {
    width: "100%",
    marginTop: 28,
  },

  summaryColumnDesktop: {
    flex: 0.8,
    marginTop: 0,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.45,
  },

  refreshButton: {
    width: 39,
    height: 39,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingCard: {
    minHeight: 160,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 25,
    paddingVertical: 34,
    alignItems: "center",
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 7,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 470,
    marginBottom: 18,
  },

  emptyButton: {
    backgroundColor: COLORS.orange,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  /* Activity cards */

  activityList: {
    gap: 10,
  },

  activityCard: {
    minHeight: 112,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 7,
    overflow: "hidden",
    flexDirection: "row",
    position: "relative",
  },

  activityCardCompleted: {
    backgroundColor: "#FCFDFC",
  },

  activityAccent: {
    width: 4,
    height: "100%",
  },

  activityMain: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  activityTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  categoryIcon: {
    width: 39,
    height: 39,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  activityTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  activityTitle: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "750" as any,
    marginBottom: 5,
  },

  activityTitleCompleted: {
    color: COLORS.muted,
    textDecorationLine: "line-through",
  },

  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  activityTime: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.lightMuted,
  },

  activityCategory: {
    color: COLORS.lightMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  completeButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  completeButtonDone: {
    backgroundColor: COLORS.successSoft,
  },

  activityBottom: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  priorityBadge: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },

  highPriority: {
    backgroundColor: COLORS.dangerSoft,
  },

  lowPriority: {
    backgroundColor: "#F1F4F7",
  },

  priorityText: {
    color: COLORS.warning,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  highPriorityText: {
    color: COLORS.danger,
  },

  lowPriorityText: {
    color: COLORS.muted,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  editButtonText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "800",
  },

  activityIndex: {
    position: "absolute",
    right: 9,
    bottom: 7,
    color: "#D8DEE6",
    fontSize: 9,
    fontWeight: "800",
  },

  /* Summary */

  summaryTitle: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.45,
    marginBottom: 13,
  },

  progressCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 8,
    padding: 19,
    marginBottom: 10,
  },

  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressLabel: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 4,
  },

  progressValue: {
    color: COLORS.white,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
  },

  progressCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
  },

  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.13)",
    marginTop: 18,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.orange,
  },

  progressDescription: {
    color: "#AEBCCC",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 11,
  },

  summaryStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 7,
    padding: 12,
    minHeight: 110,
  },

  statIcon: {
    width: 33,
    height: 33,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  statIconOrange: {
    backgroundColor: COLORS.orangeSoft,
  },

  statIconGreen: {
    backgroundColor: COLORS.successSoft,
  },

  statIconGold: {
    backgroundColor: COLORS.goldSoft,
  },

  statValue: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 2,
  },

  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
  },

  tipCard: {
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: "#EFE0B9",
    borderRadius: 7,
    padding: 14,
    flexDirection: "row",
  },

  tipIcon: {
    width: 35,
    height: 35,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },

  tipText: {
    color: COLORS.muted,
    fontSize: 10.5,
    lineHeight: 16,
  },

  /* Footer */

  footer: {
    marginTop: 35,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },

  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  footerMark: {
    width: 23,
    height: 23,
    borderRadius: 5,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  footerBrandText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "800",
  },

  footerText: {
    color: COLORS.lightMuted,
    fontSize: 10.5,
  },

  /* Drawer */

  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
  },

  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  drawer: {
    width: 290,
    maxWidth: "82%",
    backgroundColor: COLORS.navy,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 3,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },

  drawerHeader: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  drawerBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  drawerBrandMark: {
    width: 31,
    height: 31,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  drawerBrandText: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "800",
  },

  drawerClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  drawerContent: {
    padding: 18,
    paddingBottom: 25,
  },

  drawerLabel: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 10,
    marginLeft: 9,
  },

  drawerItem: {
    minHeight: 47,
    borderRadius: 6,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 12,
  },

  drawerItemActive: {
    backgroundColor: "rgba(255,122,0,0.13)",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },

  drawerItemText: {
    color: "#C1CDDA",
    fontSize: 13,
    fontWeight: "600",
  },

  drawerItemTextActive: {
    color: COLORS.white,
    fontWeight: "800",
  },

  drawerFooter: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  drawerFooterText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },

  drawerVersion: {
    color: "#7E8FA3",
    fontSize: 10,
  },
});