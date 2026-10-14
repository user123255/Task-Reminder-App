import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createActivity,
  getLocalDateString,
} from '@/services/activities';

type LifeArea = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type ReminderOption = {
  label: string;
  minutes: number | null;
};

const LIFE_AREAS: LifeArea[] = [
  {
    name: 'Spiritual',
    icon: 'sparkles',
  },
  {
    name: 'Health',
    icon: 'heart',
  },
  {
    name: 'Relationship',
    icon: 'people',
  },
  {
    name: 'Career',
    icon: 'briefcase',
  },
  {
    name: 'Other',
    icon: 'apps',
  },
];

const REPEAT_OPTIONS = [
  {
    value: 'none',
    label: 'Does not repeat',
  },
  {
    value: 'daily',
    label: 'Every day',
  },
  {
    value: 'weekdays',
    label: 'Weekdays',
  },
  {
    value: 'weekends',
    label: 'Weekends',
  },
  {
    value: 'weekly',
    label: 'Every week',
  },
  {
    value: 'monthly',
    label: 'Every month',
  },
  {
    value: 'yearly',
    label: 'Every year',
  },
];

const PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    icon: 'arrow-down-outline' as const,
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: 'remove-outline' as const,
  },
  {
    value: 'high',
    label: 'High',
    icon: 'arrow-up-outline' as const,
  },
];

const REMINDER_OPTIONS: ReminderOption[] = [
  {
    label: 'At activity time',
    minutes: 0,
  },
  {
    label: '5 minutes before',
    minutes: 5,
  },
  {
    label: '10 minutes before',
    minutes: 10,
  },
  {
    label: '15 minutes before',
    minutes: 15,
  },
  {
    label: '30 minutes before',
    minutes: 30,
  },
  {
    label: '1 hour before',
    minutes: 60,
  },
];

const HOURS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
];

const MINUTES = [
  0,
  15,
  30,
  45,
];

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(
  hour: number,
  minute: number,
  period: 'AM' | 'PM'
) {
  return `${hour}:${String(minute).padStart(
    2,
    '0'
  )} ${period}`;
}

function to24Hour(
  hour: number,
  minute: number,
  period: 'AM' | 'PM'
) {
  let convertedHour = hour;

  if (period === 'AM' && hour === 12) {
    convertedHour = 0;
  }

  if (period === 'PM' && hour !== 12) {
    convertedHour = hour + 12;
  }

  return `${String(convertedHour).padStart(
    2,
    '0'
  )}:${String(minute).padStart(
    2,
    '0'
  )}:00`;
}

function getDateKey(date: Date) {
  return getLocalDateString(date);
}

export default function AddActivityScreen() {
  const [activityName, setActivityName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [selectedArea, setSelectedArea] =
    useState('Other');

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [selectedHour, setSelectedHour] =
    useState(9);

  const [selectedMinute, setSelectedMinute] =
    useState(0);

  const [selectedPeriod, setSelectedPeriod] =
    useState<'AM' | 'PM'>('AM');

  const [repeat, setRepeat] =
    useState('none');

  const [priority, setPriority] =
    useState('medium');

  const [reminder, setReminder] =
    useState(true);

  const [reminderMinutes, setReminderMinutes] =
    useState<number | null>(5);

  const [showDateModal, setShowDateModal] =
    useState(false);

  const [showTimeModal, setShowTimeModal] =
    useState(false);

  const [showRepeatModal, setShowRepeatModal] =
    useState(false);

  const [showReminderModal, setShowReminderModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const selectedAreaData = useMemo(
    () =>
      LIFE_AREAS.find(
        (area) =>
          area.name === selectedArea
      ) ?? LIFE_AREAS[0],
    [selectedArea]
  );

  const selectedRepeatLabel = useMemo(
    () =>
      REPEAT_OPTIONS.find(
        (option) =>
          option.value === repeat
      )?.label ?? 'Does not repeat',
    [repeat]
  );

  const selectedReminderLabel = useMemo(() => {
    if (!reminder) {
      return 'No reminder';
    }

    return (
      REMINDER_OPTIONS.find(
        (option) =>
          option.minutes ===
          reminderMinutes
      )?.label ?? '5 minutes before'
    );
  }, [
    reminder,
    reminderMinutes,
  ]);

  const displayTime = formatTime(
    selectedHour,
    selectedMinute,
    selectedPeriod
  );

  const scheduledTime = to24Hour(
    selectedHour,
    selectedMinute,
    selectedPeriod
  );

  const handleSave = async () => {
    const title = activityName.trim();

    if (!title) {
      Alert.alert(
        'Activity name required',
        'Give your activity a name so you know what you need to do.'
      );
      return;
    }

    if (title.length > 200) {
      Alert.alert(
        'Activity name too long',
        'Please keep the activity name under 200 characters.'
      );
      return;
    }

    try {
      setSaving(true);

      await createActivity({
        title,
        description: description.trim(),
        category: selectedArea,
        scheduled_date:
          getDateKey(selectedDate),
        scheduled_time: scheduledTime,
        repeat,
        priority,
        reminder,
        reminder_minutes: reminder
          ? reminderMinutes ?? 5
          : undefined,
      });

      Alert.alert(
        'Activity created 🎉',
        reminder
          ? `We'll remind you ${selectedReminderLabel.toLowerCase()}.`
          : 'Your activity has been added to your schedule.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while creating your activity.';

      Alert.alert(
        'Could not create activity',
        message
      );
    } finally {
      setSaving(false);
    }
  };

  const changeDay = (amount: number) => {
    const next = new Date(selectedDate);

    next.setDate(
      next.getDate() + amount
    );

    setSelectedDate(next);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#172033"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          New activity
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO */}

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="sparkles"
              size={30}
              color="#208AEF"
            />
          </View>

          <Text style={styles.heroTitle}>
            Plan something meaningful
          </Text>

          <Text style={styles.heroSubtitle}>
            Schedule an activity and we'll
            help you stay on track.
          </Text>
        </View>

        {/* ACTIVITY */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            ACTIVITY
          </Text>

          <TextInput
            value={activityName}
            onChangeText={setActivityName}
            placeholder="What do you want to accomplish?"
            placeholderTextColor="#98A2B3"
            style={styles.titleInput}
            maxLength={200}
            autoFocus
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description (optional)"
            placeholderTextColor="#98A2B3"
            style={[
              styles.descriptionInput,
              styles.multilineInput,
            ]}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>

        {/* LIFE AREA */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            LIFE AREA
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.horizontalOptions
            }
          >
            {LIFE_AREAS.map((area) => {
              const selected =
                selectedArea ===
                area.name;

              return (
                <Pressable
                  key={area.name}
                  onPress={() =>
                    setSelectedArea(
                      area.name
                    )
                  }
                  style={[
                    styles.areaCard,
                    selected &&
                      styles.areaCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.areaIcon,
                      selected &&
                        styles.areaIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={area.icon}
                      size={20}
                      color={
                        selected
                          ? '#FFFFFF'
                          : '#208AEF'
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.areaText,
                      selected &&
                        styles.areaTextSelected,
                    ]}
                  >
                    {area.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* WHEN */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            WHEN
          </Text>

          <View style={styles.scheduleCard}>
            {/* DATE */}

            <View style={styles.scheduleRow}>
              <View
                style={
                  styles.scheduleRowIcon
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color="#208AEF"
                />
              </View>

              <View style={styles.scheduleInfo}>
                <Text
                  style={styles.scheduleTitle}
                >
                  Date
                </Text>

                <Text
                  style={styles.scheduleValue}
                >
                  {formatDate(selectedDate)}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setShowDateModal(true)
                }
                style={
                  styles.changeButton
                }
              >
                <Text
                  style={
                    styles.changeButtonText
                  }
                >
                  Change
                </Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* TIME */}

            <View style={styles.scheduleRow}>
              <View
                style={
                  styles.scheduleRowIcon
                }
              >
                <Ionicons
                  name="time-outline"
                  size={22}
                  color="#208AEF"
                />
              </View>

              <View style={styles.scheduleInfo}>
                <Text
                  style={styles.scheduleTitle}
                >
                  Time
                </Text>

                <Text
                  style={styles.scheduleValue}
                >
                  {displayTime}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setShowTimeModal(true)
                }
                style={
                  styles.changeButton
                }
              >
                <Text
                  style={
                    styles.changeButtonText
                  }
                >
                  Change
                </Text>
              </Pressable>
            </View>
          </View>

          {/* QUICK DATES */}

          <View style={styles.quickDateRow}>
            <Pressable
              onPress={() =>
                setSelectedDate(
                  new Date()
                )
              }
              style={
                styles.quickDateButton
              }
            >
              <Text
                style={
                  styles.quickDateText
                }
              >
                Today
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const tomorrow =
                  new Date();

                tomorrow.setDate(
                  tomorrow.getDate() + 1
                );

                setSelectedDate(
                  tomorrow
                );
              }}
              style={
                styles.quickDateButton
              }
            >
              <Text
                style={
                  styles.quickDateText
                }
              >
                Tomorrow
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                changeDay(7)
              }
              style={
                styles.quickDateButton
              }
            >
              <Text
                style={
                  styles.quickDateText
                }
              >
                Next week
              </Text>
            </Pressable>
          </View>
        </View>

        {/* REPEAT */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            REPEAT
          </Text>

          <Pressable
            onPress={() =>
              setShowRepeatModal(true)
            }
            style={styles.selectCard}
          >
            <View style={styles.selectIcon}>
              <Ionicons
                name="repeat-outline"
                size={22}
                color="#208AEF"
              />
            </View>

            <View style={styles.selectContent}>
              <Text
                style={styles.selectTitle}
              >
                Repeat
              </Text>

              <Text
                style={styles.selectValue}
              >
                {selectedRepeatLabel}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#98A2B3"
            />
          </Pressable>
        </View>

        {/* PRIORITY */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            PRIORITY
          </Text>

          <View style={styles.priorityRow}>
            {PRIORITIES.map((item) => {
              const selected =
                priority === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() =>
                    setPriority(
                      item.value
                    )
                  }
                  style={[
                    styles.priorityButton,
                    selected &&
                      styles.priorityButtonSelected,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={
                      selected
                        ? '#FFFFFF'
                        : '#667085'
                    }
                  />

                  <Text
                    style={[
                      styles.priorityText,
                      selected &&
                        styles.priorityTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* REMINDER */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            REMINDER
          </Text>

          <View style={styles.reminderCard}>
            <View style={styles.reminderIcon}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#208AEF"
              />
            </View>

            <View
              style={styles.reminderContent}
            >
              <Text
                style={styles.reminderTitle}
              >
                Remind me
              </Text>

              <Text
                style={styles.reminderSubtitle}
              >
                {reminder
                  ? selectedReminderLabel
                  : 'No reminder'}
              </Text>
            </View>

            <Switch
              value={reminder}
              onValueChange={(value) => {
                setReminder(value);

                if (
                  value &&
                  reminderMinutes === null
                ) {
                  setReminderMinutes(5);
                }
              }}
              trackColor={{
                false: '#D0D5DD',
                true: '#A9D5FF',
              }}
              thumbColor={
                reminder
                  ? '#208AEF'
                  : '#F2F4F7'
              }
            />
          </View>

          {reminder && (
            <Pressable
              onPress={() =>
                setShowReminderModal(
                  true
                )
              }
              style={
                styles.reminderOption
              }
            >
              <Text
                style={
                  styles.reminderOptionText
                }
              >
                {selectedReminderLabel}
              </Text>

              <Ionicons
                name="chevron-down"
                size={18}
                color="#667085"
              />
            </Pressable>
          )}

          <View style={styles.reminderTip}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#208AEF"
            />

            <Text
              style={
                styles.reminderTipText
              }
            >
              Your reminder will be
              scheduled automatically when
              notifications are enabled.
            </Text>
          </View>
        </View>

        {/* PREVIEW */}

        <View style={styles.previewCard}>
          <Text
            style={styles.previewLabel}
          >
            PREVIEW
          </Text>

          <View style={styles.previewRow}>
            <View style={styles.previewIcon}>
              <Ionicons
                name={selectedAreaData.icon}
                size={22}
                color="#208AEF"
              />
            </View>

            <View
              style={styles.previewContent}
            >
              <Text
                style={styles.previewTitle}
                numberOfLines={2}
              >
                {activityName.trim() ||
                  'Your activity'}
              </Text>

              <Text
                style={styles.previewMeta}
              >
                {selectedArea} ·{' '}
                {formatDate(selectedDate)} ·{' '}
                {displayTime}
              </Text>
            </View>
          </View>
        </View>

        {/* SAVE */}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed &&
              styles.saveButtonPressed,
            saving &&
              styles.saveButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.saveButtonText
                }
              >
                Create activity
              </Text>
            </>
          )}
        </Pressable>

        {/* CANCEL */}

        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          style={styles.cancelButton}
        >
          <Text
            style={styles.cancelButtonText}
          >
            Cancel
          </Text>
        </Pressable>
      </ScrollView>

      {/* =====================================================
          DATE MODAL
          ===================================================== */}

      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowDateModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >
              <Text
                style={styles.modalTitle}
              >
                Choose date
              </Text>

              <Pressable
                onPress={() =>
                  setShowDateModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#172033"
                />
              </Pressable>
            </View>

            <View
              style={styles.datePreview}
            >
              <Text
                style={
                  styles.datePreviewDay
                }
              >
                {selectedDate.toLocaleDateString(
                  'en-US',
                  {
                    weekday: 'short',
                  }
                )}
              </Text>

              <Text
                style={
                  styles.datePreviewNumber
                }
              >
                {selectedDate.getDate()}
              </Text>

              <Text
                style={
                  styles.datePreviewMonth
                }
              >
                {selectedDate.toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                  }
                )}
              </Text>
            </View>

            <View
              style={styles.dateControls}
            >
              <Pressable
                onPress={() =>
                  changeDay(-1)
                }
                style={styles.dateArrow}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color="#172033"
                />
              </Pressable>

              <Text
                style={
                  styles.dateControlText
                }
                numberOfLines={1}
              >
                {formatDate(selectedDate)}
              </Text>

              <Pressable
                onPress={() =>
                  changeDay(1)
                }
                style={styles.dateArrow}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color="#172033"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setSelectedDate(
                  new Date()
                );
                setShowDateModal(false);
              }}
              style={styles.todayButton}
            >
              <Text
                style={
                  styles.todayButtonText
                }
              >
                Use today
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setShowDateModal(false)
              }
              style={
                styles.modalDoneButton
              }
            >
              <Text
                style={styles.modalDoneText}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          TIME MODAL
          ===================================================== */}

      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowTimeModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeModalCard}>
            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={styles.modalTitle}
                >
                  Choose time
                </Text>

                <Text
                  style={
                    styles.timeModalSubtitle
                  }
                >
                  Select hour, minutes and period
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setShowTimeModal(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color="#172033"
                />
              </Pressable>
            </View>

            {/* CURRENT TIME */}

            <View
              style={styles.selectedTimeBanner}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color="#208AEF"
              />

              <Text
                style={
                  styles.selectedTimeText
                }
              >
                {displayTime}
              </Text>
            </View>

            {/* PICKER */}

            <View style={styles.timePicker}>
              {/* HOUR */}

              <View
                style={styles.timePickerColumn}
              >
                <Text
                  style={styles.timePickerLabel}
                >
                  HOUR
                </Text>

                <ScrollView
                  style={styles.timeScroll}
                  contentContainerStyle={
                    styles.timeScrollContent
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {HOURS.map((hour) => {
                    const selected =
                      selectedHour ===
                      hour;

                    return (
                      <Pressable
                        key={hour}
                        onPress={() =>
                          setSelectedHour(
                            hour
                          )
                        }
                        style={[
                          styles.timeChoice,
                          selected &&
                            styles.timeChoiceSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChoiceText,
                            selected &&
                              styles.timeChoiceTextSelected,
                          ]}
                        >
                          {hour}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* MINUTES */}

              <View
                style={styles.timePickerColumn}
              >
                <Text
                  style={styles.timePickerLabel}
                >
                  MIN
                </Text>

                <ScrollView
                  style={styles.timeScroll}
                  contentContainerStyle={
                    styles.timeScrollContent
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {MINUTES.map((minute) => {
                    const selected =
                      selectedMinute ===
                      minute;

                    return (
                      <Pressable
                        key={minute}
                        onPress={() =>
                          setSelectedMinute(
                            minute
                          )
                        }
                        style={[
                          styles.timeChoice,
                          selected &&
                            styles.timeChoiceSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChoiceText,
                            selected &&
                              styles.timeChoiceTextSelected,
                          ]}
                        >
                          {String(
                            minute
                          ).padStart(
                            2,
                            '0'
                          )}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* AM / PM */}

              <View
                style={styles.periodColumn}
              >
                <Text
                  style={styles.timePickerLabel}
                >
                  PERIOD
                </Text>

                <View
                  style={
                    styles.periodChoices
                  }
                >
                  {(
                    ['AM', 'PM'] as const
                  ).map((period) => {
                    const selected =
                      selectedPeriod ===
                      period;

                    return (
                      <Pressable
                        key={period}
                        onPress={() =>
                          setSelectedPeriod(
                            period
                          )
                        }
                        style={[
                          styles.periodChoice,
                          selected &&
                            styles.periodChoiceSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodChoiceText,
                            selected &&
                              styles.periodChoiceTextSelected,
                          ]}
                        >
                          {period}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* TIME EXPLANATION */}

            <View
              style={styles.timeFormatHint}
            >
              <Ionicons
                name="information-circle-outline"
                size={17}
                color="#208AEF"
              />

              <Text
                style={
                  styles.timeFormatHintText
                }
              >
                Time will be saved as{' '}
                <Text
                  style={
                    styles.timeFormatStrong
                  }
                >
                  {scheduledTime}
                </Text>{' '}
                for your schedule.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setShowTimeModal(false)
              }
              style={
                styles.modalDoneButton
              }
            >
              <Text
                style={styles.modalDoneText}
              >
                Set time · {displayTime}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          REPEAT MODAL
          ===================================================== */}

      <Modal
        visible={showRepeatModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowRepeatModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >
              <Text
                style={styles.modalTitle}
              >
                Repeat activity
              </Text>

              <Pressable
                onPress={() =>
                  setShowRepeatModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#172033"
                />
              </Pressable>
            </View>

            {REPEAT_OPTIONS.map(
              (option) => {
                const selected =
                  repeat ===
                  option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setRepeat(
                        option.value
                      );
                      setShowRepeatModal(
                        false
                      );
                    }}
                    style={[
                      styles.modalOption,
                      selected &&
                        styles.modalOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selected &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={21}
                        color="#208AEF"
                      />
                    )}
                  </Pressable>
                );
              }
            )}
          </View>
        </View>
      </Modal>

      {/* =====================================================
          REMINDER MODAL
          ===================================================== */}

      <Modal
        visible={showReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowReminderModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >
              <Text
                style={styles.modalTitle}
              >
                Reminder time
              </Text>

              <Pressable
                onPress={() =>
                  setShowReminderModal(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#172033"
                />
              </Pressable>
            </View>

            {REMINDER_OPTIONS.map(
              (option) => {
                const selected =
                  reminderMinutes ===
                  option.minutes;

                return (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      setReminderMinutes(
                        option.minutes
                      );
                      setReminder(true);
                      setShowReminderModal(
                        false
                      );
                    }}
                    style={[
                      styles.modalOption,
                      selected &&
                        styles.modalOptionSelected,
                    ]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.modalOptionText,
                          selected &&
                            styles.modalOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {option.minutes ===
                        5 && (
                        <Text
                          style={
                            styles.recommendedText
                          }
                        >
                          Recommended
                        </Text>
                      )}
                    </View>

                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={21}
                        color="#208AEF"
                      />
                    )}
                  </Pressable>
                );
              }
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#F6F8FC',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#172033',
  },

  headerSpacer: {
    width: 42,
  },

  container: {
    padding: 20,
    paddingBottom: 50,
  },

  hero: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 26,
  },

  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  heroSubtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
    textAlign: 'center',
    maxWidth: 330,
  },

  section: {
    marginBottom: 25,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#98A2B3',
    marginBottom: 10,
  },

  titleInput: {
    minHeight: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 17,
    fontSize: 16,
    color: '#172033',
    fontWeight: '600',
  },

  descriptionInput: {
    minHeight: 92,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 17,
    paddingTop: 16,
    fontSize: 14,
    color: '#172033',
    marginTop: 10,
  },

  multilineInput: {
    textAlignVertical: 'top',
  },

  horizontalOptions: {
    gap: 9,
  },

  areaCard: {
    width: 104,
    minHeight: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  areaCardSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },

  areaIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  areaIconSelected: {
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  areaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#344054',
  },

  areaTextSelected: {
    color: '#FFFFFF',
  },

  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  scheduleRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },

  scheduleRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  scheduleInfo: {
    flex: 1,
    minWidth: 0,
  },

  scheduleTitle: {
    fontSize: 12,
    color: '#98A2B3',
    fontWeight: '600',
  },

  scheduleValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#172033',
    fontWeight: '700',
  },

  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  changeButtonText: {
    color: '#208AEF',
    fontSize: 13,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
  },

  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  quickDateButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickDateText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '700',
  },

  selectCard: {
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  selectIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  selectContent: {
    flex: 1,
  },

  selectTitle: {
    fontSize: 12,
    color: '#98A2B3',
    fontWeight: '600',
  },

  selectValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#172033',
    fontWeight: '700',
  },

  priorityRow: {
    flexDirection: 'row',
    gap: 9,
  },

  priorityButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  priorityButtonSelected: {
    backgroundColor: '#172033',
    borderColor: '#172033',
  },

  priorityText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },

  priorityTextSelected: {
    color: '#FFFFFF',
  },

  reminderCard: {
    minHeight: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  reminderIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  reminderContent: {
    flex: 1,
    minWidth: 0,
  },

  reminderTitle: {
    fontSize: 14,
    color: '#172033',
    fontWeight: '700',
  },

  reminderSubtitle: {
    marginTop: 4,
    color: '#667085',
    fontSize: 12,
  },

  reminderOption: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    marginTop: 8,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  reminderOptionText: {
    fontSize: 13,
    color: '#344054',
    fontWeight: '600',
  },

  reminderTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EAF4FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 9,
  },

  reminderTipText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    color: '#526074',
  },

  previewCard: {
    backgroundColor: '#172033',
    borderRadius: 21,
    padding: 18,
    marginBottom: 18,
  },

  previewLabel: {
    color: '#98A2B3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 13,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  previewContent: {
    flex: 1,
    minWidth: 0,
  },

  previewTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  previewMeta: {
    color: '#AAB4C5',
    fontSize: 11,
    marginTop: 5,
    lineHeight: 17,
  },

  saveButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  saveButtonPressed: {
    opacity: 0.85,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  cancelButtonText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
  },

  /* =====================================================
     MODALS
     ===================================================== */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(23,32,51,0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#F6F8FC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom:
      Platform.OS === 'ios'
        ? 36
        : 24,
  },

  timeModalCard: {
    backgroundColor: '#F6F8FC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom:
      Platform.OS === 'ios'
        ? 36
        : 24,
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D0D5DD',
    alignSelf: 'center',
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#172033',
  },

  timeModalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#667085',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* =====================================================
     DATE MODAL
     ===================================================== */

  datePreview: {
    alignItems: 'center',
    backgroundColor: '#172033',
    borderRadius: 22,
    paddingVertical: 18,
    marginBottom: 15,
  },

  datePreviewDay: {
    color: '#AAB4C5',
    fontSize: 12,
    fontWeight: '700',
  },

  datePreviewNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    marginVertical: 2,
  },

  datePreviewMonth: {
    color: '#D7DEEA',
    fontSize: 13,
  },

  dateControls: {
    height: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },

  dateArrow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F6F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateControlText: {
    flex: 1,
    textAlign: 'center',
    color: '#172033',
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 8,
  },

  todayButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  todayButtonText: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* =====================================================
     TIME PICKER
     ===================================================== */

  selectedTimeBanner: {
    minHeight: 62,
    borderRadius: 17,
    backgroundColor: '#EAF4FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 9,
  },

  selectedTimeText: {
    color: '#172033',
    fontSize: 24,
    fontWeight: '800',
  },

  timePicker: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },

  timePickerColumn: {
    width: 76,
    minWidth: 0,
  },

  timePickerLabel: {
    color: '#98A2B3',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },

  timeScroll: {
    height: 235,
  },

  timeScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },

  timeChoice: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  timeChoiceSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },

  timeChoiceText: {
    color: '#344054',
    fontSize: 16,
    fontWeight: '700',
  },

  timeChoiceTextSelected: {
    color: '#FFFFFF',
  },

  periodColumn: {
    width: 70,
    minWidth: 0,
  },

  periodChoices: {
    gap: 8,
  },

  periodChoice: {
    width: 70,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  periodChoiceSelected: {
    backgroundColor: '#172033',
    borderColor: '#172033',
  },

  periodChoiceText: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '800',
  },

  periodChoiceTextSelected: {
    color: '#FFFFFF',
  },

  timeFormatHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 12,
    marginTop: 12,
  },

  timeFormatHintText: {
    flex: 1,
    marginLeft: 8,
    color: '#667085',
    fontSize: 11,
    lineHeight: 17,
  },

  timeFormatStrong: {
    color: '#172033',
    fontWeight: '800',
  },

  /* =====================================================
     COMMON MODAL CONTROLS
     ===================================================== */

  modalDoneButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  modalOption: {
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  modalOptionSelected: {
    borderColor: '#A9D5FF',
    backgroundColor: '#EAF4FF',
  },

  modalOptionText: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
  },

  modalOptionTextSelected: {
    color: '#208AEF',
    fontWeight: '800',
  },

  recommendedText: {
    color: '#208AEF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
});