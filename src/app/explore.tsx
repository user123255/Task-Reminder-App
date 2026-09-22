import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import {
  Activity,
  fetchActivities,
  getLocalDateString,
  updateActivityCompletion,
} from '@/services/activities';

type Filter = 'all' | 'today' | 'upcoming' | 'completed';

const AREA_COLORS: Record<string, string> = {
  Spiritual: '#8B5CF6',
  Health: '#10B981',
  Business: '#F59E0B',
  Career: '#3B82F6',
  Relationships: '#EC4899',
  Learning: '#6366F1',
  Personal: '#14B8A6',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

function getAreaColor(category?: string | null) {
  return AREA_COLORS[category || 'Personal'] || '#208AEF';
}

function getPriorityColor(priority?: string | null) {
  return PRIORITY_COLORS[(priority || 'medium').toLowerCase()] || '#F59E0B';
}

function formatDate(date?: string | null) {
  if (!date) return '';

  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(time?: string | null) {
  if (!time) return '';

  const [hoursString, minutes] = time.split(':');
  const hours = Number(hoursString);

  if (Number.isNaN(hours)) return time;

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function isToday(date?: string | null) {
  return date === getLocalDateString();
}

function isUpcoming(date?: string | null) {
  if (!date) return false;

  return date > getLocalDateString();
}

function TaskCard({
  task,
  onToggle,
}: {
  task: Activity;
  onToggle: (task: Activity) => void;
}) {
  const areaColor = getAreaColor(task.category);
  const priorityColor = getPriorityColor(task.priority);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.taskAccent,
          { backgroundColor: areaColor },
        ]}
      />

      <Pressable
        onPress={() => onToggle(task)}
        style={[
          styles.checkbox,
          task.completed && {
            backgroundColor: areaColor,
            borderColor: areaColor,
          },
        ]}
      >
        {task.completed && (
          <Ionicons
            name="checkmark"
            size={16}
            color="#FFFFFF"
          />
        )}
      </Pressable>

      <View style={styles.taskContent}>
        <View style={styles.taskTitleRow}>
          <Text
            style={[
              styles.taskTitle,
              task.completed && styles.completedTitle,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View
            style={[
              styles.priorityDot,
              { backgroundColor: priorityColor },
            ]}
          />
        </View>

        {!!task.description && (
          <Text
            style={styles.taskDescription}
            numberOfLines={1}
          >
            {task.description}
          </Text>
        )}

        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color="#7A8496"
            />
            <Text style={styles.metaText}>
              {formatTime(task.scheduled_time)}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color="#7A8496"
            />
            <Text style={styles.metaText}>
              {isToday(task.scheduled_date)
                ? 'Today'
                : formatDate(task.scheduled_date)}
            </Text>
          </View>

          {task.category && (
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: `${areaColor}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: areaColor },
                ]}
              >
                {task.category}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchActivities();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (filter === 'today') {
          return isToday(task.scheduled_date);
        }

        if (filter === 'upcoming') {
          return isUpcoming(task.scheduled_date);
        }

        if (filter === 'completed') {
          return task.completed;
        }

        return true;
      })
      .filter((task) => {
        if (!query) return true;

        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.category?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const dateA = `${a.scheduled_date || ''} ${
          a.scheduled_time || ''
        }`;

        const dateB = `${b.scheduled_date || ''} ${
          b.scheduled_time || ''
        }`;

        return dateA.localeCompare(dateB);
      });
  }, [tasks, filter, search]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      today: tasks.filter((task) =>
        isToday(task.scheduled_date)
      ).length,
      upcoming: tasks.filter((task) =>
        isUpcoming(task.scheduled_date)
      ).length,
      completed: tasks.filter((task) => task.completed).length,
    };
  }, [tasks]);

  const handleToggle = async (task: Activity) => {
    try {
      await updateActivityCompletion(
        task.id,
        !task.completed
      );

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                completed: !item.completed,
                completed_at: !item.completed
                  ? new Date().toISOString()
                  : null,
              }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const renderFilter = (
    value: Filter,
    label: string,
    count: number
  ) => {
    const active = filter === value;

    return (
      <Pressable
        onPress={() => setFilter(value)}
        style={[
          styles.filterButton,
          active && styles.filterButtonActive,
        ]}
      >
        <Text
          style={[
            styles.filterText,
            active && styles.filterTextActive,
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.filterCount,
            active && styles.filterCountActive,
          ]}
        >
          <Text
            style={[
              styles.filterCountText,
              active && styles.filterCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR TASKS</Text>
            <Text style={styles.headerTitle}>
              All tasks
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/add-activity')}
            style={styles.addButton}
          >
            <Ionicons
              name="add"
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#8B95A7"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your tasks..."
            placeholderTextColor="#9AA3B2"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color="#9AA3B2"
              />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={[
            ['all', 'All', counts.all],
            ['today', 'Today', counts.today],
            ['upcoming', 'Upcoming', counts.upcoming],
            ['completed', 'Completed', counts.completed],
          ] as [Filter, string, number][]}
          keyExtractor={([value]) => value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) =>
            renderFilter(item[0], item[1], item[2])
          }
        />

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color="#208AEF"
            />
            <Text style={styles.stateText}>
              Loading your tasks...
            </Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  search
                    ? 'search-outline'
                    : filter === 'completed'
                    ? 'checkmark-done-outline'
                    : 'calendar-outline'
                }
                size={32}
                color="#208AEF"
              />
            </View>

            <Text style={styles.emptyTitle}>
              {search
                ? 'No tasks found'
                : filter === 'completed'
                ? 'Nothing completed yet'
                : filter === 'upcoming'
                ? 'No upcoming tasks'
                : filter === 'today'
                ? 'Your day is open'
                : 'No tasks yet'}
            </Text>

            <Text style={styles.emptyDescription}>
              {search
                ? 'Try another search term.'
                : filter === 'completed'
                ? 'Completed tasks will appear here.'
                : 'Create your first task and start planning your day.'}
            </Text>

            {!search && filter !== 'completed' && (
              <Pressable
                onPress={() =>
                  router.push('/add-activity')
                }
                style={styles.emptyButton}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.emptyButtonText}>
                  Add task
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.taskList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadTasks();
                }}
                tintColor="#208AEF"
              />
            }
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                onToggle={handleToggle}
              />
            )}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.listTitle}>
                    {filter === 'all'
                      ? 'Everything'
                      : filter === 'today'
                      ? "Today's tasks"
                      : filter === 'upcoming'
                      ? 'Coming up'
                      : 'Completed tasks'}
                  </Text>

                  <Text style={styles.listSubtitle}>
                    {filteredTasks.length}{' '}
                    {filteredTasks.length === 1
                      ? 'task'
                      : 'tasks'}
                  </Text>
                </View>
              </View>
            }
          />
        )}

        <Pressable
          onPress={() => router.push('/add-activity')}
          style={({ pressed }) => [
            styles.floatingButton,
            pressed && styles.floatingButtonPressed,
          ]}
        >
          <Ionicons
            name="add"
            size={25}
            color="#FFFFFF"
          />
          <Text style={styles.floatingText}>
            Add task
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 18,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#208AEF',
    marginBottom: 5,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#172033',
  },

  addButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#208AEF',
    shadowColor: '#208AEF',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  searchBox: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EBF2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#172033',
    marginLeft: 10,
  },

  filters: {
    paddingBottom: 18,
    gap: 9,
  },

  filterButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  filterButtonActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },

  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#657083',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  filterCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F3F7',
  },

  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  filterCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#667085',
  },

  filterCountTextActive: {
    color: '#FFFFFF',
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },

  listTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
  },

  listSubtitle: {
    fontSize: 13,
    color: '#8A94A6',
    marginTop: 3,
  },

  taskList: {
    paddingBottom: 110,
  },

  taskCard: {
    minHeight: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9EDF3',
    shadowColor: '#172033',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  pressed: {
    opacity: 0.8,
  },

  taskAccent: {
    width: 4,
    height: '100%',
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D5DBE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    marginTop: 17,
  },

  taskContent: {
    flex: 1,
    padding: 14,
    paddingLeft: 11,
  },

  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  taskTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1D2738',
  },

  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#98A1B1',
  },

  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 8,
  },

  taskDescription: {
    fontSize: 12,
    color: '#8A94A6',
    marginTop: 4,
  },

  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: 11,
    color: '#7A8496',
    fontWeight: '600',
  },

  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },

  categoryText: {
    fontSize: 10,
    fontWeight: '800',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },

  stateText: {
    marginTop: 12,
    color: '#7A8496',
    fontSize: 14,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4FF',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7A8496',
    textAlign: 'center',
    marginTop: 8,
  },

  emptyButton: {
    marginTop: 20,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: '#952208',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#208AEF',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 7,
  },

  floatingButtonPressed: {
    transform: [{ scale: 0.97 }],
  },

  floatingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});