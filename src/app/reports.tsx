import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { useTaskFlowSettings } from "@/hooks/use-taskflow-settings";
import {
  Colors,
  Layout,
  Radii,
  Shadows,
} from "@/constants/theme";
import {
  Activity,
  fetchActivitiesBetweenDates,
} from "@/services/activities";

/**
 * Reports uses the same central TaskFlow design system as Library,
 * Tasks, Settings and Meetings. Keeping these aliases local makes the
 * existing report calculations easier to read without creating a second
 * colour system.
 */
const COLORS = {
  primary: Colors.primary,
  primaryDark: Colors.primaryHover,
  background: Colors.background,
  backgroundSoft: Colors.backgroundSoft,
  card: Colors.surface,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  textMuted: Colors.textMuted,
  muted: Colors.textSecondary,
  border: Colors.border,
  borderLight: Colors.borderLight,
  borderStrong: Colors.borderStrong,
  success: Colors.success,
  successLight: Colors.successLight,
  successSoft: Colors.successLight,
  warning: Colors.warning,
  warningLight: Colors.warningLight,
  warningSoft: Colors.warningLight,
  danger: Colors.danger,
  dangerSoft: Colors.dangerLight,
  dangerLight: Colors.dangerLight,
  purple: Colors.spiritual,
  purpleSoft: "#F4EEFF",
  blueSoft: Colors.infoLight,
  graySoft: Colors.surfaceMuted,
  dark: Colors.navyDeep,
};

type Period = "day" | "week" | "month" | "year";

type ExtendedActivity = Activity & {
  category_name?: string | null;
  carried_forward?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  recurrence?: string | null;
  reminder_enabled?: boolean;
  reminder_minutes?: number | null;
  description?: string | null;
};

type PeriodStats = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  carriedForward: number;
  completionRate: number;
};

type BreakdownRow = {
  key: string;
  label: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  rate: number;
};

function dateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const parts = value.split("-").map(Number);

  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date) {
  return new Date(
    date.getFullYear(),
    11,
    31,
    23,
    59,
    59,
    999,
  );
}

function getPeriodRange(period: Period, date: Date) {
  switch (period) {
    case "day":
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };

    case "week":
      return {
        start: startOfWeek(date),
        end: endOfWeek(date),
      };

    case "month":
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };

    case "year":
      return {
        start: startOfYear(date),
        end: endOfYear(date),
      };
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) {
    return "No time";
  }

  const parts = value.split(":");

  if (parts.length < 2) {
    return value;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPeriodTitle(period: Period, date: Date) {
  const range = getPeriodRange(period, date);

  switch (period) {
    case "day":
      return formatLongDate(date);

    case "week":
      return `${formatDate(range.start)} – ${formatDate(range.end)}`;

    case "month":
      return formatMonthYear(date);

    case "year":
      return String(date.getFullYear());
  }
}

function getTodayString() {
  return dateString(new Date());
}

function isToday(dateValue: string) {
  return dateValue === getTodayString();
}

function isActivityOverdue(activity: ExtendedActivity) {
  if (activity.completed) {
    return false;
  }

  const today = getTodayString();

  if (activity.scheduled_date < today) {
    return true;
  }

  if (activity.scheduled_date > today) {
    return false;
  }

  if (!activity.start_time) {
    return false;
  }

  const parts = activity.start_time.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return false;
  }

  const now = new Date();

  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  return scheduled.getTime() < now.getTime();
}

function getCarriedForward(activity: ExtendedActivity) {
  return Boolean(activity.carried_forward);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPriorityLabel(priority?: string | null) {
  const normalized = String(priority ?? "medium").toLowerCase();

  if (normalized === "high") {
    return "High";
  }

  if (normalized === "low") {
    return "Low";
  }

  return "Medium";
}

function getPriorityColor(priority?: string | null) {
  const normalized = String(priority ?? "medium").toLowerCase();

  if (normalized === "high") {
    return COLORS.danger;
  }

  if (normalized === "low") {
    return COLORS.success;
  }

  return COLORS.warning;
}

function getActivityStatus(activity: ExtendedActivity) {
  if (activity.completed) {
    return "Completed";
  }

  if (isActivityOverdue(activity)) {
    return "Overdue";
  }

  return "Pending";
}

function getStatusColor(status: string) {
  switch (status) {
    case "Completed":
      return COLORS.success;

    case "Overdue":
      return COLORS.danger;

    default:
      return COLORS.warning;
  }
}

function getCategoryName(activity: ExtendedActivity) {
  return (
    activity.category_name ||
    activity.category ||
    "Other"
  );
}

function getPeriodStats(
  activities: ExtendedActivity[],
): PeriodStats {
  const total = activities.length;

  const completed = activities.filter(
    (activity) => Boolean(activity.completed),
  ).length;

  const pending = activities.filter(
    (activity) =>
      !activity.completed &&
      !isActivityOverdue(activity),
  ).length;

  const overdue = activities.filter(
    (activity) => isActivityOverdue(activity),
  ).length;

  const highPriority = activities.filter(
    (activity) =>
      String(activity.priority ?? "medium").toLowerCase() ===
      "high",
  ).length;

  const mediumPriority = activities.filter(
    (activity) =>
      String(activity.priority ?? "medium").toLowerCase() ===
      "medium",
  ).length;

  const lowPriority = activities.filter(
    (activity) =>
      String(activity.priority ?? "medium").toLowerCase() ===
      "low",
  ).length;

  const carriedForward = activities.filter(
    (activity) => getCarriedForward(activity),
  ).length;

  const completionRate =
    total > 0
      ? Math.round((completed / total) * 100)
      : 0;

  return {
    total,
    completed,
    pending,
    overdue,
    highPriority,
    mediumPriority,
    lowPriority,
    carriedForward,
    completionRate,
  };
}

function getBreakdownRows(
  period: Period,
  range: { start: Date; end: Date },
  activities: ExtendedActivity[],
): BreakdownRow[] {
  const rows: BreakdownRow[] = [];

  if (period === "day") {
    const key = dateString(range.start);

    const dayActivities = activities.filter(
      (activity) => activity.scheduled_date === key,
    );

    const stats = getPeriodStats(dayActivities);

    rows.push({
      key,
      label: formatLongDate(range.start),
      total: stats.total,
      completed: stats.completed,
      pending: stats.pending,
      overdue: stats.overdue,
      rate: stats.completionRate,
    });

    return rows;
  }

  if (period === "year") {
    for (let month = 0; month < 12; month += 1) {
      const monthStart = new Date(
        range.start.getFullYear(),
        month,
        1,
      );

      const key = `${monthStart.getFullYear()}-${String(
        month + 1,
      ).padStart(2, "0")}`;

      const monthActivities = activities.filter((activity) =>
        activity.scheduled_date.startsWith(key),
      );

      const stats = getPeriodStats(monthActivities);

      rows.push({
        key,
        label: formatMonthYear(monthStart),
        total: stats.total,
        completed: stats.completed,
        pending: stats.pending,
        overdue: stats.overdue,
        rate: stats.completionRate,
      });
    }

    return rows;
  }

  let cursor = new Date(range.start);

  while (cursor <= range.end) {
    const key = dateString(cursor);

    const dayActivities = activities.filter(
      (activity) => activity.scheduled_date === key,
    );

    const stats = getPeriodStats(dayActivities);

    rows.push({
      key,
      label: cursor.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      total: stats.total,
      completed: stats.completed,
      pending: stats.pending,
      overdue: stats.overdue,
      rate: stats.completionRate,
    });

    cursor = addDays(cursor, 1);
  }

  return rows;
}

function getAreaStats(activities: ExtendedActivity[]) {
  const map = new Map<
    string,
    {
      name: string;
      total: number;
      completed: number;
      pending: number;
      overdue: number;
      rate: number;
    }
  >();

  activities.forEach((activity) => {
    const name = getCategoryName(activity);

    const existing = map.get(name) || {
      name,
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      rate: 0,
    };

    existing.total += 1;

    if (activity.completed) {
      existing.completed += 1;
    } else if (isActivityOverdue(activity)) {
      existing.overdue += 1;
    } else {
      existing.pending += 1;
    }

    existing.rate =
      existing.total > 0
        ? Math.round(
            (existing.completed / existing.total) * 100,
          )
        : 0;

    map.set(name, existing);
  });

  return Array.from(map.values()).sort(
    (a, b) => b.total - a.total,
  );
}

function getDailyOrMonthlyLabel(
  period: Period,
  row: BreakdownRow,
) {
  if (period === "year") {
    return row.label;
  }

  return row.label;
}

function Stat({
  icon,
  label,
  value,
  color,
  softColor,
  compactMode = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
  softColor: string;
  compactMode?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        compactMode && styles.statCardCompact,
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: softColor },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={color}
        />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActivityRow({
  activity,
  compactMode = false,
}: {
  activity: ExtendedActivity;
  compactMode?: boolean;
}) {
  const status = getActivityStatus(activity);
  const statusColor = getStatusColor(status);
  const priorityColor = getPriorityColor(activity.priority);

  return (
    <View
      style={[
        styles.activityRow,
        compactMode && styles.activityRowCompact,
      ]}
    >
      <View
        style={[
          styles.activityStatusDot,
          {
            backgroundColor: statusColor,
          },
        ]}
      />

      <View style={styles.activityMain}>
        <Text
          style={styles.activityTitle}
          numberOfLines={2}
        >
          {activity.title}
        </Text>

        <View style={styles.activityMetaRow}>
          <Text style={styles.activityMeta}>
            {formatTime(activity.start_time)}
          </Text>

          <View style={styles.metaDot} />

          <Text style={styles.activityMeta}>
            {getCategoryName(activity)}
          </Text>

          {activity.scheduled_date &&
          !isToday(activity.scheduled_date) ? (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.activityMeta}>
                {formatDate(
                  parseDate(activity.scheduled_date),
                )}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.activityRight}>
        <View
          style={[
            styles.priorityBadge,
            {
              backgroundColor: `${priorityColor}14`,
            },
          ]}
        >
          <Text
            style={[
              styles.priorityBadgeText,
              {
                color: priorityColor,
              },
            ]}
          >
            {getPriorityLabel(activity.priority)}
          </Text>
        </View>

        <Text
          style={[
            styles.statusText,
            {
              color: statusColor,
            },
          ]}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  title,
  description,
  icon = "document-text-outline",
}: {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={28}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>
        {description}
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { session } = useAuth();
  const { settings } = useTaskFlowSettings();
  const { width } = useWindowDimensions();

  const isMobile = width < Layout.mobileBreakpoint;
  const compactMode = settings.compactMode;

  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [activities, setActivities] = useState<
    ExtendedActivity[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodRange = useMemo(
    () => getPeriodRange(period, selectedDate),
    [period, selectedDate],
  );

  const loadReport = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      if (!session?.user) {
        setActivities([]);
        setError("Your session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const result = await fetchActivitiesBetweenDates(
          dateString(periodRange.start),
          dateString(periodRange.end),
        );

        setActivities(
          (result || []) as ExtendedActivity[],
        );
      } catch (err) {
        console.error("Failed to load report:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load report data.",
        );

        setActivities([]);
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [periodRange, session?.user?.id],
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const stats = useMemo(
    () => getPeriodStats(activities),
    [activities],
  );

  const breakdownRows = useMemo(
    () =>
      getBreakdownRows(
        period,
        periodRange,
        activities,
      ),
    [period, periodRange, activities],
  );

  const areaStats = useMemo(
    () => getAreaStats(activities),
    [activities],
  );

  const priorityData = useMemo(
    () => [
      {
        label: "High priority",
        value: stats.highPriority,
        color: COLORS.danger,
      },
      {
        label: "Medium priority",
        value: stats.mediumPriority,
        color: COLORS.warning,
      },
      {
        label: "Low priority",
        value: stats.lowPriority,
        color: COLORS.success,
      },
    ],
    [stats],
  );

  const topCategory = useMemo(() => {
    if (!areaStats.length) {
      return null;
    }

    return areaStats[0];
  }, [areaStats]);

  const activeBreakdownDays = useMemo(
    () => breakdownRows.filter((row) => row.total > 0),
    [breakdownRows],
  );

  const smartSummary = useMemo(() => {
    if (stats.total === 0) {
      return `There is no activity data for this ${period}. Once you add activities, TaskFlow will automatically build your productivity summary here.`;
    }

    if (stats.completionRate >= 80) {
      return `You completed ${stats.completed} of ${stats.total} activities during this ${period}. Your completion rate is ${stats.completionRate}%, with ${stats.overdue} overdue ${stats.overdue === 1 ? "activity" : "activities"}.`;
    }

    if (stats.completionRate >= 50) {
      return `You completed ${stats.completed} of ${stats.total} activities during this ${period}. There is still room to improve your ${period} completion rate, especially by addressing ${stats.overdue} overdue ${stats.overdue === 1 ? "activity" : "activities"}.`;
    }

    return `You completed ${stats.completed} of ${stats.total} activities during this ${period}. Your report shows ${stats.pending} pending and ${stats.overdue} overdue ${stats.overdue === 1 ? "activity" : "activities"} that may need attention.`;
  }, [stats, period]);

  const insights = useMemo(() => {
    const result: string[] = [];

    if (stats.total === 0) {
      result.push(
        "Add activities to start building your productivity history.",
      );
      return result;
    }

    if (stats.completionRate >= 80) {
      result.push(
        `Strong consistency: ${stats.completionRate}% of activities were completed.`,
      );
    } else if (stats.completionRate >= 50) {
      result.push(
        `You completed more than half of your planned activities at ${stats.completionRate}%.`,
      );
    } else {
      result.push(
        `Only ${stats.completionRate}% of planned activities were completed in this period.`,
      );
    }

    if (stats.overdue > 0) {
      result.push(
        `${stats.overdue} ${stats.overdue === 1 ? "activity is" : "activities are"} overdue and may need to be rescheduled.`,
      );
    }

    if (stats.carriedForward > 0) {
      result.push(
        `${stats.carriedForward} ${stats.carriedForward === 1 ? "activity was" : "activities were"} carried forward from an earlier date.`,
      );
    }

    if (topCategory) {
      result.push(
        `${topCategory.name} is your most active life area with ${topCategory.total} ${topCategory.total === 1 ? "activity" : "activities"}.`,
      );
    }

    if (stats.highPriority > 0) {
      result.push(
        `${stats.highPriority} high-priority ${stats.highPriority === 1 ? "activity requires" : "activities require"} attention in this report.`,
      );
    }

    return result;
  }, [stats, topCategory]);

  const movePeriod = useCallback(
    (direction: number) => {
      setSelectedDate((current) => {
        if (period === "day") {
          return addDays(current, direction);
        }

        if (period === "week") {
          return addDays(current, direction * 7);
        }

        if (period === "month") {
          return new Date(
            current.getFullYear(),
            current.getMonth() + direction,
            1,
          );
        }

        return new Date(
          current.getFullYear() + direction,
          current.getMonth(),
          1,
        );
      });
    },
    [period],
  );

  const goToCurrentPeriod = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadReport(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadReport]);

  const generatePdfHtml = useCallback(() => {
    const periodName =
      period === "day"
        ? "Daily"
        : period === "week"
          ? "Weekly"
          : period === "month"
            ? "Monthly"
            : "Yearly";

    const generatedAt = new Date();

    const activityRows = [...activities]
      .sort((a, b) => {
        const dateCompare =
          a.scheduled_date.localeCompare(
            b.scheduled_date,
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return String(a.start_time ?? "").localeCompare(
          String(b.start_time ?? ""),
        );
      })
      .map((activity) => {
        const status = getActivityStatus(activity);
        const priority = getPriorityLabel(
          activity.priority,
        );

        return `
          <tr>
            <td>
              <strong>${escapeHtml(activity.title)}</strong>
              ${
                activity.description
                  ? `<div class="small">${escapeHtml(activity.description)}</div>`
                  : ""
              }
            </td>
            <td>${escapeHtml(
              formatDate(
                parseDate(activity.scheduled_date),
              ),
            )}</td>
            <td>${escapeHtml(
              formatTime(activity.start_time),
            )}</td>
            <td>${escapeHtml(
              getCategoryName(activity),
            )}</td>
            <td>
              <span class="priority priority-${priority.toLowerCase()}">
                ${escapeHtml(priority)}
              </span>
            </td>
            <td>
              <span class="status status-${status.toLowerCase()}">
                ${escapeHtml(status)}
              </span>
            </td>
            <td>
              ${
                activity.reminder_enabled
                  ? `${escapeHtml(
                      String(
                        activity.reminder_minutes ??
                          0,
                      ),
                    )} min`
                  : "Off"
              }
            </td>
            <td>
              ${
                getCarriedForward(activity)
                  ? "Yes"
                  : "No"
              }
            </td>
          </tr>
        `;
      })
      .join("");

    const breakdownRowsHtml = breakdownRows
      .filter(
        (row) =>
          period === "year" || row.total > 0,
      )
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(
              getDailyOrMonthlyLabel(period, row),
            )}</td>
            <td>${row.total}</td>
            <td>${row.completed}</td>
            <td>${row.pending}</td>
            <td>${row.overdue}</td>
            <td>${row.rate}%</td>
          </tr>
        `,
      )
      .join("");

    const areaRowsHtml = areaStats
      .map(
        (area) => `
          <tr>
            <td>${escapeHtml(area.name)}</td>
            <td>${area.total}</td>
            <td>${area.completed}</td>
            <td>${area.pending}</td>
            <td>${area.overdue}</td>
            <td>${area.rate}%</td>
          </tr>
        `,
      )
      .join("");

    const priorityRowsHtml = priorityData
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.label)}</td>
            <td>${item.value}</td>
            <td>${
              stats.total > 0
                ? Math.round(
                    (item.value / stats.total) *
                      100,
                  )
                : 0
            }%</td>
          </tr>
        `,
      )
      .join("");

    const insightHtml = insights
      .map(
        (item) =>
          `<li>${escapeHtml(item)}</li>`,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(
            periodName,
          )} Productivity Report</title>

          <style>
            @page {
              size: A4;
              margin: 16mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: ${COLORS.text};
              background: #ffffff;
              margin: 0;
              font-size: 10px;
              line-height: 1.45;
            }

            h1, h2, h3, p {
              margin-top: 0;
            }

            .header {
              border-bottom: 3px solid ${COLORS.primary};
              padding-bottom: 16px;
              margin-bottom: 22px;
            }

            .brand {
              font-size: 24px;
              font-weight: 800;
              color: ${COLORS.primary};
              margin-bottom: 4px;
            }

            .report-title {
              font-size: 20px;
              font-weight: 800;
              color: ${COLORS.text};
              margin-bottom: 5px;
            }

            .period {
              color: ${COLORS.muted};
              font-size: 11px;
            }

            .generated {
              color: ${COLORS.textMuted};
              font-size: 9px;
              margin-top: 5px;
            }

            .hero {
              background: ${COLORS.blueSoft};
              border-radius: 12px;
              padding: 18px;
              margin-bottom: 16px;
              border: 1px solid ${Colors.infoLight};
            }

            .hero-label {
              color: ${COLORS.textSecondary};
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 700;
            }

            .hero-value {
              color: ${COLORS.primary};
              font-size: 36px;
              font-weight: 800;
              margin: 4px 0;
            }

            .hero-text {
              color: ${COLORS.textSecondary};
              font-size: 10px;
            }

            .grid {
              display: table;
              width: 100%;
              table-layout: fixed;
              border-spacing: 7px;
              margin: -7px;
              margin-bottom: 16px;
            }

            .card {
              display: table-cell;
              vertical-align: top;
              background: #ffffff;
              border: 1px solid ${COLORS.border};
              border-radius: 10px;
              padding: 12px;
            }

            .card-label {
              color: ${COLORS.muted};
              font-size: 9px;
              margin-bottom: 3px;
            }

            .card-value {
              color: ${COLORS.text};
              font-size: 20px;
              font-weight: 800;
            }

            .section {
              margin-top: 24px;
              page-break-inside: avoid;
            }

            .section-title {
              font-size: 14px;
              font-weight: 800;
              margin-bottom: 5px;
              color: ${COLORS.text};
            }

            .section-subtitle {
              color: ${COLORS.muted};
              font-size: 9px;
              margin-bottom: 10px;
            }

            .summary {
              background: ${COLORS.backgroundSoft};
              border-left: 4px solid ${COLORS.primary};
              padding: 12px;
              border-radius: 7px;
              color: ${COLORS.textSecondary};
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 9px;
            }

            th {
              background: ${COLORS.graySoft};
              color: ${COLORS.textSecondary};
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: .4px;
              padding: 7px 6px;
              text-align: left;
              border-bottom: 1px solid ${COLORS.border};
            }

            td {
              padding: 7px 6px;
              border-bottom: 1px solid ${COLORS.borderLight};
              vertical-align: top;
              color: ${COLORS.text};
            }

            tr {
              page-break-inside: avoid;
            }

            thead {
              display: table-header-group;
            }

            .small {
              color: ${COLORS.textMuted};
              font-size: 8px;
              margin-top: 2px;
            }

            .status,
            .priority {
              display: inline-block;
              border-radius: 20px;
              padding: 3px 7px;
              font-size: 8px;
              font-weight: 700;
            }

            .status-completed {
              background: ${COLORS.successLight};
              color: ${COLORS.success};
            }

            .status-overdue {
              background: ${COLORS.dangerLight};
              color: ${COLORS.danger};
            }

            .status-pending {
              background: ${COLORS.warningLight};
              color: ${COLORS.warning};
            }

            .priority-high {
              background: ${COLORS.dangerLight};
              color: ${COLORS.danger};
            }

            .priority-medium {
              background: ${COLORS.warningLight};
              color: ${COLORS.warning};
            }

            .priority-low {
              background: ${COLORS.successLight};
              color: ${COLORS.success};
            }

            .insights {
              padding-left: 18px;
              margin: 0;
            }

            .insights li {
              margin-bottom: 7px;
              color: ${COLORS.textSecondary};
            }

            .footer {
              margin-top: 30px;
              padding-top: 12px;
              border-top: 1px solid ${COLORS.border};
              color: ${COLORS.textMuted};
              font-size: 8px;
              text-align: center;
            }

            .empty {
              padding: 18px;
              border: 1px dashed ${COLORS.borderStrong};
              border-radius: 8px;
              color: ${COLORS.muted};
              text-align: center;
            }

            .avoid-break {
              page-break-inside: avoid;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="brand">TaskFlow</div>
            <div class="report-title">
              ${escapeHtml(periodName)} Productivity Report
            </div>
            <div class="period">
              ${escapeHtml(
                formatPeriodTitle(
                  period,
                  selectedDate,
                ),
              )}
            </div>
            <div class="generated">
              Generated ${escapeHtml(
                generatedAt.toLocaleString(),
              )}
            </div>
          </div>

          <div class="hero">
            <div class="hero-label">
              Completion rate
            </div>

            <div class="hero-value">
              ${stats.completionRate}%
            </div>

            <div class="hero-text">
              ${stats.completed} completed out of
              ${stats.total} planned activities.
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-label">Completed</div>
              <div class="card-value">
                ${stats.completed}
              </div>
            </div>

            <div class="card">
              <div class="card-label">Pending</div>
              <div class="card-value">
                ${stats.pending}
              </div>
            </div>

            <div class="card">
              <div class="card-label">Overdue</div>
              <div class="card-value">
                ${stats.overdue}
              </div>
            </div>

            <div class="card">
              <div class="card-label">High Priority</div>
              <div class="card-value">
                ${stats.highPriority}
              </div>
            </div>
          </div>

          <div class="section avoid-break">
            <div class="section-title">
              Smart Summary
            </div>

            <div class="summary">
              ${escapeHtml(smartSummary)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              ${
                period === "year"
                  ? "Monthly Breakdown"
                  : "Period Breakdown"
              }
            </div>

            <div class="section-subtitle">
              ${
                period === "year"
                  ? "A month-by-month overview of activity and completion."
                  : "A detailed breakdown of activity across the selected period."
              }
            </div>

            ${
              breakdownRows.length
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Total</th>
                        <th>Completed</th>
                        <th>Pending</th>
                        <th>Overdue</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${breakdownRowsHtml}
                    </tbody>
                  </table>
                `
                : `<div class="empty">No report data available.</div>`
            }
          </div>

          <div class="section">
            <div class="section-title">
              Life Areas
            </div>

            <div class="section-subtitle">
              Activity distribution and completion by life area.
            </div>

            ${
              areaStats.length
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Life Area</th>
                        <th>Total</th>
                        <th>Completed</th>
                        <th>Pending</th>
                        <th>Overdue</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${areaRowsHtml}
                    </tbody>
                  </table>
                `
                : `<div class="empty">No life-area data available.</div>`
            }
          </div>

          <div class="section">
            <div class="section-title">
              Priority Breakdown
            </div>

            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Activities</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                ${priorityRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">
              Productivity Insights
            </div>

            ${
              insights.length
                ? `
                  <ul class="insights">
                    ${insightHtml}
                  </ul>
                `
                : `<div class="empty">No insights available.</div>`
            }
          </div>

          <div class="section">
            <div class="section-title">
              Detailed Activities
            </div>

            <div class="section-subtitle">
              Every activity included in this report.
            </div>

            ${
              activities.length
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Life Area</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Reminder</th>
                        <th>Moved</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${activityRows}
                    </tbody>
                  </table>
                `
                : `<div class="empty">No activities recorded for this period.</div>`
            }
          </div>

          <div class="section">
            <div class="section-title">
              Report Details
            </div>

            <table>
              <tbody>
                <tr>
                  <td><strong>Report type</strong></td>
                  <td>${escapeHtml(
                    periodName,
                  )}</td>
                </tr>
                <tr>
                  <td><strong>Period</strong></td>
                  <td>${escapeHtml(
                    formatPeriodTitle(
                      period,
                      selectedDate,
                    ),
                  )}</td>
                </tr>
                <tr>
                  <td><strong>Total activities</strong></td>
                  <td>${stats.total}</td>
                </tr>
                <tr>
                  <td><strong>Completed</strong></td>
                  <td>${stats.completed}</td>
                </tr>
                <tr>
                  <td><strong>Pending</strong></td>
                  <td>${stats.pending}</td>
                </tr>
                <tr>
                  <td><strong>Overdue</strong></td>
                  <td>${stats.overdue}</td>
                </tr>
                <tr>
                  <td><strong>Carried forward</strong></td>
                  <td>${stats.carriedForward}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            TaskFlow productivity report • Generated automatically from your recorded activities.
          </div>
        </body>
      </html>
    `;
  }, [
    period,
    selectedDate,
    activities,
    stats,
    breakdownRows,
    areaStats,
    priorityData,
    insights,
    smartSummary,
  ]);

  const exportPdf = useCallback(async () => {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      const html = generatePdfHtml();

      /*
       * On web, Expo Print opens the browser's print dialog.
       * The user can select "Save to PDF" from that dialog.
       */
      if (Platform.OS === "web") {
        await Print.printAsync({
          html,
        });

        return;
      }

      const result =
        await Print.printToFileAsync({
          html,
        });

      if (!result?.uri) {
        throw new Error(
          "The PDF file could not be created.",
        );
      }

      const canShare =
        await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save TaskFlow Report",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert(
          "PDF created",
          "The report PDF was created successfully.",
        );
      }
    } catch (err) {
      console.error(
        "Failed to generate PDF:",
        err,
      );

      Alert.alert(
        "PDF download failed",
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the PDF.",
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, generatePdfHtml]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.loadingTitle}>
          Building your report
        </Text>

        <Text style={styles.loadingText}>
          TaskFlow is analysing your activities...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          isMobile && styles.containerMobile,
          compactMode && styles.containerCompact,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.header,
          isMobile && styles.headerMobile,
        ]}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.replace("/")}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={COLORS.text}
              />
            </Pressable>

            <View>
              <Text style={styles.eyebrow}>
                PRODUCTIVITY
              </Text>

              <Text style={styles.title}>
                Reports
              </Text>

              <Text style={styles.subtitle}>
                Understand your progress and productivity.
              </Text>
            </View>
          </View>

          <View style={[
            styles.headerActions,
            isMobile && styles.headerActionsMobile,
          ]}>
            <Pressable
              style={styles.iconButton}
              onPress={handleRefresh}
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color={COLORS.text}
              />
            </Pressable>

            <Pressable
              style={[
                styles.pdfButton,
                exporting && styles.pdfButtonDisabled,
              ]}
              onPress={exportPdf}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={18}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.pdfButtonText}>
                {exporting
                  ? "Preparing..."
                  : "Download PDF"}
              </Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Could not load report
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>

            <Pressable
              onPress={() => loadReport()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[
          styles.periodSelector,
          isMobile && styles.periodSelectorMobile,
        ]}>
          {(
            [
              ["day", "Daily", "today-outline"],
              ["week", "Weekly", "calendar-outline"],
              ["month", "Monthly", "stats-chart-outline"],
              ["year", "Yearly", "analytics-outline"],
            ] as const
          ).map(([value, label, icon]) => {
            const active = period === value;

            return (
              <Pressable
                key={value}
                style={[
                  styles.periodButton,
                  isMobile && styles.periodButtonMobile,
                  compactMode && styles.periodButtonCompact,
                  active &&
                    styles.periodButtonActive,
                ]}
                onPress={() =>
                  setPeriod(value as Period)
                }
              >
                <Ionicons
                  name={icon}
                  size={17}
                  color={
                    active
                      ? "#FFFFFF"
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.periodButtonText,
                    active &&
                      styles.periodButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[
          styles.periodNavigation,
          isMobile && styles.periodNavigationMobile,
        ]}>
          <Pressable
            style={styles.periodArrow}
            onPress={() => movePeriod(-1)}
          >
            <Ionicons
              name="chevron-back"
              size={19}
              color={COLORS.text}
            />
          </Pressable>

          <View style={styles.periodCenter}>
            <Text style={styles.periodLabel}>
              {period === "day"
                ? "DAILY REPORT"
                : period === "week"
                  ? "WEEKLY REPORT"
                  : period === "month"
                    ? "MONTHLY REPORT"
                    : "YEARLY REPORT"}
            </Text>

            <Text style={styles.periodTitle}>
              {formatPeriodTitle(
                period,
                selectedDate,
              )}
            </Text>

            <Text style={styles.periodRangeText}>
              {formatDate(periodRange.start)}
              {"  "}—{"  "}
              {formatDate(periodRange.end)}
            </Text>
          </View>

          <Pressable
            style={styles.periodArrow}
            onPress={() => movePeriod(1)}
          >
            <Ionicons
              name="chevron-forward"
              size={19}
              color={COLORS.text}
            />
          </Pressable>
        </View>

        <Pressable
          style={styles.currentPeriodButton}
          onPress={goToCurrentPeriod}
        >
          <Ionicons
            name="locate-outline"
            size={16}
            color={COLORS.primary}
          />

          <Text style={styles.currentPeriodText}>
            Go to current {period}
          </Text>
        </Pressable>

        <View style={[
          styles.heroCard,
          isMobile && styles.heroCardMobile,
          compactMode && styles.heroCardCompact,
        ]}>
          <View style={[
            styles.heroContent,
            isMobile && styles.heroContentMobile,
          ]}>
            <View>
              <Text style={styles.heroEyebrow}>
                {period.toUpperCase()} PRODUCTIVITY
              </Text>

              <Text style={[
                styles.heroTitle,
                isMobile && styles.heroTitleMobile,
              ]}>
                {stats.completionRate}%
              </Text>

              <Text style={styles.heroDescription}>
                {stats.completed} of {stats.total}{" "}
                activities completed
              </Text>
            </View>

            <View style={styles.progressCircle}>
              <Text style={styles.progressCircleText}>
                {stats.completionRate}
              </Text>

              <Text
                style={styles.progressCircleLabel}
              >
                %
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    stats.completionRate,
                    100,
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={[
          styles.statsGrid,
          isMobile && styles.statsGridMobile,
        ]}>
          <Stat
            compactMode={compactMode}
            icon="checkmark-circle-outline"
            label="Completed"
            value={stats.completed}
            color={COLORS.success}
            softColor={COLORS.successSoft}
          />

          <Stat
            compactMode={compactMode}
            icon="time-outline"
            label="Pending"
            value={stats.pending}
            color={COLORS.warning}
            softColor={COLORS.warningSoft}
          />

          <Stat
            compactMode={compactMode}
            icon="alert-circle-outline"
            label="Overdue"
            value={stats.overdue}
            color={COLORS.danger}
            softColor={COLORS.dangerSoft}
          />

          <Stat
            compactMode={compactMode}
            icon="flag-outline"
            label="High priority"
            value={stats.highPriority}
            color={COLORS.purple}
            softColor={COLORS.purpleSoft}
          />
        </View>

        <View style={[
          styles.sectionCard,
          compactMode && styles.sectionCardCompact,
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Smart Summary
              </Text>

              <Text style={styles.sectionSubtitle}>
                Automatically generated from your real activity data.
              </Text>
            </View>

            <View style={styles.sectionIcon}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              {smartSummary}
            </Text>
          </View>
        </View>

        <View style={[
          styles.sectionCard,
          compactMode && styles.sectionCardCompact,
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Detailed Report
              </Text>

              <Text style={styles.sectionSubtitle}>
                {period === "day"
                  ? "Everything recorded for this day."
                  : period === "year"
                    ? "A month-by-month overview plus every activity recorded during the year."
                    : "A day-by-day breakdown plus every activity recorded during the period."}
              </Text>
            </View>

            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    COLORS.successSoft,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={COLORS.success}
              />
            </View>
          </View>

          {period === "day" ? (
            <>
              <View style={styles.detailSummary}>
                <Detail
                  label="Date"
                  value={formatLongDate(
                    selectedDate,
                  )}
                />

                <Detail
                  label="Activities"
                  value={String(stats.total)}
                />

                <Detail
                  label="Completed"
                  value={String(
                    stats.completed,
                  )}
                />

                <Detail
                  label="Overdue"
                  value={String(
                    stats.overdue,
                  )}
                />
              </View>

              {activities.length ? (
                <View style={styles.activityList}>
                  {activities.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      compactMode={compactMode}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="No activities for this day"
                  description="There are no recorded activities for the selected day."
                  icon="sunny-outline"
                />
              )}
            </>
          ) : (
            <>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownTitle}>
                  {period === "year"
                    ? "Monthly overview"
                    : "Daily overview"}
                </Text>

                <Text style={styles.breakdownCount}>
                  {activeBreakdownDays.length}{" "}
                  active{" "}
                  {period === "year"
                    ? "months"
                    : "days"}
                </Text>
              </View>

              {breakdownRows.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  style={styles.breakdownScroll}
                >
                  <View
                    style={
                      styles.breakdownTable
                    }
                  >
                    <View
                      style={[
                        styles.breakdownRow,
                        styles.breakdownHeaderRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.breakdownCell,
                          styles.breakdownHeaderText,
                          styles.periodCell,
                        ]}
                      >
                        {period === "year"
                          ? "Month"
                          : "Day"}
                      </Text>

                      <Text
                        style={[
                          styles.breakdownCell,
                          styles.breakdownHeaderText,
                        ]}
                      >
                        Total
                      </Text>

                      <Text
                        style={[
                          styles.breakdownCell,
                          styles.breakdownHeaderText,
                        ]}
                      >
                        Done
                      </Text>

                      <Text
                        style={[
                          styles.breakdownCell,
                          styles.breakdownHeaderText,
                        ]}
                      >
                        Pending
                      </Text>

                      <Text
                        style={[
                          styles.breakdownCell,
                          styles.breakdownHeaderText,
                        ]}
                      >
                        Overdue
                      </Text>

                      <Text
                        style={[
                          styles.breakdownCell,
                          styles.breakdownHeaderText,
                        ]}
                      >
                        Rate
                      </Text>
                    </View>

                    {breakdownRows
                      .filter(
                        (row) =>
                          period ===
                            "year" ||
                          row.total > 0,
                      )
                      .map((row) => (
                        <View
                          key={row.key}
                          style={
                            styles.breakdownRow
                          }
                        >
                          <Text
                            style={[
                              styles.breakdownCell,
                              styles.periodCell,
                            ]}
                          >
                            {row.label}
                          </Text>

                          <Text
                            style={
                              styles.breakdownCell
                            }
                          >
                            {row.total}
                          </Text>

                          <Text
                            style={[
                              styles.breakdownCell,
                              {
                                color:
                                  COLORS.success,
                              },
                            ]}
                          >
                            {row.completed}
                          </Text>

                          <Text
                            style={[
                              styles.breakdownCell,
                              {
                                color:
                                  COLORS.warning,
                              },
                            ]}
                          >
                            {row.pending}
                          </Text>

                          <Text
                            style={[
                              styles.breakdownCell,
                              {
                                color:
                                  COLORS.danger,
                              },
                            ]}
                          >
                            {row.overdue}
                          </Text>

                          <Text
                            style={[
                              styles.breakdownCell,
                              {
                                color:
                                  COLORS.primary,
                                fontWeight:
                                  "800",
                              },
                            ]}
                          >
                            {row.rate}%
                          </Text>
                        </View>
                      ))}
                  </View>
                </ScrollView>
              ) : (
                <EmptyState
                  title="No breakdown data"
                  description="There is no activity data for this period yet."
                />
              )}

              <View style={styles.activitiesHeading}>
                <View>
                  <Text style={styles.breakdownTitle}>
                    All activities
                  </Text>

                  <Text
                    style={
                      styles.activitiesHeadingSubtitle
                    }
                  >
                    Every activity recorded in this report.
                  </Text>
                </View>

                <View style={styles.activityCountBadge}>
                  <Text
                    style={
                      styles.activityCountText
                    }
                  >
                    {activities.length}
                  </Text>
                </View>
              </View>

              {activities.length ? (
                <View style={styles.activityList}>
                  {activities.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      compactMode={compactMode}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="No activities in this period"
                  description="Once you record activities, the complete details will appear here."
                />
              )}
            </>
          )}
        </View>

        <View style={[
          styles.sectionCard,
          compactMode && styles.sectionCardCompact,
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Life Areas
              </Text>

              <Text style={styles.sectionSubtitle}>
                See where your time and attention are going.
              </Text>
            </View>

            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    COLORS.purpleSoft,
                },
              ]}
            >
              <Ionicons
                name="pie-chart-outline"
                size={20}
                color={COLORS.purple}
              />
            </View>
          </View>

          {areaStats.length ? (
            <View style={styles.areaList}>
              {areaStats.map((area) => (
                <View
                  key={area.name}
                  style={styles.areaRow}
                >
                  <View style={styles.areaLeft}>
                    <View style={styles.areaIcon}>
                      <Ionicons
                        name="layers-outline"
                        size={17}
                        color={COLORS.primary}
                      />
                    </View>

                    <View>
                      <Text
                        style={styles.areaName}
                      >
                        {area.name}
                      </Text>

                      <Text
                        style={
                          styles.areaMeta
                        }
                      >
                        {area.total}{" "}
                        {area.total === 1
                          ? "activity"
                          : "activities"}{" "}
                        • {area.completed}{" "}
                        completed
                      </Text>
                    </View>
                  </View>

                  <View style={styles.areaRight}>
                    <Text
                      style={
                        styles.areaPercentage
                      }
                    >
                      {area.rate}%
                    </Text>

                    <View
                      style={
                        styles.areaTrack
                      }
                    >
                      <View
                        style={[
                          styles.areaFill,
                          {
                            width: `${Math.min(
                              area.rate,
                              100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No life-area data"
              description="Your life-area breakdown will appear after you add activities."
            />
          )}
        </View>

        <View style={[
          styles.sectionCard,
          compactMode && styles.sectionCardCompact,
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Priority Breakdown
              </Text>

              <Text style={styles.sectionSubtitle}>
                Understand how your priorities were distributed.
              </Text>
            </View>

            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    COLORS.warningSoft,
                },
              ]}
            >
              <Ionicons
                name="flag-outline"
                size={20}
                color={COLORS.warning}
              />
            </View>
          </View>

          <View style={styles.priorityList}>
            {priorityData.map((item) => {
              const percentage =
                stats.total > 0
                  ? Math.round(
                      (item.value /
                        stats.total) *
                        100,
                    )
                  : 0;

              return (
                <View
                  key={item.label}
                  style={styles.priorityRow}
                >
                  <View
                    style={
                      styles.priorityTopRow
                    }
                  >
                    <View
                      style={
                        styles.priorityLabelWrap
                      }
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          {
                            backgroundColor:
                              item.color,
                          },
                        ]}
                      />

                      <Text
                        style={
                          styles.priorityLabel
                        }
                      >
                        {item.label}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.priorityValue
                      }
                    >
                      {item.value}{" "}
                      <Text
                        style={
                          styles.priorityPercent
                        }
                      >
                        ({percentage}%)
                      </Text>
                    </Text>
                  </View>

                  <View
                    style={
                      styles.priorityTrack
                    }
                  >
                    <View
                      style={[
                        styles.priorityFill,
                        {
                          width: `${Math.min(
                            percentage,
                            100,
                          )}%`,
                          backgroundColor:
                            item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[
          styles.sectionCard,
          compactMode && styles.sectionCardCompact,
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Productivity Insights
              </Text>

              <Text style={styles.sectionSubtitle}>
                Useful observations from this report.
              </Text>
            </View>

            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    COLORS.blueSoft,
                },
              ]}
            >
              <Ionicons
                name="bulb-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
          </View>

          {insights.length ? (
            <View style={styles.insightList}>
              {insights.map((insight, index) => (
                <View
                  key={`${insight}-${index}`}
                  style={styles.insightRow}
                >
                  <View
                    style={
                      styles.insightNumber
                    }
                  >
                    <Text
                      style={
                        styles.insightNumberText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <Text
                    style={styles.insightText}
                  >
                    {insight}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No insights yet"
              description="More insights will appear once TaskFlow has activity data to analyse."
              icon="bulb-outline"
            />
          )}
        </View>

        <View style={[
          styles.sectionCard,
          compactMode && styles.sectionCardCompact,
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Report Details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Summary of the selected report.
              </Text>
            </View>

            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    COLORS.graySoft,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.muted}
              />
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <Detail
              label="Report type"
              value={
                period === "day"
                  ? "Daily"
                  : period === "week"
                    ? "Weekly"
                    : period === "month"
                      ? "Monthly"
                      : "Yearly"
              }
            />

            <Detail
              label="Period"
              value={formatPeriodTitle(
                period,
                selectedDate,
              )}
            />

            <Detail
              label="Total activities"
              value={String(stats.total)}
            />

            <Detail
              label="Completed"
              value={String(
                stats.completed,
              )}
            />

            <Detail
              label="Pending"
              value={String(stats.pending)}
            />

            <Detail
              label="Overdue"
              value={String(stats.overdue)}
            />

            <Detail
              label="Carried forward"
              value={String(
                stats.carriedForward,
              )}
            />

            <Detail
              label="Top life area"
              value={
                topCategory?.name ||
                "No data"
              }
            />
          </View>
        </View>

        <Pressable
          style={[
            styles.bottomPdfButton,
            isMobile && styles.bottomPdfButtonMobile,
            compactMode && styles.bottomPdfButtonCompact,
            exporting &&
              styles.pdfButtonDisabled,
          ]}
          onPress={exportPdf}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="download-outline"
              size={20}
              color="#FFFFFF"
            />
          )}

          <View>
            <Text style={styles.bottomPdfTitle}>
              {exporting
                ? "Preparing your PDF..."
                : "Download detailed PDF"}
            </Text>

            <Text
              style={styles.bottomPdfSubtitle}
            >
              {period === "year"
                ? "Includes monthly breakdown and every activity"
                : "Includes the complete selected-period report"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={styles.detailValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  container: {
    width: "100%",
    maxWidth: Layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Layout.screenPaddingDesktop,
    paddingTop: 26,
    paddingBottom: 50,
  },

  containerMobile: {
    paddingHorizontal: Layout.screenPaddingMobile,
    paddingTop: 18,
    paddingBottom: 34,
  },

  containerCompact: {
    paddingTop: 18,
    paddingBottom: 34,
  },

  headerMobile: {
    alignItems: "flex-start",
    flexDirection: "column",
    marginBottom: 18,
  },

  headerActionsMobile: {
    width: "100%",
  },

  periodSelectorMobile: {
    borderRadius: Radii.lg,
  },

  periodButtonMobile: {
    flexGrow: 1,
    minWidth: "46%",
    paddingHorizontal: 10,
  },

  periodButtonCompact: {
    minHeight: 38,
    paddingHorizontal: 12,
  },

  periodNavigationMobile: {
    minHeight: 82,
  },

  heroCardMobile: {
    padding: 18,
    borderRadius: Radii.xl,
  },

  heroCardCompact: {
    padding: 18,
  },

  heroContentMobile: {
    alignItems: "flex-start",
  },

  heroTitleMobile: {
    fontSize: 40,
    lineHeight: 46,
  },

  statsGridMobile: {
    gap: 8,
  },

  statCardCompact: {
    minHeight: 96,
    padding: 13,
  },

  sectionCardCompact: {
    padding: 16,
    borderRadius: Radii.lg,
  },

  activityRowCompact: {
    minHeight: 60,
    padding: 10,
  },

  bottomPdfButtonMobile: {
    minHeight: 64,
  },

  bottomPdfButtonCompact: {
    minHeight: 60,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },

  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 24,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: COLORS.primary,
    marginBottom: 3,
  },

  title: {
    fontSize: 29,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  pdfButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  pdfButtonDisabled: {
    opacity: 0.65,
  },

  pdfButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
    borderRadius: 15,
    padding: 14,
    marginBottom: 18,
  },

  errorIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },

  errorText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.danger,
  },

  periodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 7,
    marginBottom: 14,
  },

  periodButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },

  periodButtonText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },

  periodButtonTextActive: {
    color: "#FFFFFF",
  },

  periodNavigation: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },

  periodArrow: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.graySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  periodCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },

  periodLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.primary,
    marginBottom: 4,
  },

  periodTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  periodRangeText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },

  currentPeriodButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 9,
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: COLORS.blueSoft,
  },

  currentPeriodText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: Radii.xxl,
    padding: 24,
    marginBottom: 14,
    overflow: "hidden",
    ...Shadows.elevated,
  },

  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: "rgba(255,255,255,0.72)",
    marginBottom: 6,
  },

  heroTitle: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  heroDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    marginTop: 3,
  },

  progressCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  progressCircleLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.72)",
    marginTop: -2,
  },

  progressTrack: {
    height: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    marginTop: 22,
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: 180,
    minHeight: 120,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Radii.lg,
    padding: 16,
    ...Shadows.card,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },

  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },

  sectionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Radii.xl,
    padding: 20,
    marginBottom: 14,
    ...Shadows.card,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    marginTop: 4,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryBox: {
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: 15,
  },

  summaryText: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  detailSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  detailItem: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 130,
    backgroundColor: COLORS.graySoft,
    borderRadius: 13,
    padding: 12,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  breakdownTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  breakdownCount: {
    fontSize: 11,
    color: COLORS.muted,
  },

  breakdownScroll: {
    marginHorizontal: -4,
  },

  breakdownTable: {
    minWidth: 680,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: "hidden",
  },

  breakdownRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  breakdownHeaderRow: {
    backgroundColor: COLORS.graySoft,
  },

  breakdownCell: {
    width: 95,
    paddingHorizontal: 10,
    fontSize: 11,
    color: COLORS.text,
    textAlign: "center",
  },

  periodCell: {
    width: 180,
    textAlign: "left",
  },

  breakdownHeaderText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
    textTransform: "uppercase",
  },

  activitiesHeading: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  activitiesHeadingSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },

  activityCountBadge: {
    minWidth: 34,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  activityCountText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  activityList: {
    gap: 8,
  },

  activityRow: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  activityStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  activityMain: {
    flex: 1,
    minWidth: 0,
  },

  activityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },

  activityMeta: {
    fontSize: 10,
    color: COLORS.muted,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
  },

  activityRight: {
    alignItems: "flex-end",
    gap: 5,
  },

  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  priorityBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  emptyDescription: {
    maxWidth: 430,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 5,
  },

  areaList: {
    gap: 14,
  },

  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  areaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  areaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  areaName: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  areaMeta: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  areaRight: {
    width: 150,
    alignItems: "flex-end",
  },

  areaPercentage: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 5,
  },

  areaTrack: {
    width: "100%",
    height: 6,
    borderRadius: 8,
    backgroundColor: COLORS.graySoft,
    overflow: "hidden",
  },

  areaFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },

  priorityList: {
    gap: 18,
  },

  priorityRow: {
    gap: 8,
  },

  priorityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  priorityLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  priorityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  priorityLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  priorityValue: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  priorityPercent: {
    color: COLORS.muted,
    fontWeight: "600",
  },

  priorityTrack: {
    width: "100%",
    height: 7,
    borderRadius: 8,
    backgroundColor: COLORS.graySoft,
    overflow: "hidden",
  },

  priorityFill: {
    height: "100%",
    borderRadius: 8,
  },

  insightList: {
    gap: 11,
  },

  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 13,
    backgroundColor: COLORS.backgroundSoft,
  },

  insightNumber: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  insightNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  insightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    paddingTop: 2,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  bottomPdfButton: {
    minHeight: 70,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    paddingHorizontal: 20,
    marginTop: 2,
  },

  bottomPdfTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomPdfSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    marginTop: 3,
  },

  bottomSpace: {
    height: 20,
  },
});