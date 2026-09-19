import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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

import { Colors, FontSizes, FontWeights, Layout, Radii, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTaskFlowSettings } from "@/hooks/use-taskflow-settings";

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

const normalizeDate = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  let match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

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

  match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

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
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(parsed.getDate()).padStart(2, "0")}`;
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

const getDateTime = (date: string, time: string): Date | null => {
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

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0",
      )}`;
    }

    return null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

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

const formatMeetingTime = (value: string, use24HourClock: boolean): string => {
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

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
};

const getStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;

export default function MeetingsScreen() {
  const { session } = useAuth();
  const { settings } = useTaskFlowSettings();
  const { width } = useWindowDimensions();

  const userId = session?.user?.id ?? null;
  const isMobile = width < Layout.mobileBreakpoint;
  const use24HourClock = settings.use24HourClock;
  const compactMode = settings.compactMode;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
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
        setMeetings(Array.isArray(parsed) ? (parsed as Meeting[]) : []);
      } else {
        // Preserve meetings from older TaskFlow versions when the account
        // is the first account using the new per-user storage.
        const legacySaved = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);

        if (legacySaved) {
          const parsed: unknown = JSON.parse(legacySaved);

          if (Array.isArray(parsed)) {
            const legacyMeetings = parsed as Meeting[];
            setMeetings(legacyMeetings);
            await AsyncStorage.setItem(key, JSON.stringify(legacyMeetings));
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
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
      showMessage("Unable to load your meetings right now.");
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
        showMessage("Please sign in again before saving meetings.");
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
        showMessage("Unable to save the meeting. Please try again.");
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
      showMessage("Please enter a valid time, for example 10:00 AM.");
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
      createdAt: existingMeeting?.createdAt ?? new Date().toISOString(),
    };

    const updated = editingId
      ? meetings.map((item) => (item.id === editingId ? meeting : item))
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
      const updated = meetings.filter((meeting) => meeting.id !== id);
      const saved = await saveMeetings(updated);

      if (saved && editingId === id) {
        resetForm();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this meeting?")) {
        void remove();
      }
      return;
    }

    Alert.alert(
      "Delete meeting",
      "Are you sure you want to delete this meeting?",
      [
        { text: "Cancel", style: "cancel" },
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
      showMessage("This meeting does not have a link yet.");
      return;
    }

    let url = meetingLink.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        showMessage("This meeting link cannot be opened.");
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open meeting:", error);
      showMessage("Unable to open this meeting link.");
    }
  };

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sorted = [...meetings].sort((a, b) => {
      const first = getDateTime(a.date, a.time)?.getTime() ?? 0;
      const second = getDateTime(b.date, b.time)?.getTime() ?? 0;

      if (first !== second) return first - second;

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
      const meetingDate = getDateTime(meeting.date, meeting.time);

      return (
        meetingDate !== null &&
        !Number.isNaN(meetingDate.getTime()) &&
        meetingDate >= now
      );
    });
  }, [meetings]);

  const todayMeetings = useMemo(() => {
    const todayString = getTodayString();
    return meetings.filter((meeting) => meeting.date === todayString);
  }, [meetings]);

  const meetingsWithNotes = useMemo(
    () => meetings.filter((meeting) => Boolean(meeting.notes.trim())).length,
    [meetings],
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const openNewMeeting = () => {
    resetForm();
    setShowForm(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator color={Colors.white} />
        </View>
        <Text style={styles.loadingTitle}>Loading meetings</Text>
        <Text style={styles.loadingText}>
          Getting your meeting workspace ready...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.header,
            isMobile && styles.headerMobile,
          ]}
        >
          <View style={styles.headerLeft}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
              onPress={goBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={Colors.textSecondary}
              />
            </Pressable>

            <View style={styles.headerIcon}>
              <Ionicons
                name="videocam-outline"
                size={27}
                color={Colors.primary}
              />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.title}>Meetings</Text>
              <Text style={styles.subtitle}>
                Keep meetings, notes, and links organized.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              isMobile && styles.addButtonMobile,
              pressed && styles.pressed,
            ]}
            onPress={openNewMeeting}
            accessibilityRole="button"
            accessibilityLabel="Create a new meeting"
          >
            <Ionicons name="add" size={21} color={Colors.textOnPrimary} />
            {!isMobile && (
              <Text style={styles.addButtonText}>New meeting</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-outline"
            label="Total"
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
                <View style={styles.formTitleRow}>
                  <View style={styles.formTitleIcon}>
                    <Ionicons
                      name={editingId ? "create-outline" : "add-circle-outline"}
                      size={18}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.formTitle}>
                    {editingId ? "Edit meeting" : "Create meeting"}
                  </Text>
                </View>

                <Text style={styles.formSubtitle}>
                  Add everything you need before the meeting starts.
                </Text>
              </View>

              <Pressable onPress={resetForm} hitSlop={10}>
                <Ionicons
                  name="close-circle-outline"
                  size={27}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>

            <Text style={styles.label}>Meeting title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Team planning meeting"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              returnKeyType="next"
            />

            <View style={[styles.twoColumns, isMobile && styles.twoColumnsMobile]}>
              <View style={styles.column}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="September 18, 2026"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder={use24HourClock ? "10:00" : "10:00 AM"}
                  placeholderTextColor={Colors.textMuted}
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Text style={styles.helperText}>
              Use a normal date format. Your saved time follows your TaskFlow
              {use24HourClock ? " 24-hour" : " 12-hour"} clock preference.
            </Text>

            <Text style={styles.label}>Meeting platform</Text>

            <View style={styles.platformRow}>
              {platforms.map((item) => {
                const active = platform === item;

                return (
                  <Pressable
                    key={item}
                    onPress={() => setPlatform(item)}
                    style={({ pressed }) => [
                      styles.platformButton,
                      active && styles.platformButtonActive,
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
                      color={active ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.platformText,
                        active && styles.platformTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Meeting link</Text>
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="https://..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Agenda, discussion points, decisions..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.notesInput]}
            />

            <View style={[styles.formActions, isMobile && styles.formActionsMobile]}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  isMobile && styles.mobileActionButton,
                  pressed && styles.pressed,
                ]}
                onPress={resetForm}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  isMobile && styles.mobileActionButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => void handleSave()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
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

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={21}
            color={Colors.textMuted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search meetings..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your meetings</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredMeetings.length} meeting
              {filteredMeetings.length === 1 ? "" : "s"}
              {search.trim() ? " found" : ""}
            </Text>
          </View>

          {!isMobile && filteredMeetings.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.quickAddButton,
                pressed && styles.pressed,
              ]}
              onPress={openNewMeeting}
            >
              <Ionicons name="add" size={17} color={Colors.primary} />
              <Text style={styles.quickAddText}>Add meeting</Text>
            </Pressable>
          )}
        </View>

        {filteredMeetings.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={search.trim() ? "search-outline" : "videocam-outline"}
                size={32}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {search.trim() ? "No meetings found" : "No meetings yet"}
            </Text>

            <Text style={styles.emptyText}>
              {search.trim()
                ? "Try another search term or clear your search to see all meetings."
                : "Create your first meeting and keep the link, schedule, and notes together in one place."}
            </Text>

            {!search.trim() && (
              <Pressable
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.pressed,
                ]}
                onPress={openNewMeeting}
              >
                <Ionicons name="add" size={18} color={Colors.white} />
                <Text style={styles.emptyButtonText}>
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
                use24HourClock={use24HourClock}
                onEdit={() => handleEdit(meeting)}
                onDelete={() => handleDelete(meeting.id)}
                onJoin={() => void openMeeting(meeting.link)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
    <View style={[styles.statCard, compact && styles.statCardCompact]}>
      <View style={[styles.statIcon, compact && styles.statIconCompact]}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>

      <View style={styles.statContent}>
        <Text style={[styles.statValue, compact && styles.statValueCompact]}>
          {value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
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
  const meetingDate = getDateTime(meeting.date, meeting.time);

  const isUpcoming =
    meetingDate !== null &&
    !Number.isNaN(meetingDate.getTime()) &&
    meetingDate >= new Date();

  const isToday = meeting.date === getTodayString();

  return (
    <View style={[styles.meetingCard, compact && styles.meetingCardCompact]}>
      <View style={styles.meetingTop}>
        <View style={[styles.meetingIcon, compact && styles.meetingIconCompact]}>
          <Ionicons
            name="videocam-outline"
            size={22}
            color={Colors.primary}
          />
        </View>

        <View style={styles.meetingMain}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.meetingTitle, compact && styles.meetingTitleCompact]}
              numberOfLines={2}
            >
              {meeting.title}
            </Text>

            {isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Today</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={Colors.textMuted}
            />
            <Text style={styles.metaText}>
              {formatStoredDate(meeting.date)}
            </Text>

            <Ionicons
              name="time-outline"
              size={15}
              color={Colors.textMuted}
            />
            <Text style={styles.metaText}>
              {formatMeetingTime(meeting.time, use24HourClock)}
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
              size={19}
              color={Colors.textSecondary}
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
              size={19}
              color={Colors.danger}
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
          color={Colors.primary}
        />
        <Text style={styles.platformBadgeText}>{meeting.platform}</Text>
      </View>

      {!compact && !!meeting.notes.trim() && (
        <View style={styles.notesBox}>
          <Ionicons
            name="document-text-outline"
            size={17}
            color={Colors.textSecondary}
          />
          <Text style={styles.notesText} numberOfLines={3}>
            {meeting.notes}
          </Text>
        </View>
      )}

      <View style={[styles.meetingBottom, compact && styles.meetingBottomCompact]}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: meeting.link
                  ? Colors.success
                  : Colors.textMuted,
              },
            ]}
          />
          <Text style={styles.linkStatus} numberOfLines={1}>
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
            <Ionicons name="open-outline" size={17} color={Colors.white} />
            <Text style={styles.joinText}>Join meeting</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[6],
    backgroundColor: Colors.background,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii.xl,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[4],
    ...Shadows.elevated,
  },

  loadingTitle: {
    color: Colors.textStrong,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },

  loadingText: {
    marginTop: Spacing[1],
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    width: "100%",
    maxWidth: Layout.maxContentWidth,
    alignSelf: "center",
    padding: Layout.screenPaddingDesktop,
    paddingBottom: Spacing[20],
  },

  contentMobile: {
    padding: Layout.screenPaddingMobile,
    paddingBottom: Spacing[12],
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing[6],
    gap: Spacing[4],
  },

  headerMobile: {
    alignItems: "flex-start",
  },

  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    minWidth: 0,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: FontSizes.xxxl,
    lineHeight: 35,
    fontWeight: FontWeights.extraBold,
    color: Colors.textStrong,
  },

  subtitle: {
    marginTop: Spacing[1],
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  addButton: {
    minHeight: 46,
    paddingHorizontal: Spacing[4],
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    ...Shadows.card,
  },

  addButtonMobile: {
    width: 46,
    paddingHorizontal: 0,
  },

  addButtonText: {
    color: Colors.textOnPrimary,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },

  statCard: {
    flex: 1,
    minWidth: 170,
    minHeight: 86,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  statCardCompact: {
    minHeight: 72,
    padding: Spacing[3],
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  statIconCompact: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.extraBold,
    color: Colors.textStrong,
  },

  statValueCompact: {
    fontSize: FontSizes.xl,
  },

  statLabel: {
    marginTop: 2,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing[5],
    marginBottom: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },

  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing[5],
    gap: Spacing[3],
  },

  formHeaderText: {
    flex: 1,
  },

  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },

  formTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  formTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.extraBold,
    color: Colors.textStrong,
  },

  formSubtitle: {
    marginTop: Spacing[1],
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 19,
  },

  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: 7,
    marginTop: Spacing[3],
  },

  helperText: {
    marginTop: 7,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.sm,
    paddingHorizontal: 13,
    color: Colors.text,
    backgroundColor: Colors.backgroundSoft,
    fontSize: FontSizes.sm,
  },

  twoColumns: {
    flexDirection: "row",
    gap: Spacing[3],
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
    gap: Spacing[2],
    flexWrap: "wrap",
  },

  platformButton: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  platformButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  platformText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },

  platformTextActive: {
    color: Colors.primary,
  },

  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },

  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing[2],
    marginTop: Spacing[5],
  },

  formActionsMobile: {
    flexDirection: "column-reverse",
  },

  mobileActionButton: {
    width: "100%",
  },

  cancelButton: {
    minHeight: 44,
    paddingHorizontal: Spacing[4],
    borderRadius: Radii.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surfaceMuted,
  },

  cancelText: {
    color: Colors.textSecondary,
    fontWeight: FontWeights.bold,
  },

  saveButton: {
    minHeight: 44,
    paddingHorizontal: Spacing[4],
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveText: {
    color: Colors.white,
    fontWeight: FontWeights.bold,
  },

  searchContainer: {
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing[5],
    ...Shadows.card,
  },

  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    color: Colors.text,
    fontSize: FontSizes.sm,
    outlineStyle: "none",
  } as any,

  sectionHeader: {
    marginBottom: Spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing[3],
  },

  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extraBold,
    color: Colors.textStrong,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },

  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radii.sm,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
  },

  quickAddText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },

  meetingsList: {
    gap: Spacing[3],
  },

  meetingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },

  meetingCardCompact: {
    padding: 13,
    borderRadius: Radii.md,
  },

  meetingTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  meetingIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[3],
  },

  meetingIconCompact: {
    width: 38,
    height: 38,
    borderRadius: Radii.sm,
    marginRight: Spacing[2],
  },

  meetingMain: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing[2],
  },

  meetingTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.extraBold,
    color: Colors.textStrong,
    marginBottom: 7,
  },

  meetingTitleCompact: {
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },

  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: Colors.successLight,
  },

  todayBadgeText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: FontWeights.extraBold,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },

  metaText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginRight: 7,
  },

  actions: {
    flexDirection: "row",
    gap: 5,
    marginLeft: Spacing[2],
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteIconButton: {
    backgroundColor: Colors.dangerLight,
  },

  platformBadge: {
    alignSelf: "flex-start",
    marginTop: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  platformBadgeText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },

  notesBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: Radii.sm,
    flexDirection: "row",
    gap: 9,
  },

  notesText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 19,
  },

  meetingBottom: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
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
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },

  joinButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  joinText: {
    color: Colors.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.xs,
  },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[3],
  },

  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extraBold,
    color: Colors.textStrong,
    textAlign: "center",
  },

  emptyText: {
    maxWidth: 480,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 21,
    marginTop: Spacing[2],
  },

  emptyButton: {
    marginTop: Spacing[5],
    backgroundColor: Colors.primary,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing[4],
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
});
