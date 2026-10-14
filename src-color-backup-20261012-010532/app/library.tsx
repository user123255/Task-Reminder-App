import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  createLibraryResource,
  deleteLibraryResource,
  fetchLibraryResources,
  toggleLibraryFavorite,
  updateLibraryResource,
  type LibraryResource,
  type LibraryResourceType,
} from "@/services/library";

import {
  Colors,
  Layout,
  Radii,
  Shadows,
} from "@/constants/theme";

const RESOURCE_TYPES: LibraryResourceType[] = [
  "Note",
  "Document",
  "Link",
  "File",
];

const CATEGORIES = [
  "All",
  "Documents",
  "Notes",
  "Links",
  "Favorites",
];

const LIBRARY_CATEGORIES = [
  "Personal",
  "Education",
  "Career",
  "Projects",
  "Resources",
  "Meetings",
  "Other",
];

const getIcon = (type: LibraryResourceType) => {
  switch (type) {
    case "Document":
      return "document-text-outline";
    case "Note":
      return "create-outline";
    case "Link":
      return "link-outline";
    case "File":
      return "folder-outline";
    default:
      return "document-outline";
  }
};

const getIconColor = (type: LibraryResourceType) => {
  switch (type) {
    case "Document":
      return Colors.primary;

    case "Note":
      return Colors.warning;

    case "Link":
      return Colors.success;

    case "File":
      return Colors.navy;

    default:
      return Colors.primary;
  }
};

const getIconBackground = (
  type: LibraryResourceType,
) => {
  switch (type) {
    case "Document":
      return Colors.primaryLight;

    case "Note":
      return Colors.warningLight;

    case "Link":
      return Colors.successLight;

    case "File":
      return "#EAF0F7";

    default:
      return Colors.primaryLight;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const now = new Date();
  const difference =
    now.getTime() - date.getTime();

  if (difference < 60 * 1000) {
    return "Just now";
  }

  if (difference < 60 * 60 * 1000) {
    const minutes = Math.floor(
      difference / (60 * 1000),
    );

    return `${minutes}m ago`;
  }

  if (difference < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(
      difference / (60 * 60 * 1000),
    );

    return `${hours}h ago`;
  }

  if (difference < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(
      difference / (24 * 60 * 60 * 1000),
    );

    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function LibraryScreen() {
  const [items, setItems] = useState<
    LibraryResource[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState("All");

  const [showEditor, setShowEditor] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState<LibraryResource | null>(null);

  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] =
    useState("");
  const [formType, setFormType] =
    useState<LibraryResourceType>("Note");
  const [formCategory, setFormCategory] =
    useState("Personal");
  const [formUrl, setFormUrl] = useState("");
  const [formContent, setFormContent] =
    useState("");

  const loadLibrary = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const resources =
          await fetchLibraryResources();

        setItems(resources);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load your Library.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.title
          .toLowerCase()
          .includes(query) ||
        item.description
          .toLowerCase()
          .includes(query) ||
        item.category
          .toLowerCase()
          .includes(query) ||
        item.type
          .toLowerCase()
          .includes(query);

      let matchesCategory = true;

      if (activeCategory === "Documents") {
        matchesCategory =
          item.type === "Document";
      } else if (activeCategory === "Notes") {
        matchesCategory = item.type === "Note";
      } else if (activeCategory === "Links") {
        matchesCategory = item.type === "Link";
      } else if (activeCategory === "Favorites") {
        matchesCategory = item.favorite;
      }

      return (
        matchesSearch && matchesCategory
      );
    });
  }, [items, search, activeCategory]);

  const totalResources = items.length;

  const totalFavorites = items.filter(
    (item) => item.favorite,
  ).length;

  const totalDocuments = items.filter(
    (item) => item.type === "Document",
  ).length;

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormType("Note");
    setFormCategory("Personal");
    setFormUrl("");
    setFormContent("");
    setEditingItem(null);
  };

  const openCreateEditor = () => {
    resetForm();
    setShowEditor(true);
  };

  const openEditEditor = (
    item: LibraryResource,
  ) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(
      item.description ?? "",
    );
    setFormType(item.type);
    setFormCategory(
      item.category || "Personal",
    );
    setFormUrl(item.url ?? "");
    setFormContent(item.content ?? "");
    setShowEditor(true);
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setShowEditor(false);
    resetForm();
  };

  const saveResource = async () => {
    const title = formTitle.trim();

    if (!title) {
      Alert.alert(
        "Title required",
        "Please give your resource a title.",
      );

      return;
    }

    if (
      formType === "Link" &&
      formUrl.trim() === ""
    ) {
      Alert.alert(
        "Link required",
        "Please enter the URL for this resource.",
      );

      return;
    }

    try {
      setSaving(true);

      if (editingItem) {
        const updated =
          await updateLibraryResource(
            editingItem.id,
            {
              title,
              description:
                formDescription.trim(),
              type: formType,
              category:
                formCategory.trim() ||
                "Personal",
              url:
                formType === "Link"
                  ? formUrl.trim()
                  : formUrl.trim() || null,
              content:
                formContent.trim() || null,
            },
          );

        setItems((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
        );
      } else {
        const created =
          await createLibraryResource({
            title,
            description:
              formDescription.trim(),
            type: formType,
            category:
              formCategory.trim() ||
              "Personal",
            url:
              formUrl.trim() || null,
            content:
              formContent.trim() || null,
            favorite: false,
          });

        setItems((current) => [
          created,
          ...current,
        ]);
      }

      setShowEditor(false);
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save this resource.";

      Alert.alert(
        "Could not save",
        message,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (
    item: LibraryResource,
  ) => {
    const nextFavorite = !item.favorite;

    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              favorite: nextFavorite,
            }
          : currentItem,
      ),
    );

    try {
      await toggleLibraryFavorite(
        item.id,
        nextFavorite,
      );
    } catch (err) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                favorite: item.favorite,
              }
            : currentItem,
        ),
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to update favorite.";

      Alert.alert(
        "Could not update",
        message,
      );
    }
  };

  const removeResource = async (
    item: LibraryResource,
  ) => {
    try {
      await deleteLibraryResource(item.id);

      setItems((current) =>
        current.filter(
          (currentItem) =>
            currentItem.id !== item.id,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete this resource.";

      Alert.alert(
        "Could not delete",
        message,
      );
    }
  };

  const handleDelete = (
    item: LibraryResource,
  ) => {
    const remove = () => {
      void removeResource(item);
    };

    if (Platform.OS === "web") {
      const confirmed =
        window.confirm(
          `Remove "${item.title}" from your Library?`,
        );

      if (confirmed) {
        remove();
      }

      return;
    }

    Alert.alert(
      "Remove resource",
      `Are you sure you want to remove "${item.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: remove,
        },
      ],
    );
  };

  const handleResourceMenu = (
    item: LibraryResource,
  ) => {
    if (Platform.OS === "web") {
      const shouldEdit =
        window.confirm(
          `Edit "${item.title}"?\n\nChoose Cancel to delete it instead.`,
        );

      if (shouldEdit) {
        openEditEditor(item);
      } else {
        handleDelete(item);
      }

      return;
    }

    Alert.alert(
      item.title,
      "What would you like to do?",
      [
        {
          text: "Edit",
          onPress: () =>
            openEditEditor(item),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            handleDelete(item),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  const goHome = () => {
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* =====================================================
            HEADER
        ====================================================== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.backButton}
              onPress={goHome}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={Colors.navy}
              />
            </Pressable>

            <View>
              <Text style={styles.title}>
                Library
              </Text>

              <Text style={styles.subtitle}>
                Keep your important resources
                organized
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={openCreateEditor}
          >
            <Ionicons
              name="add"
              size={20}
              color={Colors.white}
            />

            <Text style={styles.addButtonText}>
              Add resource
            </Text>
          </Pressable>
        </View>

        {/* =====================================================
            SEARCH
        ====================================================== */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.textSecondary}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your library..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch("")}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {/* =====================================================
            FILTERS
        ====================================================== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.categoryList
          }
        >
          {CATEGORIES.map((category) => {
            const active =
              activeCategory === category;

            return (
              <Pressable
                key={category}
                style={[
                  styles.categoryButton,
                  active &&
                    styles.categoryButtonActive,
                ]}
                onPress={() =>
                  setActiveCategory(category)
                }
              >
                <Text
                  style={[
                    styles.categoryText,
                    active &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* =====================================================
            ERROR
        ====================================================== */}
        {error !== "" && (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={Colors.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Library could not load
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>

            <Pressable
              style={styles.retryButton}
              onPress={() =>
                loadLibrary(true)
              }
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {/* =====================================================
            STATISTICS
        ====================================================== */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    Colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="library-outline"
                size={21}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.statValue}>
              {totalResources}
            </Text>

            <Text style={styles.statLabel}>
              Total resources
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    Colors.warningLight,
                },
              ]}
            >
              <Ionicons
                name="star-outline"
                size={21}
                color={Colors.warning}
              />
            </View>

            <Text style={styles.statValue}>
              {totalFavorites}
            </Text>

            <Text style={styles.statLabel}>
              Favorites
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    Colors.successLight,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={21}
                color={Colors.success}
              />
            </View>

            <Text style={styles.statValue}>
              {totalDocuments}
            </Text>

            <Text style={styles.statLabel}>
              Documents
            </Text>
          </View>
        </View>

        {/* =====================================================
            SECTION HEADER
        ====================================================== */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your resources
            </Text>

            <Text style={styles.sectionSubtitle}>
              {filteredItems.length}{" "}
              {filteredItems.length === 1
                ? "resource"
                : "resources"}{" "}
              found
            </Text>
          </View>

          <Pressable
            style={styles.sortButton}
            onPress={() =>
              loadLibrary(true)
            }
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={17}
                color={Colors.textSecondary}
              />
            )}

            <Text style={styles.sortText}>
              Refresh
            </Text>
          </Pressable>
        </View>

        {/* =====================================================
            CONTENT
        ====================================================== */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color={Colors.primary}
            />

            <Text style={styles.loadingTitle}>
              Loading your Library
            </Text>

            <Text style={styles.loadingText}>
              Getting your resources from
              Supabase...
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  search.trim() ||
                  activeCategory !== "All"
                    ? "search-outline"
                    : "library-outline"
                }
                size={30}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {search.trim() ||
              activeCategory !== "All"
                ? "Nothing found"
                : "Your Library is empty"}
            </Text>

            <Text style={styles.emptyText}>
              {search.trim() ||
              activeCategory !== "All"
                ? "Try another search or choose a different category."
                : "Save notes, documents, links and other useful resources here so everything stays organized."}
            </Text>

            {!search.trim() &&
              activeCategory === "All" && (
                <Pressable
                  style={styles.emptyButton}
                  onPress={openCreateEditor}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={Colors.white}
                  />

                  <Text
                    style={
                      styles.emptyButtonText
                    }
                  >
                    Add your first resource
                  </Text>
                </Pressable>
              )}
          </View>
        ) : (
          <View style={styles.resourceGrid}>
            {filteredItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.resourceCard}
                onPress={() =>
                  openEditEditor(item)
                }
              >
                <View style={styles.resourceTop}>
                  <View
                    style={[
                      styles.resourceIcon,
                      {
                        backgroundColor:
                          getIconBackground(
                            item.type,
                          ),
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        getIcon(
                          item.type,
                        ) as any
                      }
                      size={23}
                      color={getIconColor(
                        item.type,
                      )}
                    />
                  </View>

                  <View
                    style={
                      styles.resourceActions
                    }
                  >
                    <Pressable
                      style={styles.iconButton}
                      onPress={(event) => {
                        event.stopPropagation();

                        void handleToggleFavorite(
                          item,
                        );
                      }}
                    >
                      <Ionicons
                        name={
                          item.favorite
                            ? "star"
                            : "star-outline"
                        }
                        size={19}
                        color={
                          item.favorite
                            ? Colors.warning
                            : Colors.textSecondary
                        }
                      />
                    </Pressable>

                    <Pressable
                      style={styles.iconButton}
                      onPress={(event) => {
                        event.stopPropagation();

                        handleResourceMenu(
                          item,
                        );
                      }}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={19}
                        color={
                          Colors.textSecondary
                        }
                      />
                    </Pressable>
                  </View>
                </View>

                <Text
                  style={styles.resourceTitle}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.resourceDescription
                  }
                  numberOfLines={3}
                >
                  {item.description ||
                    "No description added."}
                </Text>

                <View
                  style={styles.resourceBottom}
                >
                  <View
                    style={styles.resourceTag}
                  >
                    <Text
                      style={
                        styles.resourceTagText
                      }
                    >
                      {item.category}
                    </Text>
                  </View>

                  <Text
                    style={styles.resourceDate}
                  >
                    {formatDate(
                      item.created_at,
                    )}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* =====================================================
            INFORMATION CARD
        ====================================================== */}
        <View style={styles.integrationCard}>
          <View style={styles.integrationIcon}>
            <Ionicons
              name="cloud-outline"
              size={25}
              color={Colors.primary}
            />
          </View>

          <View
            style={styles.integrationContent}
          >
            <Text
              style={styles.integrationTitle}
            >
              Your knowledge, organized
            </Text>

            <Text
              style={styles.integrationText}
            >
              Your Library is connected to your
              TaskFlow account. Notes, documents
              and useful resources are stored
              securely with your account.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =======================================================
          RESOURCE EDITOR
      ======================================================== */}
      <Modal
        visible={showEditor}
        transparent
        animationType="fade"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <View>
                <Text
                  style={styles.editorTitle}
                >
                  {editingItem
                    ? "Edit resource"
                    : "Add to Library"}
                </Text>

                <Text
                  style={
                    styles.editorSubtitle
                  }
                >
                  {editingItem
                    ? "Update this resource"
                    : "Save something useful for later"}
                </Text>
              </View>

              <Pressable
                style={styles.modalCloseButton}
                onPress={closeEditor}
                disabled={saving}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={Colors.navy}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={
                styles.editorScrollContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >
              <Text style={styles.fieldLabel}>
                Resource type
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.typeList
                }
              >
                {RESOURCE_TYPES.map((type) => {
                  const selected =
                    formType === type;

                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.typeButton,
                        selected &&
                          styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setFormType(type)
                      }
                    >
                      <Ionicons
                        name={
                          getIcon(
                            type,
                          ) as any
                        }
                        size={17}
                        color={
                          selected
                            ? Colors.white
                            : getIconColor(
                                type,
                              )
                        }
                      />

                      <Text
                        style={[
                          styles.typeButtonText,
                          selected &&
                            styles.typeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>
                Title
              </Text>

              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g. Maternal healthcare research"
                placeholderTextColor={
                  Colors.textMuted
                }
                style={styles.input}
                autoCapitalize="sentences"
              />

              <Text style={styles.fieldLabel}>
                Category
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.categoryPicker
                }
              >
                {LIBRARY_CATEGORIES.map(
                  (category) => {
                    const selected =
                      formCategory ===
                      category;

                    return (
                      <Pressable
                        key={category}
                        style={[
                          styles.categoryPickerButton,
                          selected &&
                            styles.categoryPickerButtonActive,
                        ]}
                        onPress={() =>
                          setFormCategory(
                            category,
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.categoryPickerText,
                            selected &&
                              styles.categoryPickerTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </ScrollView>

              <Text style={styles.fieldLabel}>
                Description
              </Text>

              <TextInput
                value={formDescription}
                onChangeText={
                  setFormDescription
                }
                placeholder="What is this resource about?"
                placeholderTextColor={
                  Colors.textMuted
                }
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                multiline
                textAlignVertical="top"
              />

              {formType === "Link" && (
                <>
                  <Text
                    style={styles.fieldLabel}
                  >
                    URL
                  </Text>

                  <TextInput
                    value={formUrl}
                    onChangeText={setFormUrl}
                    placeholder="https://..."
                    placeholderTextColor={
                      Colors.textMuted
                    }
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>
              )}

              {formType !== "Link" && (
                <>
                  <Text
                    style={styles.fieldLabel}
                  >
                    Notes / content
                  </Text>

                  <TextInput
                    value={formContent}
                    onChangeText={setFormContent}
                    placeholder="Add your notes or content here..."
                    placeholderTextColor={
                      Colors.textMuted
                    }
                    style={[
                      styles.input,
                      styles.contentArea,
                    ]}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}

              <View style={styles.editorActions}>
                <Pressable
                  style={
                    styles.cancelButton
                  }
                  onPress={closeEditor}
                  disabled={saving}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.saveButton,
                    saving &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={saveResource}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.white}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={Colors.white}
                    />
                  )}

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {editingItem
                      ? "Save changes"
                      : "Add resource"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scrollContent: {
    padding: Layout.screenPaddingDesktop,
    paddingBottom: 60,
    maxWidth: Layout.maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },

  // ============================================================
  // HEADER
  // ============================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 22,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: Colors.navy,
  },

  subtitle: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 14,
  },

  addButton: {
    minHeight: 46,
    paddingHorizontal: 17,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    ...Shadows.card,
  },

  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },

  // ============================================================
  // SEARCH
  // ============================================================

  searchContainer: {
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    minHeight: 48,
    color: Colors.text,
    fontSize: 14,
    outlineStyle: "none",
  } as any,

  // ============================================================
  // FILTERS
  // ============================================================

  categoryList: {
    gap: 9,
    paddingVertical: 18,
  },

  categoryButton: {
    height: 39,
    paddingHorizontal: 16,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
  },

  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  categoryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  categoryTextActive: {
    color: Colors.white,
  },

  // ============================================================
  // ERROR
  // ============================================================

  errorCard: {
    marginBottom: 18,
    padding: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: "#F5D0D0",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
  },

  errorText: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "#E5C2C2",
  },

  retryText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  // ============================================================
  // STATS
  // ============================================================

  statsGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 30,
  },

  statCard: {
    flex: 1,
    minHeight: 128,
    padding: 18,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.navy,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // ============================================================
  // SECTION
  // ============================================================

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.navy,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 12,
  },

  sortButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sortText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  // ============================================================
  // LOADING
  // ============================================================

  loadingCard: {
    minHeight: 240,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: Colors.navy,
  },

  loadingText: {
    marginTop: 5,
    color: Colors.textSecondary,
    fontSize: 12,
  },

  // ============================================================
  // RESOURCE GRID
  // ============================================================

  resourceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  resourceCard: {
    flexBasis: 280,
    flexGrow: 1,
    minHeight: 205,
    maxWidth: 390,
    padding: 18,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },

  resourceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
  },

  resourceActions: {
    flexDirection: "row",
    gap: 3,
  },

  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.sm,
  },

  resourceTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: Colors.navy,
  },

  resourceDescription: {
    marginTop: 7,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  resourceBottom: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  resourceTag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },

  resourceTagText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },

  resourceDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ============================================================
  // EMPTY STATE
  // ============================================================

  emptyCard: {
    minHeight: 280,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: Radii.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.navy,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 430,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  emptyButton: {
    marginTop: 18,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  emptyButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  // ============================================================
  // INFORMATION CARD
  // ============================================================

  integrationCard: {
    marginTop: 26,
    padding: 19,
    borderRadius: Radii.lg,
    backgroundColor: Colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  integrationIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  integrationContent: {
    flex: 1,
  },

  integrationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.white,
  },

  integrationText: {
    marginTop: 4,
    color: "#C8D3E1",
    fontSize: 12,
    lineHeight: 18,
  },

  // ============================================================
  // MODAL
  // ============================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  editorCard: {
    width: "100%",
    maxWidth: Layout.maxModalWidth,
    maxHeight: "92%",
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    overflow: "hidden",
    ...Shadows.floating,
  },

  editorHeader: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  editorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.navy,
  },

  editorSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  editorScroll: {
    flexGrow: 0,
  },

  editorScrollContent: {
    padding: 22,
    paddingBottom: 26,
  },

  // ============================================================
  // FORM
  // ============================================================

  fieldLabel: {
    marginTop: 15,
    marginBottom: 8,
    color: Colors.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  typeList: {
    gap: 8,
  },

  typeButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  typeButtonText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "700",
  },

  typeButtonTextActive: {
    color: Colors.white,
  },

  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSoft,
    color: Colors.text,
    fontSize: 13,
    outlineStyle: "none",
  } as any,

  textArea: {
    minHeight: 90,
  },

  contentArea: {
    minHeight: 130,
  },

  categoryPicker: {
    gap: 7,
  },

  categoryPickerButton: {
    paddingHorizontal: 11,
    height: 34,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
  },

  categoryPickerButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },

  categoryPickerText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },

  categoryPickerTextActive: {
    color: Colors.primary,
  },

  // ============================================================
  // FORM ACTIONS
  // ============================================================

  editorActions: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
  },

  cancelButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  saveButton: {
    minWidth: 140,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    ...Shadows.card,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
});