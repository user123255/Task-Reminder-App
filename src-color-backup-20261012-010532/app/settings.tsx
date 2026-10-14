import {
  Colors,
  Layout,
  Radii,
  Shadows,
  Spacing,
} from "@/constants/theme";
import {
  DEFAULT_TASKFLOW_SETTINGS,
  useTaskFlowSettings,
} from "@/hooks/use-taskflow-settings";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/utils/supabase";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

export type { TaskFlowSettings } from "@/hooks/use-taskflow-settings";
export const DEFAULT_SETTINGS = DEFAULT_TASKFLOW_SETTINGS;

const REMINDER_OPTIONS = [
  { minutes: 0, label: "At activity time" },
  { minutes: 5, label: "5 minutes before" },
  { minutes: 10, label: "10 minutes before" },
  { minutes: 15, label: "15 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
];

async function saveTaskFlowProfileName(name: string): Promise<void> {
  const cleaned = name.trim();

  if (!cleaned) {
    throw new Error("Display name cannot be empty.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("You are not signed in.");

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: cleaned,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    console.error("Failed to save profile display name:", profileError);
    throw profileError;
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: cleaned,
      name: cleaned,
    },
  });

  if (authError) {
    console.warn(
      "Profile saved, but auth metadata could not be updated:",
      authError,
    );
  }
}

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < Layout.mobileBreakpoint;
  const isNarrow = width < 420;

  const { session, displayName, refreshProfile } = useAuth();
  const {
    settings,
    loading,
    saving,
    updateSetting,
    resetSettings,
  } = useTaskFlowSettings();

  const [profileModal, setProfileModal] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [reminderModal, setReminderModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [resetting, setResetting] = useState(false);

  const showMessage = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }, []);

  const updateSettingSafely = useCallback(
    async <K extends keyof typeof settings>(
      key: K,
      value: (typeof settings)[K],
    ) => {
      try {
        await updateSetting(key, value);
      } catch (error) {
        console.error(`Failed to update ${String(key)}:`, error);
        showMessage(
          "Could not save setting",
          "Your change could not be saved. Please try again.",
        );
      }
    },
    [showMessage, updateSetting, settings],
  );

  const openProfile = () => {
    setNameDraft(displayName);
    setProfileModal(true);
  };

  const closeProfile = () => {
    if (profileSaving) return;
    setProfileModal(false);
    setNameDraft(displayName);
  };

  const saveProfile = async () => {
    const cleaned = nameDraft.trim();

    if (!cleaned) {
      showMessage("Name required", "Please enter a display name.");
      return;
    }

    if (cleaned.length > 50) {
      showMessage(
        "Name too long",
        "Please keep your display name under 50 characters.",
      );
      return;
    }

    try {
      setProfileSaving(true);
      await saveTaskFlowProfileName(cleaned);
      await refreshProfile();
      setProfileModal(false);

      showMessage(
        "Profile updated",
        `TaskFlow will now use "${cleaned}" throughout your account.`,
      );
    } catch (error) {
      console.error("Failed to update profile:", error);
      showMessage(
        "Profile error",
        error instanceof Error
          ? error.message
          : "Your profile could not be updated. Please try again.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const selectReminder = async (minutes: number) => {
    setReminderModal(false);
    await updateSettingSafely("defaultReminderMinutes", minutes);
  };

  const signOut = async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
      showMessage(
        "Sign-out error",
        "You could not be signed out. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  };

  const performReset = async () => {
    if (resetting) return;

    try {
      setResetting(true);
      await resetSettings();
      showMessage(
        "Settings reset",
        "TaskFlow settings have been restored to their defaults.",
      );
    } catch (error) {
      console.error("Failed to reset settings:", error);
      showMessage(
        "Reset failed",
        "TaskFlow could not reset your settings. Please try again.",
      );
    } finally {
      setResetting(false);
    }
  };

  const resetAllSettings = () => {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Reset all TaskFlow settings to their default values?",
        )
      ) {
        void performReset();
      }
      return;
    }

    Alert.alert(
      "Reset settings",
      "This will restore your TaskFlow preferences to their defaults. Your activities and account will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => void performReset(),
        },
      ],
    );
  };

  const reminderLabel =
    REMINDER_OPTIONS.find(
      (item) => item.minutes === settings.defaultReminderMinutes,
    )?.label ?? `${settings.defaultReminderMinutes} minutes before`;

  const initials = displayName.trim().charAt(0).toUpperCase() || "U";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons name="settings-outline" size={25} color={Colors.primary} />
        </View>
        <Text style={styles.loadingTitle}>Loading settings</Text>
        <Text style={styles.loadingText}>
          Preparing your TaskFlow preferences...
        </Text>
        <ActivityIndicator
          style={styles.loadingIndicator}
          color={Colors.primary}
        />
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
      >
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={Colors.text} />
            </Pressable>

            <View style={styles.headerTextContainer}>
              <Text style={[styles.title, isMobile && styles.titleMobile]}>
                Settings
              </Text>
              <Text style={styles.subtitle}>
                Customize your TaskFlow experience
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.profileCard, isMobile && styles.profileCardMobile]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{initials}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>Signed in as</Text>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            {session?.user?.email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {session.user.email}
              </Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={openProfile}
            style={({ pressed }) => [
              styles.editButton,
              isNarrow && styles.editButtonNarrow,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={Colors.primary}
            />
            {!isNarrow ? (
              <Text style={styles.editButtonText}>Edit</Text>
            ) : null}
          </Pressable>
        </View>

        <SettingsSection
          title="Notifications"
          description="Control how TaskFlow keeps you informed."
          compact={settings.compactMode}
        >
          <ToggleRow
            icon="notifications-outline"
            title="Notifications"
            description="Allow TaskFlow to send notifications"
            value={settings.notifications}
            compact={settings.compactMode}
            onChange={(value) =>
              void updateSettingSafely("notifications", value)
            }
          />
          <ToggleRow
            icon="alarm-outline"
            title="Task reminders"
            description="Receive reminders before scheduled activities"
            value={settings.reminders}
            disabled={!settings.notifications}
            compact={settings.compactMode}
            onChange={(value) =>
              void updateSettingSafely("reminders", value)
            }
          />
          <ToggleRow
            icon="volume-high-outline"
            title="Reminder sound"
            description="Play a sound when a reminder is triggered"
            value={settings.sound}
            disabled={!settings.notifications || !settings.reminders}
            compact={settings.compactMode}
            onChange={(value) =>
              void updateSettingSafely("sound", value)
            }
          />
          <ChoiceRow
            icon="time-outline"
            title="Default reminder"
            description="When new activities should remind you"
            value={reminderLabel}
            disabled={!settings.notifications || !settings.reminders}
            compact={settings.compactMode}
            onPress={() => setReminderModal(true)}
            last
          />
        </SettingsSection>

        <SettingsSection
          title="Productivity"
          description="Choose how TaskFlow handles your daily workflow."
          compact={settings.compactMode}
        >
          <ToggleRow
            icon="arrow-forward-circle-outline"
            title="Move missed activities"
            description="Automatically carry unfinished one-time activities into today"
            value={settings.autoMoveMissed}
            compact={settings.compactMode}
            onChange={(value) =>
              void updateSettingSafely("autoMoveMissed", value)
            }
          />
          <ToggleRow
            icon="list-outline"
            title="Compact mode"
            description="Use a denser layout for task lists and activity views"
            value={settings.compactMode}
            compact={settings.compactMode}
            onChange={(value) =>
              void updateSettingSafely("compactMode", value)
            }
            last
          />
        </SettingsSection>

        <SettingsSection
          title="Appearance"
          description="Adjust how information is displayed."
          compact={settings.compactMode}
        >
          <ToggleRow
            icon="time-outline"
            title="24-hour clock"
            description={
              settings.use24HourClock
                ? "Times will appear as 14:30"
                : "Times will appear as 2:30 PM"
            }
            value={settings.use24HourClock}
            compact={settings.compactMode}
            onChange={(value) =>
              void updateSettingSafely("use24HourClock", value)
            }
            last
          />
        </SettingsSection>

        <SettingsSection
          title="Account"
          description="Manage your TaskFlow account."
          compact={settings.compactMode}
        >
          <ActionRow
            icon="person-outline"
            title="Profile"
            description={`Your display name is ${displayName}`}
            compact={settings.compactMode}
            onPress={openProfile}
          />
          <ActionRow
            icon="lock-closed-outline"
            title="Security"
            description="Reset your password and manage account security"
            compact={settings.compactMode}
            onPress={() => router.push("/security")}
          />
          <ActionRow
            icon="log-out-outline"
            title={signingOut ? "Signing out..." : "Sign out"}
            description="Sign out of your TaskFlow account"
            danger
            compact={settings.compactMode}
            onPress={() => void signOut()}
            last
          />
        </SettingsSection>

        <SettingsSection
          title="About"
          description="Information about your TaskFlow workspace."
          compact={settings.compactMode}
        >
          <ActionRow
            icon="information-circle-outline"
            title="About TaskFlow"
            description="Version 1.0.0 · Personal productivity workspace"
            compact={settings.compactMode}
            onPress={() =>
              showMessage(
                "TaskFlow",
                "Your personal productivity workspace for planning activities, managing priorities, tracking progress, and understanding your productivity.\n\nVersion 1.0.0",
              )
            }
          />
          <ActionRow
            icon="help-circle-outline"
            title="Help & support"
            description="Get help using TaskFlow"
            compact={settings.compactMode}
            onPress={() => router.push("/help")}
            last
          />
        </SettingsSection>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset all settings"
          onPress={resetAllSettings}
          disabled={resetting || saving}
          style={({ pressed }) => [
            styles.resetButton,
            isMobile && styles.resetButtonMobile,
            (resetting || saving) && styles.disabledButton,
            pressed && !(resetting || saving) && styles.pressed,
          ]}
        >
          {resetting ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={18}
              color={Colors.danger}
            />
          )}
          <Text style={styles.resetText}>
            {resetting ? "Resetting settings..." : "Reset all settings"}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons
              name="checkmark"
              size={19}
              color={Colors.textOnPrimary}
            />
          </View>
          <Text style={styles.footerTitle}>TaskFlow</Text>
          <Text style={styles.footerSubtitle}>
            Personal productivity workspace
          </Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <Modal
        visible={profileModal}
        transparent
        animationType="fade"
        onRequestClose={closeProfile}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              isMobile && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Edit profile</Text>
                <Text style={styles.modalSubtitle}>
                  Change the name TaskFlow displays for you.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close edit profile"
                onPress={closeProfile}
                disabled={profileSaving}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={21} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Display name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              style={styles.profileInput}
              autoFocus
              maxLength={50}
              editable={!profileSaving}
              returnKeyType="done"
              onSubmitEditing={() => void saveProfile()}
            />

            <View style={[styles.modalActions, isMobile && styles.modalActionsMobile]}>
              <Pressable
                onPress={closeProfile}
                disabled={profileSaving}
                style={[styles.cancelButton, isMobile && styles.modalButtonMobile]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveProfile()}
                disabled={profileSaving}
                style={[
                  styles.saveButton,
                  isMobile && styles.modalButtonMobile,
                  profileSaving && styles.disabledButton,
                ]}
              >
                {profileSaving ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.textOnPrimary}
                  />
                ) : (
                  <Text style={styles.saveButtonText}>Save changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reminderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.reminderCard,
              isMobile && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Default reminder</Text>
                <Text style={styles.modalSubtitle}>
                  Choose when TaskFlow should remind you about new activities.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close reminder options"
                onPress={() => setReminderModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={21} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.reminderOptionsScroll}
              contentContainerStyle={styles.reminderOptions}
              showsVerticalScrollIndicator={false}
            >
              {REMINDER_OPTIONS.map((option) => {
                const selected =
                  option.minutes === settings.defaultReminderMinutes;

                return (
                  <Pressable
                    key={option.minutes}
                    onPress={() => void selectReminder(option.minutes)}
                    style={[
                      styles.reminderOption,
                      selected && styles.reminderOptionSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.reminderOptionIcon,
                        selected && styles.reminderOptionIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          option.minutes === 0
                            ? "alarm-outline"
                            : "time-outline"
                        }
                        size={18}
                        color={
                          selected
                            ? Colors.primary
                            : Colors.textSecondary
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.reminderOptionText,
                        selected && styles.reminderOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.primary}
                        style={styles.reminderCheck}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingsSection({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  value,
  onChange,
  disabled = false,
  last = false,
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        compact && styles.rowCompact,
        last && styles.lastRow,
        disabled && styles.disabledRow,
      ]}
    >
      <View style={[styles.rowIcon, disabled && styles.disabledIcon]}>
        <Ionicons
          name={icon}
          size={19}
          color={disabled ? Colors.textMuted : Colors.primary}
        />
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[styles.rowTitle, disabled && styles.disabledText]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={[styles.rowDescription, disabled && styles.disabledText]}
          numberOfLines={3}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={title}
        trackColor={{
          false: Colors.borderStrong,
          true: Colors.primaryLight,
        }}
        thumbColor={
          disabled
            ? Colors.borderStrong
            : value
              ? Colors.primary
              : Colors.white
        }
      />
    </View>
  );
}

function ChoiceRow({
  icon,
  title,
  description,
  value,
  onPress,
  disabled = false,
  last = false,
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        last && styles.lastRow,
        disabled && styles.disabledRow,
        pressed && !disabled && styles.pressedRow,
      ]}
    >
      <View style={[styles.rowIcon, disabled && styles.disabledIcon]}>
        <Ionicons
          name={icon}
          size={19}
          color={disabled ? Colors.textMuted : Colors.primary}
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text
          style={[styles.rowDescription, disabled && styles.disabledText]}
          numberOfLines={3}
        >
          {description}
        </Text>
      </View>

      <View style={styles.choiceValue}>
        <Text
          style={[styles.choiceText, disabled && styles.disabledText]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={17}
          color={disabled ? Colors.textMuted : Colors.textSecondary}
        />
      </View>
    </Pressable>
  );
}

function ActionRow({
  icon,
  title,
  description,
  onPress,
  danger = false,
  last = false,
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        last && styles.lastRow,
        pressed && styles.pressedRow,
      ]}
    >
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons
          name={icon}
          size={19}
          color={danger ? Colors.danger : Colors.primary}
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        <Text style={styles.rowDescription} numberOfLines={3}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: "100%",
    maxWidth: Layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Layout.screenPaddingDesktop,
    paddingTop: Spacing[6],
    paddingBottom: Spacing[20],
  },
  contentMobile: {
    paddingHorizontal: Layout.screenPaddingMobile,
    paddingTop: Spacing[4],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    padding: Spacing[6],
  },
  loadingIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    marginTop: Spacing[3],
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  loadingText: {
    marginTop: Spacing[1],
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  loadingIndicator: {
    marginTop: Spacing[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing[6],
  },
  headerMobile: {
    marginBottom: Spacing[4],
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[3],
    ...Shadows.card,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  titleMobile: {
    fontSize: 24,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    padding: Spacing[4],
    marginBottom: Spacing[7],
    ...Shadows.card,
  },
  profileCardMobile: {
    padding: Spacing[3],
    marginBottom: Spacing[5],
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    color: Colors.textOnPrimary,
    fontSize: 21,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing[3],
    minWidth: 0,
  },
  profileLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  profileName: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  profileEmail: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textMuted,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing[3],
    paddingVertical: 9,
    borderRadius: Radii.sm,
  },
  editButtonNarrow: {
    paddingHorizontal: 10,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  section: {
    marginBottom: Spacing[6],
  },
  sectionCompact: {
    marginBottom: Spacing[5],
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  sectionDescription: {
    marginTop: 3,
    marginBottom: Spacing[2],
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  row: {
    minHeight: 77,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowCompact: {
    minHeight: 65,
    paddingVertical: 9,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledIcon: {
    backgroundColor: Colors.surfaceMuted,
  },
  dangerIcon: {
    backgroundColor: Colors.dangerLight,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  rowDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  disabledRow: {
    opacity: 0.62,
  },
  disabledText: {
    color: Colors.textMuted,
  },
  dangerText: {
    color: Colors.danger,
  },
  choiceValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 155,
  },
  choiceText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    textAlign: "right",
  },
  pressedRow: {
    backgroundColor: Colors.backgroundSoft,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  resetButton: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resetButtonMobile: {
    minHeight: 54,
  },
  resetText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.danger,
  },
  disabledButton: {
    opacity: 0.65,
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing[8],
  },
  footerLogo: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  footerTitle: {
    marginTop: Spacing[2],
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  footerSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.textMuted,
  },
  footerVersion: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[5],
  },
  modalCard: {
    width: "100%",
    maxWidth: Layout.maxModalWidth,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    padding: Spacing[6],
    ...Shadows.floating,
  },
  modalCardMobile: {
    padding: Spacing[4],
    maxHeight: "90%",
  },
  reminderCard: {
    width: "100%",
    maxWidth: Layout.maxModalWidth,
    maxHeight: "85%",
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    padding: Spacing[6],
    ...Shadows.floating,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  modalSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing[3],
  },
  inputLabel: {
    marginTop: Spacing[6],
    marginBottom: 7,
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textStrong,
  },
  profileInput: {
    height: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSoft,
    paddingHorizontal: Spacing[4],
    color: Colors.text,
    fontSize: 14,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  } as any,
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: Spacing[5],
  },
  modalActionsMobile: {
    flexDirection: "column-reverse",
  },
  modalButtonMobile: {
    width: "100%",
  },
  cancelButton: {
    minHeight: 45,
    paddingHorizontal: 17,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  saveButton: {
    minHeight: 45,
    paddingHorizontal: 18,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textOnPrimary,
  },
  reminderOptionsScroll: {
    marginTop: Spacing[5],
  },
  reminderOptions: {
    gap: Spacing[2],
    paddingBottom: Spacing[2],
  },
  reminderOption: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 11,
    backgroundColor: Colors.surface,
  },
  reminderOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  reminderOptionIcon: {
    width: 35,
    height: 35,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderOptionIconSelected: {
    backgroundColor: Colors.primaryLight,
  },
  reminderOptionText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textStrong,
  },
  reminderOptionTextSelected: {
    color: Colors.primary,
    fontWeight: "800",
  },
  reminderCheck: {
    marginLeft: 8,
  },
});
