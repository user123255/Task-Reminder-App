
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  Activity,
  fetchActivitiesForDate,
  updateActivityCompletion,
} from "@/services/activities";

const COLORS = {
  primary: "#208AEF",
  background: "#F6F8FC",
  card: "#FFFFFF",
  text: "#172033",
  muted: "#718096",
  border: "#E7ECF3",
  success: "#20A464",
  danger: "#E05252",
  warning: "#F59E0B",
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthName = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
  });

const getDayName = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
  });

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  return new Date(year, month, 1).getDay();
};

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedDateString = useMemo(
    () => formatDate(selectedDate),
    [selectedDate]
  );

  const todayString = formatDate(new Date());

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchActivitiesForDate(selectedDateString);

      setActivities(data || []);
    } catch (error) {
      console.error("Failed to load calendar activities:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDateString]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadActivities();
    } finally {
      setRefreshing(false);
    }
  };

  const changeMonth = (direction: number) => {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + direction,
          1
        )
    );
  };

  const goToToday = () => {
    const today = new Date();

    setSelectedDate(today);
    setVisibleMonth(today);
  };

  const selectDay = (day: number) => {
    const nextDate = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      day
    );

    setSelectedDate(nextDate);
  };

  const toggleActivity = async (activity: Activity) => {
    try {
      const nextCompleted = !activity.completed;

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id
            ? {
                ...item,
                completed: nextCompleted,
              }
            : item
        )
      );

      await updateActivityCompletion(activity.id, nextCompleted);
    } catch (error) {
      console.error("Failed to update activity:", error);

      await loadActivities();
    }
  };

  const openActivity = (activity: Activity) => {
    router.push(`/add-activity?edit=${activity.id}`);
  };

  const daysInMonth = getDaysInMonth(visibleMonth);
  const firstDay = getFirstDayOfMonth(visibleMonth);

  const calendarDays: Array<number | null> = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const completedCount = activities.filter(
    (activity) => activity.completed
  ).length;

  const progress =
    activities.length > 0
      ? Math.round((completedCount / activities.length) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={COLORS.text}
              />
            </Pressable>

            <View>
              <Text style={styles.title}>Calendar</Text>
              <Text style={styles.subtitle}>
                Plan and manage your activities
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.todayButton}
              onPress={goToToday}
            >
              <Ionicons
                name="today-outline"
                size={17}
                color={COLORS.primary}
              />
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>

            <Pressable
              style={styles.addButton}
              onPress={() => router.push("/add-activity")}
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              {Platform.OS === "web" && (
                <Text style={styles.addButtonText}>
                  Add task
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Calendar card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <View>
              <Text style={styles.monthTitle}>
                {getMonthName(visibleMonth)}{" "}
                {visibleMonth.getFullYear()}
              </Text>

              <Text style={styles.monthSubtitle}>
                {activities.length} activities on{" "}
                {formatDisplayDate(selectedDate)}
              </Text>
            </View>

            <View style={styles.monthActions}>
              <Pressable
                style={styles.monthButton}
                onPress={() => changeMonth(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={COLORS.text}
                />
              </Pressable>

              <Pressable
                style={styles.monthButton}
                onPress={() => changeMonth(1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.text}
                />
              </Pressable>
            </View>
          </View>

          {/* Week names */}
          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day) => (
                <View key={day} style={styles.weekCell}>
                  <Text style={styles.weekText}>{day}</Text>
                </View>
              )
            )}
          </View>

          {/* Days */}
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <View
                    key={`empty-${index}`}
                    style={styles.dayCell}
                  />
                );
              }

              const date = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                day
              );

              const dateString = formatDate(date);
              const isSelected =
                dateString === selectedDateString;
              const isToday = dateString === todayString;

              return (
                <Pressable
                  key={dateString}
                  style={styles.dayCell}
                  onPress={() => selectDay(day)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.selectedDay,
                      isToday &&
                        !isSelected &&
                        styles.todayDay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected &&
                          styles.selectedDayText,
                        isToday &&
                          !isSelected &&
                          styles.todayDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected day summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>
              {completedCount} of {activities.length} completed
            </Text>

            <Text style={styles.summarySubtitle}>
              {progress}% completion for this day
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        {/* Activities */}
        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {getDayName(selectedDate)}'s activities
              </Text>

              <Text style={styles.sectionSubtitle}>
                {formatDisplayDate(selectedDate)}
              </Text>
            </View>

            <Pressable
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              {refreshing ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color={COLORS.primary}
                />
              )}
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
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
                  size={30}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Nothing scheduled
              </Text>

              <Text style={styles.emptyText}>
                You don't have any activities scheduled for
                this day.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/add-activity")}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.emptyButtonText}>
                  Add activity
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.activityList}>
              {activities.map((activity) => (
                <Pressable
                  key={activity.id}
                  style={[
                    styles.activityCard,
                    activity.completed &&
                      styles.completedCard,
                  ]}
                  onPress={() => openActivity(activity)}
                >
                  <Pressable
                    style={[
                      styles.checkbox,
                      activity.completed &&
                        styles.checkboxCompleted,
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggleActivity(activity);
                    }}
                  >
                    {activity.completed && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>

                  <View style={styles.activityContent}>
                    <View style={styles.activityTop}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.activityTitle,
                          activity.completed &&
                            styles.completedTitle,
                        ]}
                      >
                        {activity.title}
                      </Text>

                      <View
                        style={[
                          styles.priorityBadge,
                          activity.priority === "high" &&
                            styles.highPriority,
                          activity.priority === "low" &&
                            styles.lowPriority,
                        ]}
                      >
                        <Text
                          style={styles.priorityText}
                        >
                          {activity.priority}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.activityMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color={COLORS.muted}
                        />

                        <Text style={styles.metaText}>
                          {activity.scheduled_time ||
                            "No time"}
                        </Text>
                      </View>

                      {activity.category && (
                        <View style={styles.metaItem}>
                          <Ionicons
                            name={
                              (activity.category_icon as any) ||
                              "folder-outline"
                            }
                            size={15}
                            color={
                              activity.category_color ||
                              COLORS.primary
                            }
                          />

                          <Text
                            style={styles.metaText}
                            numberOfLines={1}
                          >
                            {activity.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color="#A0A9B8"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    padding: 28,
    paddingBottom: 60,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: COLORS.muted,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  todayButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  todayButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  addButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  calendarCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  monthTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
  },

  monthSubtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
  },

  monthActions: {
    flexDirection: "row",
    gap: 8,
  },

  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  weekCell: {
    flex: 1,
    alignItems: "center",
  },

  weekText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: "14.2857%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDay: {
    backgroundColor: COLORS.primary,
  },

  todayDay: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },

  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  todayDayText: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  summaryCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  summarySubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },

  progressTrack: {
    width: 120,
    height: 7,
    borderRadius: 10,
    backgroundColor: "#E8EDF4",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },

  activitiesSection: {
    marginTop: 28,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.muted,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingBox: {
    minHeight: 220,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.muted,
  },

  emptyCard: {
    padding: 40,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptyText: {
    maxWidth: 400,
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },

  emptyButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  activityList: {
    gap: 10,
  },

  activityCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  completedCard: {
    opacity: 0.72,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#C8D0DC",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  activityContent: {
    flex: 1,
    minWidth: 0,
  },

  activityTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activityTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  completedTitle: {
    textDecorationLine: "line-through",
    color: COLORS.muted,
  },

  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#FFF4DB",
  },

  highPriority: {
    backgroundColor: "#FFE5E5",
  },

  lowPriority: {
    backgroundColor: "#EAF7F0",
  },

  priorityText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.warning,
    textTransform: "uppercase",
  },

  activityMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 7,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  metaText: {
    fontSize: 11,
    color: COLORS.muted,
  },
});