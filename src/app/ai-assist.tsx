import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  Activity,
  fetchTodayActivities,
  getActivityStatus,
} from "@/services/activities";
import { supabase } from "@/utils/supabase";

const COLORS = {
  primary: "#208AEF",
  primaryLight: "#EAF4FF",
  background: "#F6F8FC",
  card: "#FFFFFF",
  text: "#172033",
  muted: "#718096",
  border: "#E7ECF3",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
};

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

type AIResponse = {
  answer?: string;
  error?: string;
};

function getActivityTime(activity: Activity): string {
  const possibleActivity = activity as Activity & {
    time?: string | null;
    startTime?: string | null;
    start_time?: string | null;
  };

  return (
    possibleActivity.time ||
    possibleActivity.startTime ||
    possibleActivity.start_time ||
    ""
  );
}

function formatTime(time?: string | null) {
  if (!time) return "";

  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = minuteString ?? "00";

  if (Number.isNaN(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function createTaskContext(activities: Activity[]) {
  if (activities.length === 0) {
    return "The user has no tasks scheduled for today.";
  }

  const completed = activities.filter(
    (activity) => activity.completed
  );

  const pending = activities.filter(
    (activity) => !activity.completed
  );

  const overdue = pending.filter(
    (activity) =>
      getActivityStatus(activity) === "overdue"
  );

  const highPriority = pending.filter(
    (activity) =>
      activity.priority?.toLowerCase() === "high"
  );

  const taskList = activities
    .map((activity, index) => {
      const time = formatTime(
        getActivityTime(activity)
      );

      return [
        `${index + 1}. ${activity.title}`,
        time ? `Time: ${time}` : null,
        `Priority: ${activity.priority || "medium"}`,
        `Status: ${
          activity.completed
            ? "completed"
            : getActivityStatus(activity)
        }`,
        activity.description
          ? `Description: ${activity.description}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

  return `
Today's TaskFlow information:

Total tasks: ${activities.length}
Completed: ${completed.length}
Pending: ${pending.length}
Overdue: ${overdue.length}
High priority pending: ${highPriority.length}

Tasks:
${taskList}
`;
}

export default function AIAssistScreen() {
  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [asking, setAsking] =
    useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const today =
        await fetchTodayActivities();

      setActivities(today || []);
    } catch (error) {
      console.error(
        "AI Assist load error:",
        error
      );

      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = activities.filter(
      (activity) => activity.completed
    );

    const pending = activities.filter(
      (activity) => !activity.completed
    );

    const highPriority = pending.filter(
      (activity) =>
        activity.priority?.toLowerCase() ===
        "high"
    );

    const overdue = pending.filter(
      (activity) =>
        getActivityStatus(activity) ===
        "overdue"
    );

    const progress =
      activities.length === 0
        ? 0
        : Math.round(
            (completed.length /
              activities.length) *
              100
          );

    return {
      completed,
      pending,
      highPriority,
      overdue,
      progress,
    };
  }, [activities]);

  const askAI = useCallback(
    async (question?: string) => {
      const text = (
        question ?? message
      ).trim();

      if (!text) {
        return;
      }

      setAsking(true);

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: text,
      };

      setMessages((current) => [
        ...current,
        userMessage,
      ]);

      setMessage("");

      try {
        const history = messages
          .slice(-10)
          .map((item) => ({
            role: item.role,
            content: item.content,
          }));

        const taskContext =
          createTaskContext(activities);

        const {
          data,
          error,
        } = await supabase.functions.invoke(
          "ai-assist",
          {
            body: {
              message: text,
              history,
              taskContext,
            },
          }
        );

        if (error) {
          console.error(
            "AI Assist function error:",
            error
          );

          throw new Error(
            error.message ||
              "Unable to connect to AI."
          );
        }

        const result =
          data as AIResponse | null;

        if (
          !result ||
          !result.answer
        ) {
          throw new Error(
            result?.error ||
              "The AI returned an empty response."
          );
        }

        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: result.answer,
        };

        setMessages((current) => [
          ...current,
          assistantMessage,
        ]);
      } catch (error) {
        console.error(
          "AI Assist error:",
          error
        );

        const errorMessage: ChatMessage = {
          id: `${Date.now()}-error`,
          role: "assistant",
          content:
            "I couldn't connect to the AI assistant right now. Please check your connection and try again.",
        };

        setMessages((current) => [
          ...current,
          errorMessage,
        ]);
      } finally {
        setAsking(false);
      }
    },
    [activities, message, messages]
  );

  const quickQuestions = [
    "What should I focus on today?",
    "How is my progress?",
    "What tasks are pending?",
    "Do I have anything urgent?",
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.back}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              AI Assist
            </Text>

            <Text style={styles.subtitle}>
              Your personal AI productivity
              assistant
            </Text>
          </View>

          <View style={styles.onlineBadge}>
            <View
              style={styles.onlineDot}
            />

            <Text
              style={styles.onlineText}
            >
              AI
            </Text>
          </View>
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.sparkle}>
            <Ionicons
              name="sparkles"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            Ask me anything
          </Text>

          <Text style={styles.heroText}>
            I can answer general questions,
            explain concepts, help you plan,
            write things for you, or use your
            TaskFlow schedule when you ask about
            your productivity.
          </Text>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {activities.length}
            </Text>

            <Text style={styles.statLabel}>
              Today
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    COLORS.success,
                },
              ]}
            >
              {stats.completed.length}
            </Text>

            <Text style={styles.statLabel}>
              Completed
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    COLORS.warning,
                },
              ]}
            >
              {stats.pending.length}
            </Text>

            <Text style={styles.statLabel}>
              Pending
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statNumber,
                {
                  color:
                    COLORS.primary,
                },
              ]}
            >
              {stats.progress}%
            </Text>

            <Text style={styles.statLabel}>
              Progress
            </Text>
          </View>
        </View>

        {/* QUICK QUESTIONS */}
        <Text style={styles.sectionTitle}>
          Try asking
        </Text>

        <View style={styles.quickRow}>
          {quickQuestions.map(
            (question) => (
              <Pressable
                key={question}
                style={({ pressed }) => [
                  styles.quickButton,
                  pressed &&
                    styles.quickButtonPressed,
                ]}
                onPress={() => {
                  void askAI(question);
                }}
                disabled={asking}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={15}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={styles.quickText}
                >
                  {question}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* CHAT */}
        <View style={styles.chatCard}>
          {messages.length > 0 && (
            <View style={styles.messages}>
              {messages.map((item) => {
                const isUser =
                  item.role === "user";

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isUser &&
                        styles.userMessageRow,
                    ]}
                  >
                    {!isUser && (
                      <View
                        style={
                          styles.messageIcon
                        }
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={17}
                          color={
                            COLORS.primary
                          }
                        />
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? styles.userBubble
                          : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isUser &&
                            styles.userMessageText,
                        ]}
                      >
                        {item.content}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {asking && (
            <View style={styles.typingRow}>
              <View
                style={styles.messageIcon}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={17}
                  color={COLORS.primary}
                />
              </View>

              <View
                style={
                  styles.typingBubble
                }
              >
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
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

          {/* INPUT */}
          <View style={styles.inputRow}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Ask me anything..."
              placeholderTextColor="#9AA4B2"
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={() =>
                void askAI()
              }
              editable={!asking}
              multiline
            />

            <Pressable
              style={({ pressed }) => [
                styles.send,
                pressed &&
                  styles.sendPressed,
                (!message.trim() ||
                  asking) &&
                  styles.sendDisabled,
              ]}
              onPress={() =>
                void askAI()
              }
              disabled={
                !message.trim() ||
                asking
              }
            >
              {asking ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          {messages.length === 0 &&
            !asking && (
              <View
                style={styles.emptyAnswer}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={22}
                  color="#A7B1C2"
                />

                <Text
                  style={styles.placeholder}
                >
                  Ask a question and your AI
                  assistant will respond here.
                </Text>
              </View>
            )}
        </View>

        {/* INFO */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              TaskFlow AI
            </Text>

            <Text style={styles.infoText}>
              General questions are answered by
              AI. When you ask about your TaskFlow
              schedule, your current tasks are
              provided as context.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    padding: 28,
    paddingBottom: 60,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 25,
  },

  headerText: {
    flex: 1,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
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

  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor:
      "#ECFDF3",
    borderWidth: 1,
    borderColor:
      "#D1FAE5",
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      COLORS.success,
  },

  onlineText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.success,
  },

  hero: {
    padding: 25,
    borderRadius: 19,
    backgroundColor:
      COLORS.primary,
  },

  sparkle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    marginTop: 17,
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heroText: {
    marginTop: 6,
    color: "#E8F4FF",
    fontSize: 13,
    lineHeight: 20,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  statCard: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor:
      COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },

  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  quickButtonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  quickText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },

  chatCard: {
    padding: 18,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 17,
  },

  messages: {
    gap: 14,
    marginBottom: 17,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  userMessageRow: {
    justifyContent:
      "flex-end",
  },

  messageIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },

  assistantBubble: {
    backgroundColor:
      COLORS.primaryLight,
  },

  userBubble: {
    backgroundColor:
      COLORS.primary,
  },

  messageText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
  },

  userMessageText: {
    color: "#FFFFFF",
  },

  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 16,
  },

  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor:
      COLORS.primaryLight,
  },

  typingText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    borderRadius: 12,
    backgroundColor:
      COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 13,
    outlineStyle: "none",
  } as any,

  send: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sendPressed: {
    opacity: 0.8,
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  sendDisabled: {
    opacity: 0.5,
  },

  emptyAnswer: {
    marginTop: 17,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  placeholder: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  infoCard: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    flexDirection: "row",
    gap: 11,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  infoText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
  },
});