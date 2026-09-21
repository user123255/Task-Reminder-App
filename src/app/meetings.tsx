import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  FontSizes,
  FontWeights,
  Layout,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTaskFlowSettings } from "@/hooks/use-taskflow-settings";

const COLORS = {
  primary: "#FF7A00",
  primaryDark: "#E56600",
  primaryLight: "#FFF1E5",

  gold: "#DFAE45",
  goldLight: "#FBF4E4",

  navy: "#0B1F3A",
  navyDark: "#07162A",
  navySoft: "#102B4D",

  background: "#F4F5F7",
  backgroundSoft: "#F8F9FA",

  surface: "#FFFFFF",
  surfaceMuted: "#F1F3F5",
  card: "#FFFFFF",
  white: "#FFFFFF",

  text: "#172033",
  textStrong: "#0B1F3A",
  textSecondary: "#59677A",
  textMuted: "#8792A2",
  muted: "#8792A2",

  border: "#E2E5E9",
  borderLight: "#ECEEF1",
  borderStrong: "#D3D8DE",

  success: "#2E9B67",
  successLight: "#EAF6F0",

  warning: "#DFAE45",
  warningLight: "#FBF4E4",

  danger: "#D9534F",
  dangerLight: "#FCEDEC",
};

type Meeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  platform: "Google Meet" | "Zoom" | "Other";
  link: string;
  notes: string;
  createdAt: string;
};

const LEGACY_STORAGE_KEY = "@taskflow_meetings";
const STORAGE_KEY_PREFIX = "@taskflow_meetings:";

const platforms: Meeting["platform"][] = [
  "Google Meet",
  "Zoom",
  "Other",
];

const NAV_ITEMS = [
  { label: "Home", icon: "home-outline", route: "/" },
  { label: "Tasks", icon: "checkmark-circle-outline", route: "/tasks" },
  { label: "Calendar", icon: "calendar-outline", route: "/calendar" },
  { label: "Library", icon: "library-outline", route: "/library" },
  { label: "Reports", icon: "bar-chart-outline", route: "/reports" },
  { label: "AI Assist", icon: "sparkles-outline", route: "/ai-assist" },
  { label: "Meetings", icon: "videocam-outline", route: "/meetings" },
  { label: "Trash", icon: "trash-outline", route: "/trash" },
  { label: "Help", icon: "help-circle-outline", route: "/help" },
  { label: "Settings", icon: "settings-outline", route: "/settings" },
] as const;

const normalizeDate = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  let match = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }

    return null;
  }

  match = trimmed.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);

    let month: number;
    let day: number;

    if (first > 12) {
      day = first;
      month = second;
    } else if (second > 12) {
      month = first;
      day = second;
    } else {
      month = first;
      day = second;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }

    return null;
  }

  const parsed = new Date(trimmed);

  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(
      parsed.getMonth() + 1,
    ).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }

  return null;
};

const formatStoredDate = (value: string): string => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateTime = (
  date: string,
  time: string,
): Date | null => {
  const datePart = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!datePart) return null;

  const year = Number(datePart[1]);
  const month = Number(datePart[2]);
  const day = Number(datePart[3]);

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    return new Date(year, month - 1, day);
  }

  return new Date(
    year,
    month - 1,
    day,
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
};

const getTodayString = (): string => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

const normalizeTime = (value: string): string | null => {
  const trimmed = value.trim();

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hourString, minuteString] = trimmed.split(":");

    const hour = Number(hourString);
    const minute = Number(minuteString);

    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0",
      )}`;
    }

    return null;
  }

  const match = trimmed.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (
    hour < 1 ||
    hour > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0",
  )}`;
};

const formatMeetingTime = (
  value: string,
  use24HourClock: boolean,
): string => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return value;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (use24HourClock) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )}`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0",
  )} ${period}`;
};

const getStorageKey = (userId: string) =>
  `${STORAGE_KEY_PREFIX}${userId}`;

export default function MeetingsScreen() {
  const { session } = useAuth();
  const { settings } = useTaskFlowSettings();
  const { width } = useWindowDimensions();

  const userId = session?.user?.id ?? null;

  const isMobile = width < Layout.mobileBreakpoint;
  const isTablet =
    width >= Layout.mobileBreakpoint && width < 1100;

  const use24HourClock = settings.use24HourClock;
  const compactMode = settings.compactMode;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [platform, setPlatform] =
    useState<Meeting["platform"]>("Google Meet");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  const showMessage = useCallback((message: string) => {
    if (Platform.OS === "web") {
      window.alert(message);
    } else {
      Alert.alert("TaskFlow", message);
    }
  }, []);

  const loadMeetings = useCallback(async () => {
    if (!userId) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const key = getStorageKey(userId);
      const saved = await AsyncStorage.getItem(key);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        setMeetings(
          Array.isArray(parsed) ? (parsed as Meeting[]) : [],
        );
      } else {
        const legacySaved =
          await AsyncStorage.getItem(LEGACY_STORAGE_KEY);

        if (legacySaved) {
          const parsed: unknown = JSON.parse(legacySaved);

          if (Array.isArray(parsed)) {
            const legacyMeetings = parsed as Meeting[];

            setMeetings(legacyMeetings);

            await AsyncStorage.setItem(
              key,
              JSON.stringify(legacyMeetings),
            );

            await AsyncStorage.removeItem(
              LEGACY_STORAGE_KEY,
            );
          } else {
            setMeetings([]);
          }
        } else {
          setMeetings([]);
        }
      }
    } catch (error) {
      console.error("Failed to load meetings:", error);
      setMeetings([]);

      showMessage(
        "Unable to load your meetings right now.",
      );
    } finally {
      setLoading(false);
    }
  }, [showMessage, userId]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const saveMeetings = useCallback(
    async (items: Meeting[]) => {
      if (!userId) {
        showMessage(
          "Please sign in again before saving meetings.",
        );
        return false;
      }

      setSaving(true);

      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify(items),
        );

        setMeetings(items);

        return true;
      } catch (error) {
        console.error("Failed to save meetings:", error);

        showMessage(
          "Unable to save the meeting. Please try again.",
        );

        return false;
      } finally {
        setSaving(false);
      }
    },
    [showMessage, userId],
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setDate("");
    setTime("");
    setPlatform("Google Meet");
    setLink("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  }, []);

  const handleSave = async () => {
    const cleanTitle = title.trim();
    const cleanDate = date.trim();
    const cleanTime = time.trim();
    const cleanLink = link.trim();
    const cleanNotes = notes.trim();

    if (!cleanTitle) {
      showMessage("Please enter a meeting title.");
      return;
    }

    const normalizedDate = normalizeDate(cleanDate);

    if (!normalizedDate) {
      showMessage(
        "Please check the date. Try September 18, 2026, 09/18/2026, or 2026-09-18.",
      );
      return;
    }

    const normalizedTime = normalizeTime(cleanTime);

    if (!normalizedTime) {
      showMessage(
        "Please enter a valid time, for example 10:00 AM.",
      );
      return;
    }

    const existingMeeting = editingId
      ? meetings.find((item) => item.id === editingId)
      : undefined;

    const meeting: Meeting = {
      id: editingId ?? `${Date.now()}`,
      title: cleanTitle,
      date: normalizedDate,
      time: normalizedTime,
      platform,
      link: cleanLink,
      notes: cleanNotes,
      createdAt:
        existingMeeting?.createdAt ??
        new Date().toISOString(),
    };

    const updated = editingId
      ? meetings.map((item) =>
          item.id === editingId ? meeting : item,
        )
      : [meeting, ...meetings];

    const saved = await saveMeetings(updated);

    if (saved) {
      resetForm();
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setTitle(meeting.title);
    setDate(formatStoredDate(meeting.date));

    setTime(
      use24HourClock
        ? meeting.time
        : formatMeetingTime(meeting.time, false),
    );

    setPlatform(meeting.platform);
    setLink(meeting.link);
    setNotes(meeting.notes);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const remove = async () => {
      const updated = meetings.filter(
        (meeting) => meeting.id !== id,
      );

      const saved = await saveMeetings(updated);

      if (saved && editingId === id) {
        resetForm();
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to delete this meeting?",
        )
      ) {
        void remove();
      }

      return;
    }

    Alert.alert(
      "Delete meeting",
      "Are you sure you want to delete this meeting?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void remove(),
        },
      ],
    );
  };

  const openMeeting = async (meetingLink: string) => {
    if (!meetingLink.trim()) {
      showMessage(
        "This meeting does not have a link yet.",
      );
      return;
    }

    let url = meetingLink.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        showMessage(
          "This meeting link cannot be opened.",
        );
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error(
        "Failed to open meeting:",
        error,
      );

      showMessage(
        "Unable to open this meeting link.",
      );
    }
  };

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sorted = [...meetings].sort((a, b) => {
      const first =
        getDateTime(a.date, a.time)?.getTime() ?? 0;

      const second =
        getDateTime(b.date, b.time)?.getTime() ?? 0;

      if (first !== second) {
        return first - second;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });

    if (!query) return sorted;

    return sorted.filter((meeting) =>
      [
        meeting.title,
        meeting.platform,
        meeting.date,
        meeting.time,
        meeting.notes,
        meeting.link,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [meetings, search]);

  const upcomingMeetings = useMemo(() => {
    const now = new Date();

    return meetings.filter((meeting) => {
      const meetingDate = getDateTime(
        meeting.date,
        meeting.time,
      );

      return (
        meetingDate !== null &&
        !Number.isNaN(meetingDate.getTime()) &&
        meetingDate >= now
      );
    });
  }, [meetings]);

  const todayMeetings = useMemo(() => {
    const todayString = getTodayString();

    return meetings.filter(
      (meeting) => meeting.date === todayString,
    );
  }, [meetings]);

  const meetingsWithNotes = useMemo(
    () =>
      meetings.filter(
        (meeting) => Boolean(meeting.notes.trim()),
      ).length,
    [meetings],
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const navigate = (route: string) => {
    setShowMobileMenu(false);

    if (route === "/meetings") {
      return;
    }

    router.push(route as never);
  };

  const openNewMeeting = () => {
    resetForm();
    setShowForm(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBrand}>
          <View style={styles.loadingLogo}>
            <Ionicons
              name="checkmark"
              size={24}
              color={COLORS.white}
            />
          </View>

          <Text style={styles.loadingBrandText}>
            TaskFlow
          </Text>
        </View>

        <Text style={styles.loadingTitle}>
          Loading meetings
        </Text>

        <Text style={styles.loadingText}>
          Preparing your meeting workspace...
        </Text>

        <ActivityIndicator
          color={COLORS.primary}
          style={styles.loadingSpinner}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isMobile && (
        <DesktopSidebar
          onNavigate={navigate}
          isTablet={isTablet}
        />
      )}

      <View style={styles.mainArea}>
        <DesktopTopBar
          search={search}
          onSearchChange={setSearch}
          onMobileMenu={() =>
            setShowMobileMenu(true)
          }
          isMobile={isMobile}
          onNewMeeting={openNewMeeting}
        />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            isMobile && styles.contentMobile,
            isTablet && styles.contentTablet,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.hero,
              isMobile && styles.heroMobile,
            ]}
          >
            <View style={styles.heroDecorOne} />
            <View style={styles.heroDecorTwo} />

            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                WORKSPACE / MEETINGS
              </Text>

              <Text style={styles.heroTitle}>
                Meetings
              </Text>

              <Text style={styles.heroSubtitle}>
                Keep your meetings, links, schedules, and
                notes organized in one place.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.heroButton,
                pressed && styles.pressed,
              ]}
              onPress={openNewMeeting}
            >
              <Ionicons
                name="add"
                size={19}
                color={COLORS.white}
              />

              {!isMobile && (
                <Text style={styles.heroButtonText}>
                  New meeting
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              icon="calendar-outline"
              label="Total meetings"
              value={meetings.length}
              compact={compactMode}
            />

            <StatCard
              icon="time-outline"
              label="Upcoming"
              value={upcomingMeetings.length}
              compact={compactMode}
            />

            <StatCard
              icon="today-outline"
              label="Today"
              value={todayMeetings.length}
              compact={compactMode}
            />

            <StatCard
              icon="document-text-outline"
              label="With notes"
              value={meetingsWithNotes}
              compact={compactMode}
            />
          </View>

          {showForm && (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderText}>
                  <Text style={styles.formEyebrow}>
                    {editingId
                      ? "UPDATE MEETING"
                      : "NEW MEETING"}
                  </Text>

                  <View style={styles.formTitleRow}>
                    <Text style={styles.formTitle}>
                      {editingId
                        ? "Edit meeting"
                        : "Create meeting"}
                    </Text>
                  </View>

                  <Text style={styles.formSubtitle}>
                    Add the details you need before the
                    meeting starts.
                  </Text>
                </View>

                <Pressable
                  onPress={resetForm}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>

              <Text style={styles.label}>
                Meeting title
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Team planning meeting"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={styles.input}
                returnKeyType="next"
              />

              <View
                style={[
                  styles.twoColumns,
                  isMobile &&
                    styles.twoColumnsMobile,
                ]}
              >
                <View style={styles.column}>
                  <Text style={styles.label}>
                    Date
                  </Text>

                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder="September 18, 2026"
                    placeholderTextColor={
                      COLORS.textMuted
                    }
                    style={styles.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.column}>
                  <Text style={styles.label}>
                    Time
                  </Text>

                  <TextInput
                    value={time}
                    onChangeText={setTime}
                    placeholder={
                      use24HourClock
                        ? "10:00"
                        : "10:00 AM"
                    }
                    placeholderTextColor={
                      COLORS.textMuted
                    }
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Text style={styles.helperText}>
                Your saved time follows your{" "}
                {use24HourClock
                  ? "24-hour"
                  : "12-hour"}{" "}
                TaskFlow clock preference.
              </Text>

              <Text style={styles.label}>
                Meeting platform
              </Text>

              <View style={styles.platformRow}>
                {platforms.map((item) => {
                  const active = platform === item;

                  return (
                    <Pressable
                      key={item}
                      onPress={() =>
                        setPlatform(item)
                      }
                      style={({ pressed }) => [
                        styles.platformButton,
                        active &&
                          styles.platformButtonActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={
                          item === "Google Meet"
                            ? "logo-google"
                            : item === "Zoom"
                              ? "videocam-outline"
                              : "globe-outline"
                        }
                        size={17}
                        color={
                          active
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />

                      <Text
                        style={[
                          styles.platformText,
                          active &&
                            styles.platformTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>
                Meeting link
              </Text>

              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder="https://..."
                placeholderTextColor={
                  COLORS.textMuted
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />

              <Text style={styles.label}>
                Notes
              </Text>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Agenda, discussion points, decisions..."
                placeholderTextColor={
                  COLORS.textMuted
                }
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.notesInput,
                ]}
              />

              <View
                style={[
                  styles.formActions,
                  isMobile &&
                    styles.formActionsMobile,
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    isMobile &&
                      styles.mobileActionButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    isMobile &&
                      styles.mobileActionButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    void handleSave()
                  }
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={COLORS.white}
                    />
                  )}

                  <Text style={styles.saveText}>
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Save changes"
                        : "Create meeting"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.sectionIntro}>
            <View>
              <Text style={styles.sectionEyebrow}>
                SCHEDULE
              </Text>

              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  Your meetings
                </Text>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {filteredMeetings.length}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionSubtitle}>
                {search.trim()
                  ? "Showing meetings that match your search."
                  : "Everything you have scheduled."}
              </Text>
            </View>

            {!isMobile &&
              filteredMeetings.length > 0 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.quickAddButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={openNewMeeting}
                >
                  <Ionicons
                    name="add"
                    size={17}
                    color={COLORS.primary}
                  />

                  <Text style={styles.quickAddText}>
                    Add meeting
                  </Text>
                </Pressable>
              )}
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={19}
              color={COLORS.textMuted}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search meetings..."
              placeholderTextColor={
                COLORS.textMuted
              }
              style={styles.searchInput}
              autoCorrect={false}
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textMuted}
                />
              </Pressable>
            )}
          </View>

          {filteredMeetings.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyAccent} />

              <View style={styles.emptyIcon}>
                <Ionicons
                  name={
                    search.trim()
                      ? "search-outline"
                      : "videocam-outline"
                  }
                  size={29}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.emptyEyebrow}>
                {search.trim()
                  ? "NO RESULTS"
                  : "MEETING WORKSPACE"}
              </Text>

              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? "No meetings found"
                  : "No meetings yet"}
              </Text>

              <Text style={styles.emptyText}>
                {search.trim()
                  ? "Try another search term or clear your search to see all meetings."
                  : "Create your first meeting and keep the schedule, link, and notes together."}
              </Text>

              {!search.trim() && (
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={openNewMeeting}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={COLORS.white}
                  />

                  <Text
                    style={styles.emptyButtonText}
                  >
                    Create your first meeting
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.meetingsList}>
              {filteredMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  compact={compactMode}
                  use24HourClock={
                    use24HourClock
                  }
                  onEdit={() =>
                    handleEdit(meeting)
                  }
                  onDelete={() =>
                    handleDelete(meeting.id)
                  }
                  onJoin={() =>
                    void openMeeting(
                      meeting.link,
                    )
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {isMobile && (
        <MobileMenu
          visible={showMobileMenu}
          onClose={() =>
            setShowMobileMenu(false)
          }
          onNavigate={navigate}
          onNewMeeting={openNewMeeting}
        />
      )}
    </View>
  );
}

function DesktopSidebar({
  onNavigate,
  isTablet,
}: {
  onNavigate: (route: string) => void;
  isTablet: boolean;
}) {
  return (
    <View
      style={[
        styles.sidebar,
        isTablet && styles.sidebarTablet,
      ]}
    >
      <View style={styles.brandArea}>
        <View style={styles.brandMark}>
          <Ionicons
            name="checkmark"
            size={22}
            color={COLORS.white}
          />
        </View>

        {!isTablet && (
          <Text style={styles.brandText}>
            TaskFlow
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.navLabel,
          isTablet && styles.navLabelTablet,
        ]}
      >
        WORKSPACE
      </Text>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active = item.label === "Meetings";

          return (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.navItem,
                active && styles.navItemActive,
                pressed && styles.navPressed,
              ]}
              onPress={() =>
                onNavigate(item.route)
              }
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={
                  active
                    ? COLORS.white
                    : "#AAB7C7"
                }
              />

              {!isTablet && (
                <Text
                  style={[
                    styles.navText,
                    active &&
                      styles.navTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sidebarBottom}>
        <View style={styles.sidebarProfile}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              N
            </Text>
          </View>

          {!isTablet && (
            <View style={styles.profileText}>
              <Text
                style={styles.profileName}
                numberOfLines={1}
              >
                Nyayath
              </Text>

              <Text
                style={styles.profileRole}
                numberOfLines={1}
              >
                TaskFlow account
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function DesktopTopBar({
  search,
  onSearchChange,
  onMobileMenu,
  isMobile,
  onNewMeeting,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onMobileMenu: () => void;
  isMobile: boolean;
  onNewMeeting: () => void;
}) {
  return (
    <View
      style={[
        styles.topBar,
        isMobile && styles.topBarMobile,
      ]}
    >
      {isMobile && (
        <Pressable
          style={({ pressed }) => [
            styles.mobileMenuButton,
            pressed && styles.pressed,
          ]}
          onPress={onMobileMenu}
          accessibilityRole="button"
          accessibilityLabel="Open navigation"
        >
          <Ionicons
            name="menu-outline"
            size={25}
            color={COLORS.white}
          />
        </Pressable>
      )}

      <View
        style={[
          styles.topSearch,
          isMobile && styles.topSearchMobile,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={19}
          color="#AAB7C7"
        />

        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search meetings..."
          placeholderTextColor="#AAB7C7"
          style={styles.topSearchInput}
          autoCorrect={false}
        />

        {!isMobile && (
          <View style={styles.searchShortcut}>
            <Text style={styles.searchShortcutText}>
              /
            </Text>
          </View>
        )}
      </View>

      <View style={styles.topActions}>
        {isMobile && (
          <Pressable
            style={({ pressed }) => [
              styles.topIconButton,
              pressed && styles.pressed,
            ]}
            onPress={onNewMeeting}
          >
            <Ionicons
              name="add"
              size={21}
              color={COLORS.primary}
            />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.topIconButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push("/ai-assist" as never)
          }
          accessibilityRole="button"
          accessibilityLabel="Open AI Assist"
        >
          <Ionicons
            name="sparkles-outline"
            size={20}
            color={COLORS.primary}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.topIconButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color="#D7DFE8"
          />

          <View style={styles.notificationDot} />
        </Pressable>

        <View style={styles.topAvatar}>
          <Text style={styles.topAvatarText}>
            N
          </Text>
        </View>
      </View>
    </View>
  );
}

function MobileMenu({
  visible,
  onClose,
  onNavigate,
  onNewMeeting,
}: {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onNewMeeting: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.drawerOverlay}
          onPress={onClose}
        />

        <View style={styles.mobileDrawer}>
          <View style={styles.drawerHeader}>
            <View style={styles.brandArea}>
              <View style={styles.brandMark}>
                <Ionicons
                  name="checkmark"
                  size={21}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.brandText}>
                TaskFlow
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.drawerClose,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                size={22}
                color="#C5CFDB"
              />
            </Pressable>
          </View>

          <View style={styles.drawerProfile}>
            <View style={styles.drawerAvatar}>
              <Text style={styles.drawerAvatarText}>
                N
              </Text>
            </View>

            <View style={styles.drawerProfileText}>
              <Text style={styles.drawerName}>
                Nyayath
              </Text>

              <Text style={styles.drawerSubtitle}>
                Your TaskFlow workspace
              </Text>
            </View>
          </View>

          <Text style={styles.drawerSectionLabel}>
            WORKSPACE
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.drawerNavContent
            }
          >
            {NAV_ITEMS.map((item) => {
              const active =
                item.label === "Meetings";

              return (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.drawerNavItem,
                    active &&
                      styles.drawerNavItemActive,
                    pressed &&
                      styles.drawerNavPressed,
                  ]}
                  onPress={() =>
                    onNavigate(item.route)
                  }
                >
                  <View
                    style={[
                      styles.drawerIconBox,
                      active &&
                        styles.drawerIconBoxActive,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={
                        active
                          ? COLORS.white
                          : "#AAB7C7"
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.drawerNavText,
                      active &&
                        styles.drawerNavTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>

                  {active && (
                    <View
                      style={
                        styles.drawerActiveBar
                      }
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.drawerNewMeeting,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              onClose();
              onNewMeeting();
            }}
          >
            <Ionicons
              name="add"
              size={19}
              color={COLORS.white}
            />

            <Text
              style={styles.drawerNewMeetingText}
            >
              New meeting
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StatCard({
  icon,
  label,
  value,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  compact: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        compact && styles.statCardCompact,
      ]}
    >
      <View
        style={[
          styles.statIcon,
          compact && styles.statIconCompact,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.statContent}>
        <Text
          style={[
            styles.statValue,
            compact && styles.statValueCompact,
          ]}
        >
          {value}
        </Text>

        <Text style={styles.statLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MeetingCard({
  meeting,
  compact,
  use24HourClock,
  onEdit,
  onDelete,
  onJoin,
}: {
  meeting: Meeting;
  compact: boolean;
  use24HourClock: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onJoin: () => void;
}) {
  const meetingDate = getDateTime(
    meeting.date,
    meeting.time,
  );

  const isUpcoming =
    meetingDate !== null &&
    !Number.isNaN(meetingDate.getTime()) &&
    meetingDate >= new Date();

  const isToday =
    meeting.date === getTodayString();

  return (
    <View
      style={[
        styles.meetingCard,
        compact && styles.meetingCardCompact,
      ]}
    >
      <View style={styles.meetingAccent} />

      <View style={styles.meetingTop}>
        <View
          style={[
            styles.meetingIcon,
            compact &&
              styles.meetingIconCompact,
          ]}
        >
          <Ionicons
            name="videocam-outline"
            size={22}
            color={COLORS.white}
          />
        </View>

        <View style={styles.meetingMain}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.meetingTitle,
                compact &&
                  styles.meetingTitleCompact,
              ]}
              numberOfLines={2}
            >
              {meeting.title}
            </Text>

            {isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>
                  TODAY
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.textMuted}
            />

            <Text style={styles.metaText}>
              {formatStoredDate(meeting.date)}
            </Text>

            <Ionicons
              name="time-outline"
              size={14}
              color={COLORS.textMuted}
            />

            <Text style={styles.metaText}>
              {formatMeetingTime(
                meeting.time,
                use24HourClock,
              )}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            onPress={onEdit}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${meeting.title}`}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={COLORS.textSecondary}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              styles.deleteIconButton,
              pressed && styles.pressed,
            ]}
            onPress={onDelete}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${meeting.title}`}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={COLORS.danger}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.platformBadge}>
        <Ionicons
          name={
            meeting.platform === "Google Meet"
              ? "logo-google"
              : meeting.platform === "Zoom"
                ? "videocam-outline"
                : "globe-outline"
          }
          size={15}
          color={COLORS.primary}
        />

        <Text style={styles.platformBadgeText}>
          {meeting.platform}
        </Text>
      </View>

      {!compact && !!meeting.notes.trim() && (
        <View style={styles.notesBox}>
          <View style={styles.notesIcon}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={COLORS.primary}
            />
          </View>

          <Text
            style={styles.notesText}
            numberOfLines={3}
          >
            {meeting.notes}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.meetingBottom,
          compact &&
            styles.meetingBottomCompact,
        ]}
      >
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: meeting.link
                  ? COLORS.success
                  : COLORS.textMuted,
              },
            ]}
          />

          <Text
            style={styles.linkStatus}
            numberOfLines={1}
          >
            {meeting.link
              ? isUpcoming
                ? "Ready to join"
                : "Meeting link added"
              : "No meeting link"}
          </Text>
        </View>

        {meeting.link && (
          <Pressable
            style={({ pressed }) => [
              styles.joinButton,
              pressed && styles.pressed,
            ]}
            onPress={onJoin}
          >
            <Ionicons
              name="open-outline"
              size={16}
              color={COLORS.white}
            />

            <Text style={styles.joinText}>
              Join meeting
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.background,
  },

  mainArea: {
    flex: 1,
    minWidth: 0,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[6],
    backgroundColor: COLORS.navyDark,
  },

  loadingBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 35,
  },

  loadingLogo: {
    width: 44,
    height: 44,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingBrandText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: FontWeights.extraBold,
  },

  loadingTitle: {
    color: COLORS.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },

  loadingText: {
    marginTop: Spacing[1],
    color: "#AAB7C7",
    fontSize: FontSizes.sm,
    textAlign: "center",
  },

  loadingSpinner: {
    marginTop: Spacing[4],
  },

  /* SIDEBAR */

  sidebar: {
    width: 250,
    backgroundColor: COLORS.navy,
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
  },

  sidebarTablet: {
    width: 78,
    paddingHorizontal: 10,
    alignItems: "center",
  },

  brandArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 34,
  },

  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  brandText: {
    fontSize: 21,
    fontWeight: FontWeights.extraBold,
    color: COLORS.white,
    letterSpacing: -0.5,
  },

  navLabel: {
    paddingHorizontal: 12,
    marginBottom: 10,
    color: "#8FA0B5",
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 1.3,
  },

  navLabelTablet: {
    alignSelf: "center",
    paddingHorizontal: 0,
  },

  navList: {
    gap: 5,
  },

  navItem: {
    minHeight: 46,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  navItemActive: {
    backgroundColor: COLORS.primary,
  },

  navPressed: {
    opacity: 0.72,
  },

  navText: {
    flex: 1,
    color: "#B7C2D0",
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },

  navTextActive: {
    color: COLORS.white,
    fontWeight: FontWeights.bold,
  },

  sidebarBottom: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: Spacing[4],
  },

  sidebarProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 7,
  },

  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  profileAvatarText: {
    color: COLORS.white,
    fontWeight: FontWeights.extraBold,
    fontSize: FontSizes.sm,
  },

  profileText: {
    flex: 1,
    minWidth: 0,
  },

  profileName: {
    color: COLORS.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },

  profileRole: {
    color: "#8FA0B5",
    fontSize: 11,
    marginTop: 2,
  },

  /* TOP BAR */

  topBar: {
    height: 76,
    paddingHorizontal: 28,
    backgroundColor: COLORS.navyDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  topBarMobile: {
    height: 68,
    paddingHorizontal: 14,
    gap: 10,
  },

  topSearch: {
    flex: 1,
    maxWidth: 520,
    height: 43,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  topSearchMobile: {
    maxWidth: undefined,
  },

  topSearchInput: {
    flex: 1,
    marginHorizontal: 9,
    color: COLORS.white,
    fontSize: FontSizes.sm,
    outlineStyle: "none",
  } as any,

  searchShortcut: {
    width: 26,
    height: 26,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchShortcutText: {
    color: "#AAB7C7",
    fontSize: 13,
    fontWeight: FontWeights.bold,
  },

  topActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  topAvatar: {
    width: 40,
    height: 40,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  topAvatarText: {
    color: COLORS.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.extraBold,
  },

  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* CONTENT */

  content: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 60,
  },

  contentMobile: {
    paddingHorizontal: 15,
    paddingTop: 18,
    paddingBottom: 40,
  },

  contentTablet: {
    paddingHorizontal: 20,
  },

  /* HERO */

  hero: {
    minHeight: 190,
    backgroundColor: COLORS.navy,
    borderRadius: 7,
    paddingHorizontal: 28,
    paddingVertical: 28,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },

  heroMobile: {
    minHeight: 180,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 20,
  },

  heroContent: {
    flex: 1,
    minWidth: 0,
    zIndex: 2,
  },

  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 1.8,
    marginBottom: 8,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: FontWeights.extraBold,
    letterSpacing: -1,
  },

  heroSubtitle: {
    maxWidth: 580,
    marginTop: 8,
    color: "#B8C5D4",
    fontSize: FontSizes.sm,
    lineHeight: 21,
  },

  heroButton: {
    minHeight: 45,
    paddingHorizontal: 17,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    zIndex: 2,
  },

  heroButtonText: {
    color: COLORS.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },

  heroDecorOne: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -75,
    top: -95,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  heroDecorTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: 65,
    bottom: -100,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.16)",
  },

  /* STATS */

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },

  statCard: {
    flex: 1,
    minWidth: 170,
    minHeight: 82,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statCardCompact: {
    minHeight: 68,
    padding: 12,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  statIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    color: COLORS.navy,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.extraBold,
  },

  statValueCompact: {
    fontSize: FontSizes.xl,
  },

  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  /* FORM */

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    padding: 22,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
    gap: 12,
  },

  formHeaderText: {
    flex: 1,
  },

  formEyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  formTitle: {
    color: COLORS.navy,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.extraBold,
  },

  formSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 19,
    marginTop: 5,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    color: COLORS.navy,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    marginTop: 17,
    marginBottom: 7,
  },

  helperText: {
    color: COLORS.textMuted,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 7,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 5,
    paddingHorizontal: 13,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    fontSize: FontSizes.sm,
  },

  twoColumns: {
    flexDirection: "row",
    gap: 13,
  },

  twoColumnsMobile: {
    flexDirection: "column",
    gap: 0,
  },

  column: {
    flex: 1,
    minWidth: 0,
  },

  platformRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  platformButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 5,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  platformButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  platformText: {
    color: COLORS.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },

  platformTextActive: {
    color: COLORS.primaryDark,
  },

  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },

  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 20,
  },

  formActionsMobile: {
    flexDirection: "column-reverse",
  },

  mobileActionButton: {
    width: "100%",
  },

  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: FontWeights.bold,
  },

  saveButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveText: {
    color: COLORS.white,
    fontWeight: FontWeights.bold,
  },

  /* SECTION */

  sectionIntro: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 13,
  },

  sectionEyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extraBold,
  },

  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 4,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: FontWeights.extraBold,
  },

  sectionSubtitle: {
    color: COLORS.textMuted,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },

  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: COLORS.primaryLight,
  },

  quickAddText: {
    color: COLORS.primaryDark,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },

  /* SEARCH */

  searchContainer: {
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    marginHorizontal: 9,
    color: COLORS.text,
    fontSize: FontSizes.sm,
    outlineStyle: "none",
  } as any,

  /* MEETING LIST */

  meetingsList: {
    gap: 12,
  },

  meetingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    position: "relative",
  },

  meetingCardCompact: {
    padding: 14,
    borderRadius: 6,
  },

  meetingAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
  },

  meetingTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  meetingIcon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  meetingIconCompact: {
    width: 38,
    height: 38,
    borderRadius: 6,
    marginRight: 9,
  },

  meetingMain: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  meetingTitle: {
    flex: 1,
    color: COLORS.navy,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.extraBold,
    marginBottom: 7,
  },

  meetingTitleCompact: {
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },

  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.goldLight,
  },

  todayBadgeText: {
    color: "#9A741F",
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 0.5,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },

  metaText: {
    color: COLORS.textSecondary,
    fontSize: FontSizes.xs,
    marginRight: 6,
  },

  actions: {
    flexDirection: "row",
    gap: 5,
    marginLeft: 8,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteIconButton: {
    backgroundColor: COLORS.dangerLight,
  },

  platformBadge: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  platformBadgeText: {
    color: COLORS.primaryDark,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },

  notesBox: {
    marginTop: 13,
    padding: 11,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 5,
    flexDirection: "row",
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  notesIcon: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  notesText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 19,
  },

  meetingBottom: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  meetingBottomCompact: {
    marginTop: 10,
    paddingTop: 10,
  },

  statusContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  linkStatus: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FontSizes.xs,
  },

  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  joinText: {
    color: COLORS.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.xs,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    position: "relative",
  },

  emptyAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.primary,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 7,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyEyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extraBold,
    textAlign: "center",
  },

  emptyText: {
    maxWidth: 500,
    color: COLORS.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },

  emptyButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },

  /* MOBILE DRAWER */

  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },

  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,22,42,0.65)",
  },

  mobileDrawer: {
    width: 310,
    maxWidth: "86%",
    height: "100%",
    backgroundColor: COLORS.navy,
    paddingTop: 22,
    paddingHorizontal: 14,
    paddingBottom: 18,
    ...Shadows.elevated,
  },

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    marginBottom: 20,
  },

  drawerClose: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  drawerProfile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 24,
  },

  drawerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  drawerAvatarText: {
    color: COLORS.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.extraBold,
  },

  drawerProfileText: {
    flex: 1,
    minWidth: 0,
  },

  drawerName: {
    color: COLORS.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },

  drawerSubtitle: {
    color: "#9BA9BA",
    fontSize: 11,
    marginTop: 3,
  },

  drawerSectionLabel: {
    color: "#8FA0B5",
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
    letterSpacing: 1,
    paddingHorizontal: 10,
    marginBottom: 7,
  },

  drawerNavContent: {
    paddingBottom: 20,
  },

  drawerNavItem: {
    minHeight: 48,
    borderRadius: 5,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    marginBottom: 3,
  },

  drawerNavItemActive: {
    backgroundColor: COLORS.primary,
  },

  drawerNavPressed: {
    opacity: 0.72,
  },

  drawerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  drawerIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  drawerNavText: {
    flex: 1,
    color: "#B7C2D0",
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginLeft: 11,
  },

  drawerNavTextActive: {
    color: COLORS.white,
    fontWeight: FontWeights.bold,
  },

  drawerActiveBar: {
    width: 3,
    height: 24,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },

  drawerNewMeeting: {
    minHeight: 46,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: "auto",
  },

  drawerNewMeetingText: {
    color: COLORS.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});