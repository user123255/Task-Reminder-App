import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

const COLORS = {
  primary: '#208AEF',
  background: '#F6F8FC',
  card: '#FFFFFF',
  text: '#172033',
  muted: '#718096',
  border: '#E7ECF3',
  blueSoft: '#EAF4FF',
  graySoft: '#F5F7FA',
  white: '#FFFFFF',
  navy: '#172033',
};

type Route =
  | '/'
  | '/tasks'
  | '/calendar'
  | '/library'
  | '/reports'
  | '/ai-assist'
  | '/meetings'
  | '/trash'
  | '/help'
  | '/settings';

type NavItem = {
  route: Route;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const WORKSPACE_ITEMS: NavItem[] = [
  {
    route: '/',
    label: 'Home',
    icon: 'home-outline',
  },
  {
    route: '/tasks',
    label: 'Tasks',
    icon: 'checkmark-circle-outline',
  },
  {
    route: '/calendar',
    label: 'Calendar',
    icon: 'calendar-outline',
  },
  {
    route: '/library',
    label: 'Library',
    icon: 'library-outline',
  },
  {
    route: '/reports',
    label: 'Reports',
    icon: 'bar-chart-outline',
  },
  {
    route: '/ai-assist',
    label: 'AI Assist',
    icon: 'sparkles-outline',
  },
  {
    route: '/meetings',
    label: 'Meetings',
    icon: 'videocam-outline',
  },
];

const SUPPORT_ITEMS: NavItem[] = [
  {
    route: '/trash',
    label: 'Trash',
    icon: 'trash-outline',
  },
  {
    route: '/help',
    label: 'Help',
    icon: 'help-circle-outline',
  },
  {
    route: '/settings',
    label: 'Settings',
    icon: 'settings-outline',
  },
];

const PUBLIC_ROUTES = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/update-password',
]);

export function TaskFlowMobileSidebar({
  collapsed,
  onToggle,
}: SidebarProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { displayName } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const isPhone = width < 700;
  const isDesktop = width >= 1100;

  const sidebarWidth = collapsed ? 82 : 260;

  const initials = useMemo(() => {
    const clean = (displayName || '').trim();

    if (!clean) {
      return 'U';
    }

    const words = clean.split(/\s+/);

    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }

    return clean.charAt(0).toUpperCase();
  }, [displayName]);

  if (PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  const navigate = (route: Route) => {
    if (pathname !== route) {
      router.replace(route);
    }

    setMobileOpen(false);
  };

  const isActive = (route: Route) => {
    if (route === '/') {
      return pathname === '/';
    }

    return (
      pathname === route ||
      pathname.startsWith(`${route}/`)
    );
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.route);

    return (
      <Pressable
        key={item.route}
        onPress={() => navigate(item.route)}
        style={({ pressed }) => [
          styles.navItem,
          collapsed && styles.navItemCollapsed,
          active && styles.navItemActive,
          pressed && styles.navItemPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View
          style={[
            styles.navIconContainer,
            active && styles.navIconContainerActive,
          ]}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={
              active
                ? COLORS.primary
                : COLORS.muted
            }
          />
        </View>

        {!collapsed && (
          <Text
            style={[
              styles.navLabel,
              active && styles.navLabelActive,
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        )}
      </Pressable>
    );
  };

  const sidebarContent = (
    <View
      style={[
        styles.sidebar,
        {
          width: sidebarWidth,
        },
      ]}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          collapsed && styles.headerCollapsed,
        ]}
      >
        <Pressable
          onPress={() => navigate('/')}
          style={[
            styles.brandButton,
            collapsed && styles.brandButtonCollapsed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go to TaskFlow home"
        >
          {/* TASKFLOW LOGO */}
          <View style={styles.logo}>
            <Text style={styles.logoText}>T</Text>

            <View style={styles.logoCheck}>
              <View style={styles.logoCheckShort} />
              <View style={styles.logoCheckLong} />
            </View>
          </View>

          {!collapsed && (
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>
                TaskFlow
              </Text>

              <Text style={styles.brandSubtitle}>
                Personal workspace
              </Text>
            </View>
          )}
        </Pressable>

        {isDesktop && (
          <Pressable
            onPress={onToggle}
            style={styles.collapseButton}
            accessibilityRole="button"
            accessibilityLabel={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
            <Ionicons
              name={
                collapsed
                  ? 'chevron-forward'
                  : 'chevron-back'
              }
              size={18}
              color={COLORS.muted}
            />
          </Pressable>
        )}

        {isPhone && (
          <Pressable
            onPress={() => setMobileOpen(false)}
            style={styles.collapseButton}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <Ionicons
              name="close"
              size={22}
              color={COLORS.muted}
            />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!collapsed && (
          <Text style={styles.sectionLabel}>
            WORKSPACE
          </Text>
        )}

        <View style={styles.navSection}>
          {WORKSPACE_ITEMS.map(renderNavItem)}
        </View>

        <View style={styles.supportSection}>
          {!collapsed && (
            <Text style={styles.sectionLabel}>
              SUPPORT
            </Text>
          )}

          {SUPPORT_ITEMS.map(renderNavItem)}
        </View>
      </ScrollView>

      {/* PROFILE */}
      <Pressable
        onPress={() => navigate('/settings')}
        style={[
          styles.profile,
          collapsed && styles.profileCollapsed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open profile settings"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials}
          </Text>
        </View>

        {!collapsed && (
          <View style={styles.profileInfo}>
            <Text
              style={styles.profileName}
              numberOfLines={1}
            >
              {displayName || 'User'}
            </Text>

            <Text
              style={styles.profileWorkspace}
              numberOfLines={1}
            >
              Personal workspace
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );

  /*
   * PHONE
   *
   * The global sidebar becomes an overlay drawer.
   */
  if (isPhone) {
    return (
      <>
        <Pressable
          onPress={() => setMobileOpen(true)}
          style={styles.mobileMenuButton}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Ionicons
            name="menu"
            size={24}
            color={COLORS.text}
          />
        </Pressable>

        <Modal
          visible={mobileOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setMobileOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setMobileOpen(false)}
            />

            <SafeAreaView style={styles.mobileDrawer}>
              {sidebarContent}
            </SafeAreaView>
          </View>
        </Modal>
      </>
    );
  }

  /*
   * TABLET + DESKTOP
   */
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.desktopContainer,
        {
          width: sidebarWidth,
        },
      ]}
    >
      {sidebarContent}
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 50,
  },

  sidebar: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    overflow: 'hidden',
  },

  header: {
    minHeight: 82,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerCollapsed: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  brandButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  brandButtonCollapsed: {
    flex: 0,
  },

  /*
   * TASKFLOW BRAND MARK
   */
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  logoText: {
    color: COLORS.white,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: -2,
  },

  logoCheck: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 15,
    height: 12,
  },

  logoCheckShort: {
    position: 'absolute',
    left: 0,
    top: 5,
    width: 6,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  logoCheckLong: {
    position: 'absolute',
    left: 4,
    top: 3,
    width: 11,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  brandTextContainer: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },

  brandName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  brandSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  collapseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.graySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 8,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 16,
  },

  sectionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginHorizontal: 8,
    marginBottom: 9,
  },

  navSection: {
    gap: 4,
  },

  supportSection: {
    marginTop: 26,
    gap: 4,
  },

  navItem: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },

  navItemActive: {
    backgroundColor: COLORS.blueSoft,
  },

  navItemPressed: {
    opacity: 0.72,
  },

  navIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIconContainerActive: {
    backgroundColor: COLORS.card,
  },

  navLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  profile: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },

  profileCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  profileName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },

  profileWorkspace: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },

  mobileMenuButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 32, 51, 0.35)',
  },

  mobileDrawer: {
    width: 290,
    height: '100%',
    backgroundColor: COLORS.card,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 6,
      height: 0,
    },
    elevation: 12,
  },
});

export default TaskFlowMobileSidebar;