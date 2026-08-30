
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Activity = {
  id: number;
  title: string;
  time: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
};

const initialActivities: Activity[] = [
  {
    id: 1,
    title: 'Morning prayer & devotion',
    time: '6:30 AM',
    category: 'Spiritual',
    icon: 'heart-outline',
    completed: true,
  },
  {
    id: 2,
    title: 'Exercise for 30 minutes',
    time: '7:30 AM',
    category: 'Health',
    icon: 'fitness-outline',
    completed: false,
  },
  {
    id: 3,
    title: 'Work on personal project',
    time: '10:00 AM',
    category: 'Career',
    icon: 'briefcase-outline',
    completed: false,
  },
  {
    id: 4,
    title: 'Read for 30 minutes',
    time: '7:00 PM',
    category: 'Personal',
    icon: 'book-outline',
    completed: false,
  },
];

const categories = [
  { name: 'Spiritual', icon: 'heart-outline' as const },
  { name: 'Health', icon: 'fitness-outline' as const },
  { name: 'Business', icon: 'wallet-outline' as const },
  { name: 'Career', icon: 'briefcase-outline' as const },
  { name: 'Relationships', icon: 'people-outline' as const },
];

const moods = [
  { label: 'Great', icon: 'sparkles-outline' as const },
  { label: 'Good', icon: 'happy-outline' as const },
  { label: 'Okay', icon: 'remove-circle-outline' as const },
  { label: 'Low', icon: 'sad-outline' as const },
];

export default function Dashboard() {
  const [activities, setActivities] = useState(initialActivities);
  const [selectedMood, setSelectedMood] = useState('Good');

  const completedCount = activities.filter(
    (activity) => activity.completed
  ).length;

  const progress = useMemo(() => {
    if (activities.length === 0) return 0;
    return Math.round((completedCount / activities.length) * 100);
  }, [completedCount, activities.length]);

  const toggleActivity = (id: number) => {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, completed: !activity.completed }
          : activity
      )
    );
  };

  const date = new Date();

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const hour = date.getHours();

  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : 'Good evening';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.name}>Nyayath</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#172033"
            />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Today's progress</Text>
              <Text style={styles.progressSubtitle}>
                {completedCount} of {activities.length} activities completed
              </Text>
            </View>

            <Text style={styles.progressPercentage}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>

          <Text style={styles.progressMessage}>
            {progress >= 75
              ? "You're doing great! Keep going. 🔥"
              : progress >= 40
                ? 'Good progress. Keep moving forward! 💪'
                : 'Every small step counts. You can do this! 🌱'}
          </Text>
        </View>

        {/* Mood */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>

          <View style={styles.moodRow}>
            {moods.map((mood) => {
              const selected = selectedMood === mood.label;

              return (
                <Pressable
                  key={mood.label}
                  onPress={() => setSelectedMood(mood.label)}
                  style={[
                    styles.moodButton,
                    selected && styles.moodButtonSelected,
                  ]}
                >
                  <Ionicons
                    name={mood.icon}
                    size={24}
                    color={selected ? '#FFFFFF' : '#667085'}
                  />

                  <Text
                    style={[
                      styles.moodText,
                      selected && styles.moodTextSelected,
                    ]}
                  >
                    {mood.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Motivation */}
        <View style={styles.motivationCard}>
          <View style={styles.motivationIcon}>
            <Ionicons name="sparkles-outline" size={24} color="#208AEF" />
          </View>

          <View style={styles.motivationContent}>
            <Text style={styles.motivationTitle}>Today's motivation</Text>
            <Text style={styles.motivationText}>
              You don't have to do everything today. Focus on what matters
              most and make meaningful progress.
            </Text>
          </View>
        </View>

        {/* Today's Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's activities</Text>

            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          {activities.map((activity) => (
            <Pressable
              key={activity.id}
              onPress={() => toggleActivity(activity.id)}
              style={[
                styles.activityCard,
                activity.completed && styles.activityCompleted,
              ]}
            >
              <View
                style={[
                  styles.activityIcon,
                  activity.completed && styles.activityIconCompleted,
                ]}
              >
                <Ionicons
                  name={activity.icon}
                  size={22}
                  color={activity.completed ? '#FFFFFF' : '#208AEF'}
                />
              </View>

              <View style={styles.activityInfo}>
                <Text
                  style={[
                    styles.activityTitle,
                    activity.completed && styles.completedText,
                  ]}
                >
                  {activity.title}
                </Text>

                <View style={styles.activityMeta}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color="#667085"
                  />
                  <Text style={styles.activityTime}>
                    {activity.time}
                  </Text>

                  <View style={styles.categoryDot} />

                  <Text style={styles.activityCategory}>
                    {activity.category}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.checkButton,
                  activity.completed && styles.checkButtonCompleted,
                ]}
              >
                {activity.completed && (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Life areas</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((category) => (
              <Pressable key={category.name} style={styles.categoryCard}>
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={category.icon}
                    size={22}
                    color="#208AEF"
                  />
                </View>

                <Text style={styles.categoryName}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Add Activity */}
        <Pressable style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add activity</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  greeting: {
    fontSize: 15,
    color: '#667085',
    marginBottom: 3,
  },

  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172033',
  },

  date: {
    marginTop: 5,
    fontSize: 14,
    color: '#667085',
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    right: 10,
    top: 9,
  },

  progressCard: {
    backgroundColor: '#172033',
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  progressSubtitle: {
    color: '#AAB4C5',
    fontSize: 13,
    marginTop: 5,
  },

  progressPercentage: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },

  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#334056',
    overflow: 'hidden',
    marginTop: 20,
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#208AEF',
  },

  progressMessage: {
    color: '#D7DEEA',
    fontSize: 13,
    marginTop: 14,
  },

  section: {
    marginBottom: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 13,
  },

  seeAll: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '600',
  },

  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },

  moodButton: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  moodButtonSelected: {
    backgroundColor: '#208AEF',
  },

  moodText: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '600',
  },

  moodTextSelected: {
    color: '#FFFFFF',
  },

  motivationCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
  },

  motivationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  motivationContent: {
    flex: 1,
  },

  motivationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 4,
  },

  motivationText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#526074',
  },

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  activityCompleted: {
    opacity: 0.72,
  },

  activityIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  activityIconCompleted: {
    backgroundColor: '#208AEF',
  },

  activityInfo: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
  },

  completedText: {
    textDecorationLine: 'line-through',
    color: '#8A94A6',
  },

  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  activityTime: {
    fontSize: 12,
    color: '#667085',
    marginLeft: 4,
  },

  categoryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#98A2B3',
    marginHorizontal: 7,
  },

  activityCategory: {
    fontSize: 12,
    color: '#667085',
  },

  checkButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  checkButtonCompleted: {
    borderColor: '#208AEF',
    backgroundColor: '#208AEF',
  },

  categoryScroll: {
    gap: 10,
  },

  categoryCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#172033',
  },

  addButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

