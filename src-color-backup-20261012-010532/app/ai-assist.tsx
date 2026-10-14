import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/hooks/use-auth";
import { fetchActivities, type Activity } from "@/services/activities";

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

  warning: "#B7791F",
  warningSoft: "#FFF7E5",

  danger: "#C94A4A",
  dangerSoft: "#FCECEC",

  purple: "#7257A8",
  purpleSoft: "#F1EEFF",

  soft: "#F7F8FA",
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const STARTER_PROMPTS = [
  "Plan my day",
  "What should I focus on next?",
  "Summarize my tasks",
  "Help me with overdue tasks",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text:
      "Hi! I’m TaskFlow AI Assist. I can help you think through your tasks, priorities, schedule, and productivity workflow.",
  },
];

function localAssistantReply(
  prompt: string,
  activities: Activity[],
) {
  const normalized = prompt.toLowerCase();

  const incomplete = activities.filter(
    (item) => !item.completed,
  );

  const overdue = incomplete.filter((item) => {
    const time = item.scheduled_time || "00:00";
    const date = new Date(
      `${item.scheduled_date}T${time}`,
    );

    return (
      !Number.isNaN(date.getTime()) &&
      date.getTime() < Date.now()
    );
  });

  if (normalized.includes("overdue")) {
    if (overdue.length === 0) {
      return "You currently have no overdue tasks. Your schedule is clear from a missed-task perspective.";
    }

    const names = overdue
      .slice(0, 3)
      .map((item) => `“${item.title}”`)
      .join(", ");

    return `You have ${overdue.length} overdue ${
      overdue.length === 1 ? "task" : "tasks"
    }. Start by reviewing ${names}${
      overdue.length > 3
        ? " and the remaining overdue items"
        : ""
    }.`;
  }

  if (
    normalized.includes("summarize") ||
    normalized.includes("summary")
  ) {
    const completed = activities.filter(
      (item) => item.completed,
    ).length;

    return `You have ${activities.length} total tasks, ${completed} completed, and ${incomplete.length} still open. I can help you break the open work into priorities and a realistic schedule.`;
  }

  if (
    normalized.includes("focus") ||
    normalized.includes("next")
  ) {
    const next = incomplete
      .slice()
      .sort((a, b) =>
        `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(
          `${b.scheduled_date} ${b.scheduled_time}`,
        ),
      )[0];

    return next
      ? `A useful next step is “${next.title}”. It is scheduled for ${
          next.scheduled_date
        } at ${
          next.scheduled_time ||
          "an unscheduled time"
        }.`
      : "You do not have any open tasks right now. This is a good moment to review your goals or prepare tomorrow’s plan.";
  }

  if (
    normalized.includes("plan") ||
    normalized.includes("day")
  ) {
    return "Start with one important task, protect a focused block of time for it, then group lighter tasks together. Keep reminders on for anything tied to a specific time and leave some room for unexpected work.";
  }

  return "I’m ready to help with planning, prioritization, overdue work, task summaries, and productivity routines. Try one of the quick prompts below.";
}

const NAV_ITEMS = [
  {
    label: "Home",
    icon: "home-outline",
    route: "/",
  },
  {
    label: "Tasks",
    icon: "checkmark-circle-outline",
    route: "/tasks",
  },
  {
    label: "Calendar",
    icon: "calendar-outline",
    route: "/calendar",
  },
  {
    label: "Library",
    icon: "library-outline",
    route: "/library",
  },
  {
    label: "Reports",
    icon: "bar-chart-outline",
    route: "/reports",
  },
  {
    label: "AI Assist",
    icon: "sparkles-outline",
    route: "/ai-assist",
  },
  {
    label: "Meetings",
    icon: "videocam-outline",
    route: "/meetings",
  },
  {
    label: "Trash",
    icon: "trash-outline",
    route: "/trash",
  },
  {
    label: "Help",
    icon: "help-circle-outline",
    route: "/help",
  },
  {
    label: "Settings",
    icon: "settings-outline",
    route: "/settings",
  },
] as const;

export default function AIAssistScreen() {
  const { width } = useWindowDimensions();
  const { displayName } = useAuth();

  const [messages, setMessages] =
    useState<ChatMessage[]>(INITIAL_MESSAGES);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingContext, setLoadingContext] =
    useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isDesktop = width >= 1000;
  const isMobile = width < 700;

  const taskSummary = useMemo(() => {
    const total = activities.length;

    const completed = activities.filter(
      (item) => item.completed,
    ).length;

    const open = total - completed;

    return {
      total,
      completed,
      open,
    };
  }, [activities]);

  React.useEffect(() => {
    let mounted = true;

    const loadContext = async () => {
      try {
        const data = await fetchActivities();

        if (mounted) {
          setActivities(data);
        }
      } catch (error) {
        console.warn(
          "AI Assist context could not be loaded:",
          error,
        );
      } finally {
        if (mounted) {
          setLoadingContext(false);
        }
      }
    };

    void loadContext();

    return () => {
      mounted = false;
    };
  }, []);

  const goTo = (route: string) => {
    setDrawerOpen(false);
    router.push(route as never);
  };

  const sendMessage = async (
    value = draft,
  ) => {
    const text = value.trim();

    if (!text || sending) {
      return;
    }

    setDraft("");

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text,
      },
    ]);

    setSending(true);

    try {
      const reply = localAssistantReply(
        text,
        activities,
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 450),
      );

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: reply,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.container}>
        <View style={styles.main}>
          <TopNavigation
            isDesktop={isDesktop}
            displayName={displayName}
            onMenu={() => setDrawerOpen(true)}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.page,
              isDesktop && styles.pageDesktop,
            ]}
          >
            {/* HERO */}
            <View
              style={[
                styles.hero,
                isMobile && styles.heroMobile,
              ]}
            >
              <View style={styles.heroDecorOne} />
              <View style={styles.heroDecorTwo} />

              <View style={styles.heroContent}>
                <View style={styles.eyebrowRow}>
                  <View style={styles.eyebrowLine} />

                  <Text style={styles.eyebrow}>
                    PRODUCTIVITY COMPANION
                  </Text>
                </View>

                <Text
                  style={[
                    styles.heroTitle,
                    isMobile &&
                      styles.heroTitleMobile,
                  ]}
                >
                  AI Assist
                </Text>

                <Text
                  style={[
                    styles.heroSubtitle,
                    isMobile &&
                      styles.heroSubtitleMobile,
                  ]}
                >
                  Think clearly. Prioritize what
                  matters. Turn your plans into
                  practical next steps.
                </Text>

                <View style={styles.heroBottom}>
                  <View style={styles.readyBadge}>
                    <View
                      style={styles.readyDot}
                    />

                    <Text
                      style={styles.readyText}
                    >
                      AI READY
                    </Text>
                  </View>

                  <Text style={styles.heroContext}>
                    Connected to your TaskFlow
                    workspace
                  </Text>
                </View>
              </View>

              <View style={styles.heroSymbol}>
                <Ionicons
                  name="sparkles"
                  size={56}
                  color={COLORS.orange}
                />
              </View>
            </View>

            {/* CONTENT */}
            <View
              style={[
                styles.layout,
                isDesktop &&
                  styles.layoutDesktop,
              ]}
            >
              {/* CHAT */}
              <View
                style={[
                  styles.chatColumn,
                  isDesktop &&
                    styles.chatColumnDesktop,
                ]}
              >
                <View style={styles.chatCard}>
                  <View style={styles.chatHeader}>
                    <View style={styles.chatIdentity}>
                      <View style={styles.aiAvatar}>
                        <Ionicons
                          name="sparkles"
                          size={18}
                          color={
                            COLORS.orange
                          }
                        />
                      </View>

                      <View>
                        <Text
                          style={styles.chatTitle}
                        >
                          TaskFlow AI
                        </Text>

                        <View
                          style={
                            styles.onlineRow
                          }
                        >
                          <View
                            style={
                              styles.onlineDot
                            }
                          />

                          <Text
                            style={
                              styles.chatSubtitle
                            }
                          >
                            Productivity
                            companion
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.chatStatus}>
                      {loadingContext ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.orange
                          }
                        />
                      ) : (
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={
                            COLORS.success
                          }
                        />
                      )}
                    </View>
                  </View>

                  <ScrollView
                    style={
                      styles.messagesScroll
                    }
                    contentContainerStyle={
                      styles.messagesArea
                    }
                    showsVerticalScrollIndicator={
                      false
                    }
                    keyboardShouldPersistTaps="handled"
                  >
                    {messages.map(
                      (message) => (
                        <View
                          key={message.id}
                          style={[
                            styles.messageRow,
                            message.role ===
                              "user" &&
                              styles.messageRowUser,
                          ]}
                        >
                          {message.role ===
                            "assistant" && (
                            <View
                              style={
                                styles.messageAvatar
                              }
                            >
                              <Ionicons
                                name="sparkles"
                                size={12}
                                color={
                                  COLORS.orange
                                }
                              />
                            </View>
                          )}

                          <View
                            style={[
                              styles.messageBubble,
                              message.role ===
                                "user"
                                ? styles.userBubble
                                : styles.assistantBubble,
                            ]}
                          >
                            <Text
                              style={[
                                styles.messageText,
                                message.role ===
                                  "user" &&
                                  styles.userMessageText,
                              ]}
                            >
                              {message.text}
                            </Text>
                          </View>
                        </View>
                      ),
                    )}

                    {sending && (
                      <View
                        style={styles.messageRow}
                      >
                        <View
                          style={
                            styles.messageAvatar
                          }
                        >
                          <Ionicons
                            name="sparkles"
                            size={12}
                            color={
                              COLORS.orange
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.typingBubble
                          }
                        >
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.orange
                            }
                          />

                          <Text
                            style={
                              styles.typingText
                            }
                          >
                            Thinking...
                          </Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>

                  {/* QUICK PROMPTS */}
                  <View
                    style={
                      styles.promptSection
                    }
                  >
                    <View
                      style={
                        styles.promptHeader
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.promptLabel
                          }
                        >
                          QUICK PROMPTS
                        </Text>

                        <Text
                          style={
                            styles.promptHint
                          }
                        >
                          Start with a question
                        </Text>
                      </View>

                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={
                          COLORS.lightMuted
                        }
                      />
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.promptList
                      }
                    >
                      {STARTER_PROMPTS.map(
                        (prompt) => (
                          <Pressable
                            key={prompt}
                            onPress={() =>
                              void sendMessage(
                                prompt,
                              )
                            }
                            disabled={sending}
                            style={({
                              pressed,
                            }) => [
                              styles.promptChip,
                              pressed &&
                                styles.pressed,
                              sending &&
                                styles.promptDisabled,
                            ]}
                          >
                            <View
                              style={
                                styles.promptIcon
                              }
                            >
                              <Ionicons
                                name="sparkles-outline"
                                size={13}
                                color={
                                  COLORS.orange
                                }
                              />
                            </View>

                            <Text
                              style={
                                styles.promptText
                              }
                            >
                              {prompt}
                            </Text>
                          </Pressable>
                        ),
                      )}
                    </ScrollView>
                  </View>

                  {/* COMPOSER */}
                  <View
                    style={styles.composer}
                  >
                    <View
                      style={
                        styles.inputShell
                      }
                    >
                      <TextInput
                        value={draft}
                        onChangeText={
                          setDraft
                        }
                        placeholder="Ask TaskFlow AI anything..."
                        placeholderTextColor={
                          COLORS.lightMuted
                        }
                        style={
                          styles.composerInput
                        }
                        multiline
                        maxLength={1000}
                        editable={!sending}
                      />

                      <Text
                        style={
                          styles.characterCount
                        }
                      >
                        {draft.length}/1000
                      </Text>
                    </View>

                    <Pressable
                      onPress={() =>
                        void sendMessage()
                      }
                      disabled={
                        !draft.trim() ||
                        sending
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.sendButton,
                        (!draft.trim() ||
                          sending) &&
                          styles.sendButtonDisabled,
                        pressed &&
                          draft.trim() &&
                          !sending &&
                          styles.pressed,
                      ]}
                    >
                      {sending ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      ) : (
                        <Ionicons
                          name="arrow-up"
                          size={19}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* RIGHT PANEL */}
              <View
                style={[
                  styles.sideColumn,
                  isDesktop &&
                    styles.sideColumnDesktop,
                ]}
              >
                <View
                  style={styles.contextCard}
                >
                  <View
                    style={
                      styles.sectionEyebrow
                    }
                  >
                    <Text
                      style={
                        styles.sectionEyebrowText
                      }
                    >
                      WORKSPACE
                    </Text>
                  </View>

                  <View
                    style={
                      styles.contextHeading
                    }
                  >
                    <View
                      style={
                        styles.contextIcon
                      }
                    >
                      <Ionicons
                        name="analytics-outline"
                        size={19}
                        color={
                          COLORS.orange
                        }
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.contextTitle
                        }
                      >
                        Your task context
                      </Text>

                      <Text
                        style={
                          styles.contextSubtitle
                        }
                      >
                        Live workspace overview
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.metricsGrid
                    }
                  >
                    <Metric
                      label="TOTAL"
                      value={
                        taskSummary.total
                      }
                    />

                    <Metric
                      label="OPEN"
                      value={
                        taskSummary.open
                      }
                    />

                    <Metric
                      label="DONE"
                      value={
                        taskSummary.completed
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.contextDivider
                    }
                  />

                  <Pressable
                    onPress={() =>
                      router.push(
                        "/tasks" as never,
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.contextAction,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.contextActionText
                      }
                    >
                      REVIEW YOUR TASKS
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={
                        COLORS.orange
                      }
                    />
                  </Pressable>
                </View>

                <View
                  style={styles.tipsCard}
                >
                  <View
                    style={
                      styles.cardEyebrowRow
                    }
                  >
                    <View
                      style={
                        styles.goldLine
                      }
                    />

                    <Text
                      style={
                        styles.cardEyebrow
                      }
                    >
                      GET BETTER RESULTS
                    </Text>
                  </View>

                  <Text
                    style={styles.tipsTitle}
                  >
                    Ask with intention.
                  </Text>

                  <Text
                    style={
                      styles.tipsDescription
                    }
                  >
                    The more specific your
                    question, the more useful
                    your planning support can
                    be.
                  </Text>

                  <Tip text="Turn a busy day into a simple priority order." />

                  <Tip text="Summarize your open tasks before you start working." />

                  <Tip text="Break a large task into smaller next actions." />

                  <Tip
                    text="Review overdue work and decide what to reschedule."
                    last
                  />
                </View>

                <View
                  style={
                    styles.capabilityCard
                  }
                >
                  <View
                    style={
                      styles.cardEyebrowRow
                    }
                  >
                    <View
                      style={styles.orangeLine}
                    />

                    <Text
                      style={
                        styles.cardEyebrow
                      }
                    >
                      AI CAPABILITIES
                    </Text>
                  </View>

                  <Capability
                    icon="calendar-outline"
                    text="Daily planning"
                  />

                  <Capability
                    icon="flag-outline"
                    text="Task prioritization"
                  />

                  <Capability
                    icon="time-outline"
                    text="Schedule review"
                  />

                  <Capability
                    icon="trending-up-outline"
                    text="Productivity insights"
                    last
                  />
                </View>
              </View>
            </View>

            <View
              style={styles.footer}
            >
              <View
                style={styles.footerLine}
              />

              <Text
                style={styles.footerTitle}
              >
                TASKFLOW AI ASSIST
              </Text>

              <Text
                style={styles.footerText}
              >
                Plan clearly. Prioritize what
                matters. Keep moving.
              </Text>
            </View>
          </ScrollView>
        </View>

        <MobileDrawer
          visible={drawerOpen}
          displayName={displayName}
          onClose={() =>
            setDrawerOpen(false)
          }
          onNavigate={goTo}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function TopNavigation({
  isDesktop,
  displayName,
  onMenu,
}: {
  isDesktop: boolean;
  displayName?: string | null;
  onMenu: () => void;
}) {
  const desktopItems = NAV_ITEMS.slice(
    0,
    7,
  );

  return (
    <View
      style={[
        styles.topBar,
        isDesktop &&
          styles.topBarDesktop,
      ]}
    >
      {!isDesktop && (
        <Pressable
          onPress={onMenu}
          style={({ pressed }) => [
            styles.mobileMenuButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="menu-outline"
            size={23}
            color="#FFFFFF"
          />
        </Pressable>
      )}

      <Pressable
        onPress={() =>
          router.push("/" as never)
        }
        style={styles.topBrand}
      >
        <View style={styles.topLogo}>
          <Ionicons
            name="checkmark"
            size={18}
            color={COLORS.navy}
          />
        </View>

        <Text style={styles.topBrandText}>
          TaskFlow
        </Text>
      </Pressable>

      {isDesktop && (
        <View
          style={styles.desktopNavigation}
        >
          {desktopItems.map((item) => {
            const active =
              item.label ===
              "AI Assist";

            return (
              <Pressable
                key={item.label}
                onPress={() =>
                  router.push(
                    item.route as never,
                  )
                }
                style={({ pressed }) => [
                  styles.topNavItem,
                  active &&
                    styles.topNavItemActive,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.topNavText,
                    active &&
                      styles.topNavTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {isDesktop && (
        <View
          style={styles.topSearch}
        >
          <Ionicons
            name="search-outline"
            size={17}
            color="#B8C4D3"
          />

          <TextInput
            placeholder="Search..."
            placeholderTextColor="#9AAABD"
            style={
              styles.topSearchInput
            }
          />

          <Text
            style={
              styles.topSearchShortcut
            }
          >
            /
          </Text>
        </View>
      )}

      <View
        style={styles.topActions}
      >
        <Pressable
          onPress={() =>
            router.push(
              "/ai-assist" as never,
            )
          }
          style={({ pressed }) => [
            styles.topAction,
            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={COLORS.orange}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.topAction,
            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={18}
            color="#FFFFFF"
          />

          <View
            style={
              styles.notificationDot
            }
          />
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(
              "/settings" as never,
            )
          }
          style={styles.topAvatar}
        >
          <Text
            style={styles.topAvatarText}
          >
            {(displayName || "N")
              .charAt(0)
              .toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MobileDrawer({
  visible,
  displayName,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  displayName?: string | null;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={styles.drawerOverlay}
      >
        <Pressable
          style={
            styles.drawerBackdrop
          }
          onPress={onClose}
        />

        <View style={styles.drawer}>
          <View
            style={styles.drawerHeader}
          >
            <Pressable
              onPress={() =>
                onNavigate("/")
              }
              style={styles.brand}
            >
              <View
                style={styles.drawerLogo}
              >
                <Ionicons
                  name="checkmark"
                  size={19}
                  color={COLORS.navy}
                />
              </View>

              <Text
                style={styles.drawerBrandText}
              >
                TaskFlow
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.drawerClose,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                name="close"
                size={21}
                color={COLORS.text}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.drawerContent
            }
          >
            <Text
              style={styles.navLabel}
            >
              WORKSPACE
            </Text>

            {NAV_ITEMS.slice(
              0,
              7,
            ).map((item) => (
              <DrawerItem
                key={item.label}
                item={item}
                active={
                  item.label ===
                  "AI Assist"
                }
                onPress={() =>
                  onNavigate(
                    item.route,
                  )
                }
              />
            ))}

            <Text
              style={[
                styles.navLabel,
                styles.navLabelSecond,
              ]}
            >
              OTHER
            </Text>

            {NAV_ITEMS.slice(
              7,
            ).map((item) => (
              <DrawerItem
                key={item.label}
                item={item}
                active={false}
                onPress={() =>
                  onNavigate(
                    item.route,
                  )
                }
              />
            ))}
          </ScrollView>

          <Pressable
            onPress={() =>
              onNavigate(
                "/settings",
              )
            }
            style={styles.drawerProfile}
          >
            <View
              style={styles.profileAvatar}
            >
              <Text
                style={
                  styles.profileAvatarText
                }
              >
                {(displayName || "N")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={
                  styles.profileName
                }
                numberOfLines={1}
              >
                {displayName ||
                  "Your profile"}
              </Text>

              <Text
                style={
                  styles.profileSub
                }
              >
                Account settings
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={
                COLORS.lightMuted
              }
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DrawerItem({
  item,
  active,
  onPress,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        active &&
          styles.drawerItemActive,
        pressed &&
          styles.pressed,
      ]}
    >
      <Ionicons
        name={
          item.icon as keyof typeof Ionicons.glyphMap
        }
        size={18}
        color={
          active
            ? COLORS.orange
            : COLORS.muted
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

      {active && (
        <View
          style={styles.drawerActiveDot}
        />
      )}
    </Pressable>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Text
        style={styles.metricValue}
      >
        {value}
      </Text>

      <Text
        style={styles.metricLabel}
      >
        {label}
      </Text>
    </View>
  );
}

function Tip({
  text,
  last = false,
}: {
  text: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.tipRow,
        last &&
          styles.tipRowLast,
      ]}
    >
      <View
        style={styles.tipBullet}
      />

      <Text
        style={styles.tipText}
      >
        {text}
      </Text>
    </View>
  );
}

function Capability({
  icon,
  text,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.capabilityRow,
        last &&
          styles.capabilityRowLast,
      ]}
    >
      <View
        style={
          styles.capabilityIcon
        }
      >
        <Ionicons
          name={icon}
          size={15}
          color={COLORS.orange}
        />
      </View>

      <Text
        style={
          styles.capabilityText
        }
      >
        {text}
      </Text>

      <Ionicons
        name="checkmark-circle"
        size={15}
        color={COLORS.success}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  /* ---------------- TOP NAV ---------------- */

  topBar: {
    height: 66,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },

  topBarDesktop: {
    paddingHorizontal: 28,
  },

  topBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  topLogo: {
    width: 34,
    height: 34,
    backgroundColor:
      COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },

  topBrandText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  mobileMenuButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.14)",
  },

  desktopNavigation: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 34,
    gap: 2,
  },

  topNavItem: {
    height: 66,
    paddingHorizontal: 11,
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor:
      "transparent",
  },

  topNavItemActive: {
    borderBottomColor:
      COLORS.orange,
  },

  topNavText: {
    color: "#B7C3D2",
    fontSize: 11,
    fontWeight: "700",
  },

  topNavTextActive: {
    color: COLORS.white,
  },

  topSearch: {
    marginLeft: "auto",
    width: 190,
    height: 36,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 7,
  },

  topSearchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 11,
    outlineStyle: "none",
  } as any,

  topSearchShortcut: {
    color: "#9BA9BA",
    fontSize: 11,
    fontWeight: "700",
  },

  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: "auto",
  },

  topAction: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      COLORS.orange,
  },

  topAvatar: {
    width: 35,
    height: 35,
    backgroundColor:
      COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    borderRadius: 7,
  },

  topAvatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  /* ---------------- PAGE ---------------- */

  page: {
    width: "100%",
    maxWidth: 1360,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 50,
  },

  pageDesktop: {
    paddingHorizontal: 28,
    paddingTop: 26,
  },

  /* ---------------- HERO ---------------- */

  hero: {
    minHeight: 235,
    backgroundColor:
      COLORS.navyDark,
    overflow: "hidden",
    position: "relative",
    paddingHorizontal: 30,
    paddingVertical: 27,
    justifyContent: "center",
    marginBottom: 18,
  },

  heroMobile: {
    minHeight: 260,
    paddingHorizontal: 21,
    paddingVertical: 25,
  },

  heroContent: {
    maxWidth: 760,
    zIndex: 2,
  },

  heroDecorOne: {
    position: "absolute",
    width: 290,
    height: 290,
    borderRadius: 145,
    right: -85,
    top: -140,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.08)",
  },

  heroDecorTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: 70,
    bottom: -120,
    borderWidth: 1,
    borderColor:
      "rgba(255,122,0,0.16)",
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },

  eyebrowLine: {
    width: 26,
    height: 2,
    backgroundColor:
      COLORS.orange,
  },

  eyebrow: {
    color: "#AEBCCE",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1.1,
  },

  heroTitleMobile: {
    fontSize: 32,
    lineHeight: 38,
  },

  heroSubtitle: {
    maxWidth: 610,
    color: "#B9C5D4",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
  },

  heroSubtitleMobile: {
    fontSize: 13,
    lineHeight: 20,
  },

  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 19,
  },

  readyBadge: {
    height: 28,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor:
      "rgba(255,122,0,0.35)",
    backgroundColor:
      "rgba(255,122,0,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      COLORS.orange,
  },

  readyText: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  heroContext: {
    color: "#8495A9",
    fontSize: 10,
  },

  heroSymbol: {
    position: "absolute",
    right: 65,
    top: 77,
    opacity: 0.85,
    transform: [
      {
        rotate: "-12deg",
      },
    ],
  },

  /* ---------------- LAYOUT ---------------- */

  layout: {
    gap: 17,
  },

  layoutDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  chatColumn: {
    minWidth: 0,
    flex: 1,
  },

  chatColumnDesktop: {
    minWidth: 0,
  },

  sideColumn: {
    gap: 15,
  },

  sideColumnDesktop: {
    width: 320,
  },

  /* ---------------- CHAT ---------------- */

  chatCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    overflow: "hidden",
  },

  chatHeader: {
    minHeight: 72,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  chatIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  aiAvatar: {
    width: 42,
    height: 42,
    backgroundColor:
      COLORS.orangeSoft,
    borderWidth: 1,
    borderColor:
      "#FFD5B5",
    alignItems: "center",
    justifyContent: "center",
  },

  chatTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },

  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      COLORS.success,
  },

  chatSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
  },

  chatStatus: {
    width: 30,
    alignItems: "center",
  },

  messagesScroll: {
    minHeight: 360,
    maxHeight: 510,
  },

  messagesArea: {
    padding: 18,
    gap: 14,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    maxWidth: 760,
  },

  messageRowUser: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },

  messageAvatar: {
    width: 27,
    height: 27,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  assistantBubble: {
    backgroundColor:
      COLORS.soft,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  userBubble: {
    backgroundColor:
      COLORS.navy,
  },

  messageText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },

  userMessageText: {
    color: COLORS.white,
  },

  typingBubble: {
    minHeight: 40,
    paddingHorizontal: 12,
    backgroundColor:
      COLORS.soft,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  typingText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  /* ---------------- PROMPTS ---------------- */

  promptSection: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  promptLabel: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  promptHint: {
    color: COLORS.lightMuted,
    fontSize: 9,
    marginTop: 3,
  },

  promptList: {
    gap: 8,
  },

  promptChip: {
    minHeight: 39,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  promptIcon: {
    width: 24,
    height: 24,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  promptText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
  },

  promptDisabled: {
    opacity: 0.5,
  },

  /* ---------------- COMPOSER ---------------- */

  composer: {
    minHeight: 75,
    padding: 11,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },

  inputShell: {
    flex: 1,
    minHeight: 45,
    maxHeight: 108,
    borderWidth: 1,
    borderColor:
      COLORS.borderStrong,
    backgroundColor:
      COLORS.white,
    position: "relative",
  },

  composerInput: {
    minHeight: 43,
    maxHeight: 92,
    color: COLORS.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 21,
    outlineStyle: "none",
  } as any,

  characterCount: {
    position: "absolute",
    right: 9,
    bottom: 5,
    color: COLORS.lightMuted,
    fontSize: 8,
  },

  sendButton: {
    width: 44,
    height: 44,
    backgroundColor:
      COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  /* ---------------- CONTEXT CARD ---------------- */

  contextCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 18,
  },

  sectionEyebrow: {
    marginBottom: 13,
  },

  sectionEyebrowText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  contextHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  contextIcon: {
    width: 40,
    height: 40,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  contextTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  contextSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  metricsGrid: {
    flexDirection: "row",
    gap: 7,
    marginTop: 17,
  },

  metricCard: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },

  metricValue: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: "800",
  },

  metricLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 3,
  },

  contextDivider: {
    height: 1,
    backgroundColor:
      COLORS.border,
    marginTop: 16,
  },

  contextAction: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  contextActionText: {
    color: COLORS.orangeDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
  },

  /* ---------------- TIPS ---------------- */

  tipsCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 18,
  },

  cardEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  goldLine: {
    width: 22,
    height: 2,
    backgroundColor:
      COLORS.gold,
  },

  orangeLine: {
    width: 22,
    height: 2,
    backgroundColor:
      COLORS.orange,
  },

  cardEyebrow: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  tipsTitle: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 12,
  },

  tipsDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
    marginBottom: 5,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  tipRowLast: {
    borderBottomWidth: 0,
  },

  tipBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      COLORS.orange,
    marginTop: 5,
  },

  tipText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
  },

  /* ---------------- CAPABILITIES ---------------- */

  capabilityCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 18,
  },

  capabilityRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  capabilityRowLast: {
    borderBottomWidth: 0,
  },

  capabilityIcon: {
    width: 28,
    height: 28,
    backgroundColor:
      COLORS.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  capabilityText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
  },

  /* ---------------- FOOTER ---------------- */

  footer: {
    alignItems: "center",
    marginTop: 28,
  },

  footerLine: {
    width: 32,
    height: 2,
    backgroundColor:
      COLORS.orange,
    marginBottom: 10,
  },

  footerTitle: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 4,
  },

  /* ---------------- MOBILE DRAWER ---------------- */

  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor:
      "rgba(7, 22, 42, 0.52)",
  },

  drawerBackdrop: {
    flex: 1,
  },

  drawer: {
    width: 292,
    maxWidth: "86%",
    backgroundColor:
      COLORS.white,
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 15,
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: {
      width: -5,
      height: 0,
    },
    elevation: 14,
  },

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    paddingHorizontal: 2,
    marginBottom: 23,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  drawerLogo: {
    width: 35,
    height: 35,
    backgroundColor:
      COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  drawerBrandText: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "800",
  },

  drawerClose: {
    width: 37,
    height: 37,
    backgroundColor:
      COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  drawerContent: {
    paddingBottom: 20,
  },

  navLabel: {
    color: COLORS.lightMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    paddingHorizontal: 10,
    marginBottom: 7,
  },

  navLabelSecond: {
    marginTop: 22,
  },

  drawerItem: {
    height: 43,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 3,
    position: "relative",
  },

  drawerItemActive: {
    backgroundColor:
      COLORS.orangeSoft,
  },

  drawerItemText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  drawerItemTextActive: {
    color: COLORS.orangeDark,
    fontWeight: "800",
  },

  drawerActiveDot: {
    position: "absolute",
    right: 10,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      COLORS.orange,
  },

  drawerProfile: {
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  profileAvatar: {
    width: 36,
    height: 36,
    backgroundColor:
      COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  profileAvatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  profileName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  profileSub: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 2,
  },

  pressed: {
    opacity: 0.75,
  },
});