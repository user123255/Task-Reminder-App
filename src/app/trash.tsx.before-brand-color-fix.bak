import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  emptyTrash,
  fetchTrashedActivities,
  permanentlyDeleteActivity,
  restoreActivity,
  type Activity,
} from "@/services/activities";

const COLORS = {
  navy: "#0B1F3A",
  navyDark: "#07162A",
  navySoft: "#132C4D",

  orange: "#FF7A00",
  orangeDark: "#E96800",
  orangeSoft: "#FFF1E5",

  gold: "#DFAE45",
  goldSoft: "#FFF8E8",

  white: "#FFFFFF",
  background: "#F4F5F7",

  text: "#142033",
  muted: "#687386",
  lightMuted: "#98A1AF",

  border: "#E3E6EB",

  success: "#20A464",
  successSoft: "#EAF7F0",

  danger: "#D94C4C",
  dangerSoft: "#FFF0F0",
};

export default function TrashScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);

      const result = await fetchTrashedActivities();

      setActivities(result ?? []);
    } catch (error) {
      console.error("Failed to load trash:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrash();
    }, [loadTrash])
  );

  const goTo = (route: string) => {
    setMenuOpen(false);
    router.push(route as never);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/tasks");
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "No date";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (value?: string | null) => {
    if (!value) return "";

    const [hourString, minuteString] = value.split(":");

    const hour = Number(hourString);
    const minute = Number(minuteString);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return value;
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const getCategoryName = (activity: Activity) => {
    return activity.category || "Other";
  };

  const getCategoryColor = (activity: Activity) => {
    switch (getCategoryName(activity).toLowerCase()) {
      case "work":
        return COLORS.orange;
      case "personal":
        return COLORS.gold;
      case "health":
        return COLORS.success;
      case "shopping":
        return COLORS.danger;
      default:
        return COLORS.navySoft;
    }
  };

  const getActivityDate = (activity: Activity) => {
    return activity.scheduled_date || null;
  };

  const getActivityTime = (activity: Activity) => {
    return activity.scheduled_time || null;
  };

  const getActivityId = (activity: Activity) => {
    return String(activity.id);
  };

  const handleRestore = async (activity: Activity) => {
    const id = getActivityId(activity);

    try {
      setProcessingId(id);

      await restoreActivity(id);

      setActivities((current) =>
        current.filter((item) => getActivityId(item) !== id)
      );
    } catch (error) {
      console.error("Failed to restore activity:", error);

      if (Platform.OS === "web") {
        window.alert("Unable to restore this activity.");
      } else {
        Alert.alert(
          "Restore failed",
          "Unable to restore this activity right now."
        );
      }
    } finally {
      setProcessingId(null);
    }
  };

  const confirmPermanentDelete = (activity: Activity) => {
    const id = getActivityId(activity);

    const performDelete = async () => {
      try {
        setProcessingId(id);

        await permanentlyDeleteActivity(id);

        setActivities((current) =>
          current.filter((item) => getActivityId(item) !== id)
        );
      } catch (error) {
        console.error("Failed to permanently delete:", error);

        if (Platform.OS === "web") {
          window.alert("Unable to permanently delete this activity.");
        } else {
          Alert.alert(
            "Delete failed",
            "Unable to permanently delete this activity."
          );
        }
      } finally {
        setProcessingId(null);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Permanently delete "${activity.title}"?\n\nThis action cannot be undone.`
      );

      if (confirmed) {
        performDelete();
      }

      return;
    }

    Alert.alert(
      "Delete permanently?",
      `"${activity.title}" will be permanently removed. This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: performDelete,
        },
      ]
    );
  };

  const confirmEmptyTrash = () => {
    if (activities.length === 0) return;

    const performEmpty = async () => {
      try {
        setLoading(true);

        await emptyTrash();

        setActivities([]);
      } catch (error) {
        console.error("Failed to empty trash:", error);

        if (Platform.OS === "web") {
          window.alert("Unable to empty Trash.");
        } else {
          Alert.alert(
            "Unable to empty Trash",
            "Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Permanently delete everything in Trash?\n\nThis action cannot be undone."
      );

      if (confirmed) {
        performEmpty();
      }

      return;
    }

    Alert.alert(
      "Empty Trash?",
      "Every deleted activity will be permanently removed. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Empty Trash",
          style: "destructive",
          onPress: performEmpty,
        },
      ]
    );
  };

  return (
    <View style={styles.page}>
      {/* DESKTOP NAVIGATION */}
      {isDesktop && (
        <View style={styles.desktopNav}>
          <View style={styles.brandBlock}>
            <View style={styles.brandMark}>
              <View style={styles.brandMarkInner} />
            </View>

            <View>
              <Text style={styles.brandName}>TaskFlow</Text>
              <Text style={styles.brandTagline}>
                PLAN. FOCUS. ACHIEVE.
              </Text>
            </View>
          </View>

          <View style={styles.navLinks}>
            <NavItem
              label="Home"
              icon="home-outline"
              onPress={() => goTo("/")}
            />

            <NavItem
              label="Tasks"
              icon="checkmark-circle-outline"
              onPress={() => goTo("/tasks")}
            />

            <NavItem
              label="Calendar"
              icon="calendar-outline"
              onPress={() => goTo("/calendar")}
            />

            <NavItem
              label="Library"
              icon="library-outline"
              onPress={() => goTo("/library")}
            />

            <NavItem
              label="Reports"
              icon="bar-chart-outline"
              onPress={() => goTo("/reports")}
            />

            <NavItem
              label="AI"
              icon="sparkles-outline"
              onPress={() => goTo("/ai-assist")}
            />

            <NavItem
              label="Meetings"
              icon="people-outline"
              onPress={() => goTo("/meetings")}
            />

            <NavItem
              label="Trash"
              icon="trash-outline"
              active
              onPress={() => {}}
            />
          </View>

          <Pressable
            style={styles.navSettings}
            onPress={() => goTo("/settings")}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={COLORS.white}
            />
          </Pressable>
        </View>
      )}

      {/* MOBILE NAVIGATION */}
      {!isDesktop && (
        <View style={styles.mobileNav}>
          <Pressable
            style={styles.mobileMenuButton}
            onPress={() => setMenuOpen((value) => !value)}
          >
            <Ionicons
              name={menuOpen ? "close" : "menu"}
              size={25}
              color={COLORS.white}
            />
          </Pressable>

          <View style={styles.mobileBrand}>
            <View style={styles.mobileBrandMark}>
              <View style={styles.brandMarkInner} />
            </View>

            <Text style={styles.mobileBrandName}>TaskFlow</Text>
          </View>

          <Pressable
            style={styles.mobileTrashButton}
            onPress={() => {}}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={COLORS.orange}
            />
          </Pressable>
        </View>
      )}

      {/* MOBILE DRAWER */}
      {!isDesktop && menuOpen && (
        <View style={styles.mobileDrawer}>
          <DrawerItem
            label="Home"
            icon="home-outline"
            onPress={() => goTo("/")}
          />

          <DrawerItem
            label="Tasks"
            icon="checkmark-circle-outline"
            onPress={() => goTo("/tasks")}
          />

          <DrawerItem
            label="Calendar"
            icon="calendar-outline"
            onPress={() => goTo("/calendar")}
          />

          <DrawerItem
            label="Library"
            icon="library-outline"
            onPress={() => goTo("/library")}
          />

          <DrawerItem
            label="Reports"
            icon="bar-chart-outline"
            onPress={() => goTo("/reports")}
          />

          <DrawerItem
            label="AI Assist"
            icon="sparkles-outline"
            onPress={() => goTo("/ai-assist")}
          />

          <DrawerItem
            label="Meetings"
            icon="people-outline"
            onPress={() => goTo("/meetings")}
          />

          <DrawerItem
            label="Settings"
            icon="settings-outline"
            onPress={() => goTo("/settings")}
          />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PAGE HERO */}
        <View style={styles.hero}>
          <View style={styles.heroCircleOne} />
          <View style={styles.heroCircleTwo} />

          <View style={styles.heroInner}>
            <View style={styles.heroText}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrowText}>
                  YOUR RECENTLY DELETED ACTIVITIES
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                Trash
              </Text>

              <Text style={styles.heroDescription}>
                Activities you delete are kept here so you can restore
                them when needed or permanently remove them.
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="trash-outline"
                size={42}
                color={COLORS.orange}
              />
            </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          {/* HEADER CARD */}
          <View style={styles.contentHeader}>
            <View>
              <View style={styles.contentEyebrow}>
                <View style={styles.orangeLine} />
                <Text style={styles.contentEyebrowText}>
                  TRASH
                </Text>
              </View>

              <Text style={styles.contentTitle}>
                Deleted activities
              </Text>

              <Text style={styles.contentDescription}>
                {activities.length === 0
                  ? "Your Trash is currently empty."
                  : `${activities.length} ${
                      activities.length === 1
                        ? "activity"
                        : "activities"
                    } currently in Trash.`}
              </Text>
            </View>

            {activities.length > 0 && (
              <Pressable
                style={styles.emptyTrashButton}
                onPress={confirmEmptyTrash}
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={COLORS.danger}
                />

                <Text style={styles.emptyTrashText}>
                  Empty Trash
                </Text>
              </Pressable>
            )}
          </View>

          {/* LOADING */}
          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator
                size="large"
                color={COLORS.orange}
              />

              <Text style={styles.stateTitle}>
                Loading Trash
              </Text>

              <Text style={styles.stateText}>
                Getting your deleted activities...
              </Text>
            </View>
          ) : activities.length === 0 ? (
            /* EMPTY STATE */
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="trash-outline"
                  size={38}
                  color={COLORS.orange}
                />
              </View>

              <View style={styles.emptyAccent} />

              <Text style={styles.emptyTitle}>
                Your Trash is empty
              </Text>

              <Text style={styles.emptyText}>
                Deleted activities will appear here. You can restore
                them or permanently remove them from this page.
              </Text>

              <Pressable
                style={styles.backButton}
                onPress={() => goTo("/tasks")}
              >
                <Ionicons
                  name="arrow-back"
                  size={17}
                  color={COLORS.white}
                />

                <Text style={styles.backButtonText}>
                  Back to Tasks
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {activities.map((activity, index) => {
                const id = getActivityId(activity);
                const processing = processingId === id;

                const category = getCategoryName(activity);
                const categoryColor = getCategoryColor(activity);
                const date = getActivityDate(activity);
                const time = getActivityTime(activity);

                return (
                  <View
                    key={id}
                    style={styles.activityCard}
                  >
                    <View style={styles.activityNumber}>
                      <Text style={styles.activityNumberText}>
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.categoryIcon,
                        {
                          backgroundColor:
                            `${categoryColor}18`,
                        },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={21}
                        color={categoryColor}
                      />
                    </View>

                    <View style={styles.activityInfo}>
                      <Text
                        style={styles.activityTitle}
                        numberOfLines={2}
                      >
                        {activity.title}
                      </Text>

                      <View style={styles.activityMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons
                            name="pricetag-outline"
                            size={13}
                            color={COLORS.muted}
                          />

                          <Text style={styles.metaText}>
                            {category}
                          </Text>
                        </View>

                        {date && (
                          <View style={styles.metaItem}>
                            <Ionicons
                              name="calendar-outline"
                              size={13}
                              color={COLORS.muted}
                            />

                            <Text style={styles.metaText}>
                              {formatDate(date)}
                            </Text>
                          </View>
                        )}

                        {time && (
                          <View style={styles.metaItem}>
                            <Ionicons
                              name="time-outline"
                              size={13}
                              color={COLORS.muted}
                            />

                            <Text style={styles.metaText}>
                              {formatTime(time)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        style={styles.restoreButton}
                        onPress={() => handleRestore(activity)}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.success}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="refresh-outline"
                              size={17}
                              color={COLORS.success}
                            />

                            <Text style={styles.restoreText}>
                              Restore
                            </Text>
                          </>
                        )}
                      </Pressable>

                      <Pressable
                        style={styles.deleteButton}
                        onPress={() =>
                          confirmPermanentDelete(activity)
                        }
                        disabled={processing}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={COLORS.danger}
                        />

                        <Text style={styles.deleteText}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* INFORMATION */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                About Trash
              </Text>

              <Text style={styles.infoText}>
                Restore an activity if you still need it. Permanently
                deleted activities cannot be recovered.
              </Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <View style={styles.footerMark}>
              <View style={styles.footerMarkInner} />
            </View>

            <View>
              <Text style={styles.footerBrandName}>
                TaskFlow
              </Text>

              <Text style={styles.footerTagline}>
                PLAN. FOCUS. ACHIEVE.
              </Text>
            </View>
          </View>

          <Text style={styles.footerText}>
            © 2026 TaskFlow. Built to help you stay organized.
          </Text>

          <Text style={styles.footerVersion}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        active && styles.navItemActive,
        pressed && styles.navItemPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? COLORS.orange : COLORS.white}
      />

      <Text
        style={[
          styles.navItemText,
          active && styles.navItemTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DrawerItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        pressed && styles.drawerItemPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={21}
        color={COLORS.orange}
      />

      <Text style={styles.drawerText}>
        {label}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={17}
        color="#8490A0"
        style={styles.drawerArrow}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  desktopNav: {
    height: 78,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  brandBlock: {
    width: 205,
    flexDirection: "row",
    alignItems: "center",
  },

  brandMark: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    transform: [{ rotate: "45deg" }],
  },

  brandMarkInner: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },

  brandName: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },

  brandTagline: {
    color: "#AAB7C8",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 2,
  },

  navLinks: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 6,
    gap: 6,
  },

  navItemActive: {
    backgroundColor: "rgba(255,122,0,0.14)",
  },

  navItemPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  navItemText: {
    color: "#E5EBF3",
    fontSize: 12,
    fontWeight: "600",
  },

  navItemTextActive: {
    color: COLORS.orange,
    fontWeight: "800",
  },

  navSettings: {
    width: 39,
    height: 39,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },

  mobileNav: {
    height: 66,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
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
    borderRadius: 8,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    transform: [{ rotate: "45deg" }],
  },

  mobileBrandName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },

  mobileTrashButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  mobileDrawer: {
    backgroundColor: COLORS.navyDark,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  drawerItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 7,
  },

  drawerItemPressed: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  drawerText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 12,
  },

  drawerArrow: {
    marginLeft: "auto",
  },

  scrollContent: {
    paddingBottom: 0,
  },

  hero: {
    minHeight: 300,
    backgroundColor: COLORS.navy,
    position: "relative",
    overflow: "hidden",
  },

  heroCircleOne: {
    position: "absolute",
    width: 370,
    height: 370,
    borderRadius: 185,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    right: -150,
    top: -170,
  },

  heroCircleTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.13)",
    right: 40,
    bottom: -145,
  },

  heroInner: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 30,
  },

  heroText: {
    flex: 1,
  },

  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },

  eyebrowLine: {
    width: 27,
    height: 2,
    backgroundColor: COLORS.gold,
  },

  eyebrowText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: "800",
    letterSpacing: -1,
  },

  heroDescription: {
    color: "#C1CCD9",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 620,
    marginTop: 12,
  },

  heroIcon: {
    width: 105,
    height: 105,
    borderRadius: 12,
    backgroundColor: "rgba(255,122,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  content: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 55,
  },

  contentHeader: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 18,
  },

  contentEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
  },

  orangeLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.orange,
  },

  contentEyebrowText: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  contentTitle: {
    color: COLORS.navy,
    fontSize: 27,
    fontWeight: "800",
  },

  contentDescription: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },

  emptyTrashButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F1C7C7",
    backgroundColor: COLORS.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyTrashText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
  },

  stateCard: {
    minHeight: 300,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  stateTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },

  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },

  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 390,
    alignItems: "center",
    justifyContent: "center",
    padding: 35,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyAccent: {
    width: 35,
    height: 2,
    backgroundColor: COLORS.gold,
    marginTop: 19,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 520,
    marginTop: 8,
  },

  backButton: {
    minHeight: 45,
    paddingHorizontal: 20,
    backgroundColor: COLORS.navy,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 23,
  },

  backButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  list: {
    gap: 10,
  },

  activityCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
  },

  activityNumber: {
    width: 33,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  activityNumberText: {
    color: COLORS.lightMuted,
    fontSize: 10,
    fontWeight: "900",
  },

  categoryIcon: {
    width: 47,
    height: 47,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  activityInfo: {
    flex: 1,
    minWidth: 0,
  },

  activityTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "800",
  },

  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 7,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    color: COLORS.muted,
    fontSize: 11,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 15,
  },

  restoreButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.successSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  restoreText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
  },

  deleteButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  deleteText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  infoCard: {
    marginTop: 18,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: "#F0DCA7",
    borderRadius: 8,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "800",
  },

  infoText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 3,
  },

  footer: {
    minHeight: 95,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 28,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  footerMark: {
    width: 29,
    height: 29,
    borderRadius: 8,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    transform: [{ rotate: "45deg" }],
  },

  footerMarkInner: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },

  footerBrandName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  footerTagline: {
    color: "#7F8EA1",
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  footerText: {
    color: "#8490A0",
    fontSize: 11,
    textAlign: "center",
  },

  footerVersion: {
    color: "#657386",
    fontSize: 10,
    fontWeight: "600",
  },
});