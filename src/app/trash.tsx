import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  emptyTrash,
  fetchTrashedActivities,
  permanentlyDeleteActivity,
  restoreActivity,
  type Activity,
} from '@/services/activities';

export default function TrashScreen() {
  const router = useRouter();

  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);

      const trashed = await fetchTrashedActivities();

      setItems(trashed);
    } catch (error) {
      console.error('Failed to load Trash:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load Trash.';

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Trash', message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTrash();
    }, [loadTrash]),
  );

  const showMessage = (
    title: string,
    message: string,
  ) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const restore = async (id: string) => {
    try {
      setProcessingId(id);

      await restoreActivity(id);

      setItems((current) =>
        current.filter((item) => item.id !== id),
      );

      showMessage(
        'Restored',
        'The task has been restored successfully.',
      );
    } catch (error) {
      console.error('Failed to restore task:', error);

      showMessage(
        'Restore failed',
        error instanceof Error
          ? error.message
          : 'The task could not be restored.',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const permanentlyRemove = async (id: string) => {
    try {
      setProcessingId(id);

      await permanentlyDeleteActivity(id);

      setItems((current) =>
        current.filter((item) => item.id !== id),
      );
    } catch (error) {
      console.error(
        'Failed to permanently delete task:',
        error,
      );

      showMessage(
        'Delete failed',
        error instanceof Error
          ? error.message
          : 'The task could not be permanently deleted.',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const confirmPermanentDelete = (item: Activity) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Permanently delete "${item.title}"?\n\nThis cannot be undone.`,
      );

      if (confirmed) {
        void permanentlyRemove(item.id);
      }

      return;
    }

    Alert.alert(
      'Delete permanently?',
      `"${item.title}" will be permanently deleted. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            void permanentlyRemove(item.id);
          },
        },
      ],
    );
  };

  const confirmEmptyTrash = () => {
    if (items.length === 0) {
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Permanently delete all ${items.length} trashed task${
          items.length === 1 ? '' : 's'
        }?\n\nThis cannot be undone.`,
      );

      if (confirmed) {
        void handleEmptyTrash();
      }

      return;
    }

    Alert.alert(
      'Empty Trash?',
      `All ${items.length} trashed task${
        items.length === 1 ? '' : 's'
      } will be permanently deleted. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: () => {
            void handleEmptyTrash();
          },
        },
      ],
    );
  };

  const handleEmptyTrash = async () => {
    try {
      setEmptying(true);

      await emptyTrash();

      setItems([]);

      showMessage(
        'Trash emptied',
        'All trashed tasks have been permanently deleted.',
      );
    } catch (error) {
      console.error('Failed to empty Trash:', error);

      showMessage(
        'Empty Trash failed',
        error instanceof Error
          ? error.message
          : 'Trash could not be emptied.',
      );
    } finally {
      setEmptying(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      const parsed = new Date(`${date}T00:00:00`);

      return parsed.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  };

  return (
    <View style={styles.container as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton as ViewStyle}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#172033"
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow as ViewStyle}>
            <View style={styles.trashIcon as ViewStyle}>
              <Ionicons
                name="trash-outline"
                size={20}
                color="#EF4444"
              />
            </View>

            <Text style={styles.title as TextStyle}>Trash</Text>
          </View>

          <Text style={styles.subtitle}>
            Deleted tasks stay here until you restore or
            permanently delete them.
          </Text>
        </View>

        {items.length > 0 && (
          <Pressable
            onPress={confirmEmptyTrash}
            disabled={emptying}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.pressed,
              emptying && styles.disabled,
            ]}
          >
            {emptying ? (
              <ActivityIndicator
                size="small"
                color="#EF4444"
              />
            ) : (
              <Text style={styles.emptyButtonText}>
                Empty Trash
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#208AEF"
          />

          <Text style={styles.loadingText}>
            Loading Trash...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="trash-outline"
              size={42}
              color="#94A3B8"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Trash is empty
          </Text>

          <Text style={styles.emptyText}>
            Tasks you move to Trash will appear here.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backToTasksButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backToTasksText}>
              Back to Tasks
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#208AEF"
            />

            <Text style={styles.infoText}>
              {items.length} deleted task
              {items.length === 1 ? '' : 's'}. You can
              restore them at any time.
            </Text>
          </View>

          {items.map((item) => {
            const processing =
              processingId === item.id;

            return (
              <View
                key={item.id}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.categoryIcon}>
                    <Ionicons
                      name={
                        (item.category_icon as any) ||
                        'apps-outline'
                      }
                      size={20}
                      color={
                        item.category_color ||
                        '#64748B'
                      }
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <Text
                      style={styles.taskTitle}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.category}>
                      {item.category}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#64748B"
                        />

                        <Text style={styles.metaText}>
                          {formatDate(
                            item.scheduled_date,
                          )}
                        </Text>
                      </View>

                      {item.scheduled_time && (
                        <View style={styles.metaItem}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color="#64748B"
                          />

                          <Text style={styles.metaText}>
                            {item.scheduled_time}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() =>
                      void restore(item.id)
                    }
                    disabled={processing || emptying}
                    style={({ pressed }) => [
                      styles.restoreButton,
                      pressed &&
                        styles.pressed,
                      (processing ||
                        emptying) &&
                        styles.disabled,
                    ]}
                  >
                    {processing ? (
                      <ActivityIndicator
                        size="small"
                        color="#208AEF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="arrow-undo-outline"
                          size={17}
                          color="#208AEF"
                        />

                        <Text
                          style={
                            styles.restoreText
                          }
                        >
                          Restore
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      confirmPermanentDelete(
                        item,
                      )
                    }
                    disabled={processing || emptying}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed &&
                        styles.pressed,
                      (processing ||
                        emptying) &&
                        styles.disabled,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color="#EF4444"
                    />

                    <Text
                      style={
                        styles.deleteText
                      }
                    >
                      Delete permanently
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  header: {
    minHeight: 92,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F6F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitleContainer: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  trashIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172033',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748B',
  },

  emptyButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  list: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 60,
    gap: 14,
  },

  infoCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    gap: 14,
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardContent: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#172033',
  },

  category: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaText: {
    fontSize: 12,
    color: '#64748B',
  },

  actions: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  restoreButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  restoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#208AEF',
  },

  deleteButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172033',
  },

  emptyText: {
    maxWidth: 400,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },

  backToTasksButton: {
    marginTop: 22,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backToTasksText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.5,
  },
});