
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const COLORS = {
  primary: "#208AEF",
  background: "#F6F8FC",
  card: "#FFFFFF",
  text: "#172033",
  muted: "#718096",
  border: "#E7ECF3",
};

const FAQ = [
  {
    q: "How do I create a task?",
    a: "Open Tasks or press Add Task, enter the activity details, choose its life area, time, priority and reminder, then save it.",
  },
  {
    q: "How do reminders work?",
    a: "A task can have a reminder enabled with a configurable reminder time before the scheduled activity.",
  },
  {
    q: "How do I edit a task?",
    a: "Open the task from the dashboard, Calendar or Tasks page and choose the edit option.",
  },
  {
    q: "How does Calendar work?",
    a: "Calendar reads your scheduled activities and lets you move between dates and months while viewing the tasks assigned to each day.",
  },
  {
    q: "What are Reports?",
    a: "Reports summarize your scheduled and completed activities and break your work down by period and life area.",
  },
  {
    q: "What is AI Assist?",
    a: "AI Assist helps you understand your current schedule, priorities and progress. More advanced AI capabilities can be connected later.",
  },
];

export default function HelpScreen() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return FAQ;

    return FAQ.filter(
      (item) =>
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            style={styles.back}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={21} color={COLORS.text} />
          </Pressable>

          <View>
            <Text style={styles.title}>Help Center</Text>
            <Text style={styles.subtitle}>
              Find answers and learn how TaskFlow works
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="help-circle-outline"
              size={28}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.heroTitle}>
            How can we help?
          </Text>

          <Text style={styles.heroText}>
            Search the help center or browse the common questions below.
          </Text>
        </View>

        <View style={styles.search}>
          <Ionicons
            name="search-outline"
            size={19}
            color={COLORS.muted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search help..."
            placeholderTextColor="#9AA4B2"
            style={styles.input}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Frequently asked questions
        </Text>

        <View style={styles.faqList}>
          {filtered.map((item, index) => {
            const isOpen = open === index;

            return (
              <Pressable
                key={item.q}
                style={styles.faq}
                onPress={() =>
                  setOpen(isOpen ? null : index)
                }
              >
                <View style={styles.questionRow}>
                  <Text style={styles.question}>
                    {item.q}
                  </Text>

                  <Ionicons
                    name={
                      isOpen
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={18}
                    color={COLORS.muted}
                  />
                </View>

                {isOpen && (
                  <Text style={styles.answer}>
                    {item.a}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.contact}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color={COLORS.primary}
          />

          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>
              Need more help?
            </Text>
            <Text style={styles.contactText}>
              Use this section as the starting point for support,
              documentation and future in-app assistance.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: 28,
    paddingBottom: 60,
    maxWidth: 950,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 3, color: COLORS.muted, fontSize: 14 },
  hero: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#EAF4FF",
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    marginTop: 15,
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.text,
  },
  heroText: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  search: {
    marginTop: 17,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    outlineStyle: "none",
  } as any,
  sectionTitle: {
    marginTop: 28,
    marginBottom: 13,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  faqList: { gap: 9 },
  faq: {
    padding: 17,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  question: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  answer: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  contact: {
    marginTop: 20,
    padding: 17,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: 12,
  },
  contactContent: { flex: 1 },
  contactTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  contactText: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});