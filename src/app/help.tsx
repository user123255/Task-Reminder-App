import React, { useMemo, useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/hooks/use-auth";

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
  surface: "#FFFFFF",

  text: "#142033",
  muted: "#687386",
  lightMuted: "#98A1AF",

  border: "#E3E6EB",

  success: "#20A464",
  successSoft: "#EAF7F0",

  danger: "#D94C4C",
};

type FAQ = {
  id: string;
  question: string;
  answer: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const FAQS: FAQ[] = [
  {
    id: "create",
    question: "How do I create a task?",
    answer:
      "Open Tasks and select Add Task. Enter the activity name, choose a life area, set the date and time, then choose priority, repetition and reminder settings before saving.",
    icon: "add-circle-outline",
  },
  {
    id: "complete",
    question: "How do I complete or reopen a task?",
    answer:
      "Tap the circle beside a task to mark it complete. Tap it again if you need to reopen the task.",
    icon: "checkmark-circle-outline",
  },
  {
    id: "reminders",
    question: "How do task reminders work?",
    answer:
      "When reminders are enabled, TaskFlow uses the reminder time you selected for the activity. You can configure reminder preferences from Settings.",
    icon: "notifications-outline",
  },
  {
    id: "overdue",
    question: "What happens when a task becomes overdue?",
    answer:
      "Overdue activities are kept visible so you can decide what to do with them. You can complete them, edit them, or move them to another date.",
    icon: "time-outline",
  },
  {
    id: "calendar",
    question: "How does the Calendar work?",
    answer:
      "Calendar gives you a date-based view of your activities. Select a date to see the tasks scheduled for that day and open an activity to edit it.",
    icon: "calendar-outline",
  },
  {
    id: "reports",
    question: "Where can I find my reports?",
    answer:
      "Open Reports from the main navigation. Your reports can summarize activity, completion, priorities and life areas over the available reporting periods.",
    icon: "bar-chart-outline",
  },
  {
    id: "library",
    question: "What is the Library?",
    answer:
      "Library is the central place for resources and saved material you want to keep accessible while managing your work and personal activities.",
    icon: "library-outline",
  },
  {
    id: "meetings",
    question: "Can I manage meetings in TaskFlow?",
    answer:
      "Yes. Meetings lets you create meeting information, schedule sessions and keep useful meeting details connected to your TaskFlow workspace.",
    icon: "people-outline",
  },
];

const QUICK_LINKS = [
  {
    title: "Tasks",
    description: "Create and organize your activities",
    icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
    route: "/tasks",
  },
  {
    title: "Calendar",
    description: "Plan your days visually",
    icon: "calendar-outline" as keyof typeof Ionicons.glyphMap,
    route: "/calendar",
  },
  {
    title: "Meetings",
    description: "Manage meetings and sessions",
    icon: "people-outline" as keyof typeof Ionicons.glyphMap,
    route: "/meetings",
  },
  {
    title: "Settings",
    description: "Customize your TaskFlow experience",
    icon: "settings-outline" as keyof typeof Ionicons.glyphMap,
    route: "/settings",
  },
];

export default function HelpScreen() {
  const { width } = useWindowDimensions();
const { session } = useAuth();

  const [search, setSearch] = useState("");
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isDesktop = width >= 900;

  const displayName =
    session?.user?.user_metadata?.display_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split("@")[0] ||
    "there";

  const filteredFAQs = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return FAQS;
    }

    return FAQS.filter(
      (item) =>
        item.question.toLowerCase().includes(value) ||
        item.answer.toLowerCase().includes(value)
    );
  }, [search]);

  const goTo = (route: string) => {
    setMenuOpen(false);
    router.push(route as never);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const openSupport = async () => {
    const email = "support@taskflow.app";

    if (Platform.OS === "web") {
      window.location.href = `mailto:${email}`;
      return;
    }

    const supported = await Linking.canOpenURL(`mailto:${email}`);

    if (supported) {
      await Linking.openURL(`mailto:${email}`);
    } else {
      Alert.alert(
        "Contact Support",
        `Please email us at ${email}.`
      );
    }
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
              <Text style={styles.brandTagline}>PLAN. FOCUS. ACHIEVE.</Text>
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
          </View>

          <View style={styles.navRight}>
            <Pressable
              style={styles.navIconButton}
              onPress={() => goTo("/settings")}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={COLORS.white}
              />
            </Pressable>

            <View style={styles.navAvatar}>
              <Text style={styles.navAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* MOBILE NAV */}
      {!isDesktop && (
        <View style={styles.mobileNav}>
          <Pressable
            style={styles.mobileNavButton}
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
            style={styles.mobileAvatar}
            onPress={() => goTo("/settings")}
          >
            <Text style={styles.mobileAvatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
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
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <View style={styles.heroText}>
              <View style={styles.sectionLabel}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionLabelText}>TASKFLOW GUIDE</Text>
                <View style={styles.sectionLine} />
              </View>

              <Text style={styles.heroTitle}>
                Everything you need,
                {"\n"}
                <Text style={styles.heroTitleAccent}>right when you need it.</Text>
              </Text>

              <Text style={styles.heroDescription}>
                Find answers, learn how TaskFlow works, and get help
                managing your activities, meetings, calendar and reports.
              </Text>

              <View style={styles.heroActions}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => goTo("/tasks")}
                >
                  <Text style={styles.primaryButtonText}>Explore TaskFlow</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.white}
                  />
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={openSupport}
                >
                  <Text style={styles.secondaryButtonText}>
                    Contact Support
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.heroPanel}>
              <View style={styles.heroPanelTop}>
                <View>
                  <Text style={styles.heroPanelLabel}>WELCOME BACK</Text>
                  <Text style={styles.heroPanelTitle}>
                    Hi, {displayName}
                  </Text>
                </View>

                <View style={styles.heroPanelIcon}>
                  <Ionicons
                    name="help-outline"
                    size={25}
                    color={COLORS.orange}
                  />
                </View>
              </View>

              <Text style={styles.heroPanelDescription}>
                Search the TaskFlow guide or browse the most common questions
                below.
              </Text>

              <View style={styles.heroSearch}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={COLORS.muted}
                />

                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="What can we help you with?"
                  placeholderTextColor={COLORS.lightMuted}
                  style={styles.heroSearchInput}
                />

                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")}>
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={COLORS.lightMuted}
                    />
                  </Pressable>
                )}
              </View>

              <View style={styles.heroPanelBottom}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={COLORS.success}
                />
                <Text style={styles.heroPanelBottomText}>
                  Your workspace, organized your way.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACCESS */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <View style={styles.headingEyebrow}>
                <View style={styles.smallOrangeLine} />
                <Text style={styles.headingEyebrowText}>QUICK ACCESS</Text>
              </View>

              <Text style={styles.sectionTitle}>
                Get where you need to go
              </Text>

              <Text style={styles.sectionDescription}>
                Jump directly into the part of TaskFlow you want to manage.
              </Text>
            </View>
          </View>

          <View style={styles.quickGrid}>
            {QUICK_LINKS.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={() => goTo(item.route)}
                style={({ pressed }) => [
                  styles.quickCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.quickIcon}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={COLORS.orange}
                  />
                </View>

                <View style={styles.quickContent}>
                  <Text style={styles.quickNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>

                  <Text style={styles.quickTitle}>{item.title}</Text>

                  <Text style={styles.quickDescription}>
                    {item.description}
                  </Text>
                </View>

                <View style={styles.quickArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.navy}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <View style={styles.faqHeading}>
            <View style={styles.headingEyebrow}>
              <View style={styles.smallOrangeLine} />
              <Text style={styles.headingEyebrowText}>
                FREQUENTLY ASKED QUESTIONS
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              How can we help?
            </Text>

            <Text style={styles.sectionDescription}>
              Find quick answers to common TaskFlow questions.
            </Text>
          </View>

          <View style={styles.faqLayout}>
            <View style={styles.faqIntroCard}>
              <View style={styles.faqLargeIcon}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={34}
                  color={COLORS.orange}
                />
              </View>

              <Text style={styles.faqIntroTitle}>
                Need a quick answer?
              </Text>

              <Text style={styles.faqIntroText}>
                Search the questions or open one of the topics to see a
                step-by-step explanation.
              </Text>

              <View style={styles.faqIntroDivider} />

              <View style={styles.faqIntroStat}>
                <Text style={styles.faqIntroStatNumber}>
                  {FAQS.length}
                </Text>

                <Text style={styles.faqIntroStatLabel}>
                  common topics covered
                </Text>
              </View>
            </View>

            <View style={styles.faqList}>
              {filteredFAQs.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons
                    name="search-outline"
                    size={30}
                    color={COLORS.lightMuted}
                  />

                  <Text style={styles.noResultsTitle}>
                    No results found
                  </Text>

                  <Text style={styles.noResultsText}>
                    Try searching with another word or phrase.
                  </Text>
                </View>
              ) : (
                filteredFAQs.map((item, index) => {
                  const isOpen = openFAQ === item.id;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.faqCard,
                        isOpen && styles.faqCardOpen,
                      ]}
                    >
                      <Pressable
                        onPress={() =>
                          setOpenFAQ(isOpen ? null : item.id)
                        }
                        style={styles.faqQuestion}
                      >
                        <View style={styles.faqQuestionLeft}>
                          <View
                            style={[
                              styles.faqIcon,
                              isOpen && styles.faqIconOpen,
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={20}
                              color={
                                isOpen
                                  ? COLORS.white
                                  : COLORS.orange
                              }
                            />
                          </View>

                          <View style={styles.faqQuestionTextWrap}>
                            <Text style={styles.faqIndex}>
                              {String(index + 1).padStart(2, "0")}
                            </Text>

                            <Text style={styles.faqQuestionText}>
                              {item.question}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.faqToggle,
                            isOpen && styles.faqToggleOpen,
                          ]}
                        >
                          <Ionicons
                            name={isOpen ? "remove" : "add"}
                            size={19}
                            color={
                              isOpen
                                ? COLORS.white
                                : COLORS.navy
                            }
                          />
                        </View>
                      </Pressable>

                      {isOpen && (
                        <View style={styles.faqAnswer}>
                          <Text style={styles.faqAnswerText}>
                            {item.answer}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* SUPPORT CTA */}
        <View style={styles.supportSection}>
          <View style={styles.supportPatternOne} />
          <View style={styles.supportPatternTwo} />

          <View style={styles.supportContent}>
            <View>
              <View style={styles.supportEyebrow}>
                <View style={styles.supportLine} />
                <Text style={styles.supportEyebrowText}>
                  STILL NEED HELP?
                </Text>
              </View>

              <Text style={styles.supportTitle}>
                We are here to help.
              </Text>

              <Text style={styles.supportText}>
                If you cannot find what you are looking for, reach out to
                the TaskFlow support team.
              </Text>
            </View>

            <Pressable
              style={styles.supportButton}
              onPress={openSupport}
            >
              <Ionicons
                name="mail-outline"
                size={19}
                color={COLORS.navy}
              />
              <Text style={styles.supportButtonText}>
                Contact Support
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <View style={styles.footerMark}>
              <View style={styles.footerMarkInner} />
            </View>

            <View>
              <Text style={styles.footerBrandName}>TaskFlow</Text>
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
        styles.navItem,
        pressed && styles.navItemPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={COLORS.white}
      />
      <Text style={styles.navItemText}>{label}</Text>
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
      <Text style={styles.drawerItemText}>{label}</Text>
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
    paddingHorizontal: 34,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    width: 210,
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
    letterSpacing: -0.4,
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
    gap: 5,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 7,
    gap: 6,
  },

  navItemPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  navItemText: {
    color: "#E8EDF4",
    fontSize: 13,
    fontWeight: "600",
  },

  navRight: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },

  navIconButton: {
    width: 37,
    height: 37,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },

  navAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  navAvatarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },

  mobileNav: {
    height: 66,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
  },

  mobileNavButton: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  mobileBrandMark: {
    width: 28,
    height: 28,
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

  mobileAvatar: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileAvatarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },

  mobileDrawer: {
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  drawerItem: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 3,
  },

  drawerItemPressed: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  drawerItemText: {
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
    backgroundColor: COLORS.navy,
    minHeight: 455,
    position: "relative",
    overflow: "hidden",
  },

  heroOverlay: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: 240,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    right: -180,
    top: -160,
  },

  heroContent: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 55,
  },

  heroText: {
    flex: 1,
    maxWidth: 650,
  },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 20,
  },

  sectionLine: {
    width: 27,
    height: 2,
    backgroundColor: COLORS.gold,
  },

  sectionLabelText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.7,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 47,
    lineHeight: 55,
    fontWeight: "800",
    letterSpacing: -1.5,
  },

  heroTitleAccent: {
    color: COLORS.orange,
  },

  heroDescription: {
    color: "#C4CEDB",
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 570,
    marginTop: 18,
  },

  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },

  primaryButton: {
    backgroundColor: COLORS.orange,
    minHeight: 47,
    paddingHorizontal: 21,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  secondaryButton: {
    minHeight: 47,
    paddingHorizontal: 21,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  heroPanel: {
    width: 365,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  heroPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroPanelLabel: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  heroPanelTitle: {
    color: COLORS.navy,
    fontSize: 23,
    fontWeight: "800",
  },

  heroPanelIcon: {
    width: 47,
    height: 47,
    borderRadius: 10,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  heroPanelDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },

  heroSearch: {
    height: 49,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    marginTop: 20,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFC",
  },

  heroSearchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 9,
    outlineStyle: "none",
  } as any,

  heroPanelBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
    gap: 7,
  },

  heroPanelBottomText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  section: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 65,
  },

  sectionHeading: {
    marginBottom: 27,
  },

  headingEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  smallOrangeLine: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.orange,
  },

  headingEyebrowText: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  sectionDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  quickCard: {
    width: "calc(50% - 7px)" as any,
    minHeight: 130,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 7,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  pressed: {
    opacity: 0.86,
  },

  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 17,
  },

  quickContent: {
    flex: 1,
  },

  quickNumber: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },

  quickTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "800",
  },

  quickDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  quickArrow: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  faqSection: {
    backgroundColor: "#ECEEF1",
    paddingHorizontal: 28,
    paddingVertical: 65,
  },

  faqHeading: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    marginBottom: 30,
  },

  faqLayout: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 25,
  },

  faqIntroCard: {
    width: 295,
    backgroundColor: COLORS.navy,
    borderRadius: 8,
    padding: 27,
  },

  faqLargeIcon: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  faqIntroTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "800",
  },

  faqIntroText: {
    color: "#BAC6D4",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },

  faqIntroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.13)",
    marginVertical: 22,
  },

  faqIntroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  faqIntroStatNumber: {
    color: COLORS.orange,
    fontSize: 27,
    fontWeight: "900",
  },

  faqIntroStatLabel: {
    color: "#C4CEDA",
    fontSize: 11,
    flex: 1,
  },

  faqList: {
    flex: 1,
    gap: 9,
  },

  faqCard: {
    backgroundColor: COLORS.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

  faqCardOpen: {
    borderColor: "#F4B178",
  },

  faqQuestion: {
    minHeight: 73,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  faqQuestionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  faqIcon: {
    width: 41,
    height: 41,
    borderRadius: 7,
    backgroundColor: COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  faqIconOpen: {
    backgroundColor: COLORS.orange,
  },

  faqQuestionTextWrap: {
    flex: 1,
  },

  faqIndex: {
    color: COLORS.lightMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },

  faqQuestionText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "750" as any,
  },

  faqToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  faqToggleOpen: {
    backgroundColor: COLORS.navy,
  },

  faqAnswer: {
    paddingHorizontal: 69,
    paddingBottom: 18,
    paddingTop: 0,
  },

  faqAnswerText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
  },

  noResults: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 45,
    alignItems: "center",
    justifyContent: "center",
  },

  noResultsTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 10,
  },

  noResultsText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },

  supportSection: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 28,
    paddingVertical: 45,
    position: "relative",
    overflow: "hidden",
  },

  supportPatternOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    right: -100,
    top: -110,
  },

  supportPatternTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.16)",
    left: -70,
    bottom: -90,
  },

  supportContent: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 30,
  },

  supportEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  supportLine: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.gold,
  },

  supportEyebrowText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  supportTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: "800",
  },

  supportText: {
    color: "#BFC9D7",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 600,
  },

  supportButton: {
    backgroundColor: COLORS.orange,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  supportButtonText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "900",
  },

  footer: {
    backgroundColor: COLORS.navyDark,
    minHeight: 95,
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
