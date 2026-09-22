import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  usePathname,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

import { Colors, Radii, Shadows } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TaskFlowSettingsProvider } from "@/hooks/use-taskflow-settings";
import TaskFlowMobileSidebar from "@/components/taskflow-mobile-sidebar";

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: Radii.xl,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.primary,
          marginBottom: 20,
          ...Shadows.elevated,
        }}
      >
        <ActivityIndicator
          size="small"
          color={Colors.white}
        />
      </View>

      <View
        style={{
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 100,
            height: 6,
            borderRadius: 3,
            backgroundColor: Colors.primaryLight,
            marginBottom: 8,
          }}
        />

        <View
          style={{
            width: 70,
            height: 5,
            borderRadius: 3,
            backgroundColor: Colors.borderLight,
          }}
        />
      </View>
    </View>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { session, loading } = useAuth();
  const pathname = usePathname();

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const isAuthScreen =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  /*
   * Responsive breakpoints
   *
   * Phone:    < 700
   * Tablet:   700 - 1099
   * Desktop:  1100+
   */
  const isPhone = width < 700;
  const isTablet =
    width >= 700 && width < 1100;
  const isDesktop = width >= 1100;

  /*
   * Keep the layout width synchronized with the
   * actual sidebar state.
   *
   * Desktop:
   * expanded = 260
   * collapsed = 82
   *
   * Tablet:
   * compact = 82
   *
   * Phone:
   * sidebar becomes an overlay = 0
   */
  const sidebarSpace = isPhone
    ? 0
    : isTablet
      ? 82
      : sidebarCollapsed
        ? 82
        : 260;

  /*
   * The sidebar itself receives the same collapsed
   * state that the layout uses for its content width.
   */
  const effectiveSidebarCollapsed =
    isPhone
      ? false
      : isTablet
        ? true
        : sidebarCollapsed;

  useEffect(() => {
    if (loading) {
      return;
    }

    /*
     * Allow password recovery to complete while
     * Supabase processes the recovery session.
     */
    if (pathname === "/reset-password") {
      return;
    }

    /*
     * Protect authenticated application routes.
     */
    if (!session && !isAuthScreen) {
      router.replace("/login");
      return;
    }

    /*
     * Prevent authenticated users from remaining
     * on authentication screens.
     */
    if (
      session &&
      (pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/forgot-password")
    ) {
      router.replace("/");
    }
  }, [
    session,
    loading,
    isAuthScreen,
    pathname,
  ]);

  if (loading) {
    return <LoadingScreen />;
  }

  /*
   * =========================================================
   * AUTHENTICATION
   * =========================================================
   */
  if (isAuthScreen || !session) {
    return (
      <ThemeProvider
        value={
          colorScheme === "dark"
            ? DarkTheme
            : DefaultTheme
        }
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: {
              backgroundColor:
                colorScheme === "dark"
                  ? "#0F172A"
                  : Colors.background,
            },
          }}
        >
          <Stack.Screen
            name="login"
            options={{
              animation: "fade",
            }}
          />

          <Stack.Screen
            name="signup"
            options={{
              animation: "slide_from_right",
            }}
          />

          <Stack.Screen
            name="forgot-password"
            options={{
              animation: "slide_from_right",
            }}
          />

          <Stack.Screen
            name="reset-password"
            options={{
              animation: "slide_from_right",
            }}
          />

          <Stack.Screen
            name="index"
            options={{
              animation: "fade",
            }}
          />
        </Stack>

        <StatusBar
          style={
            colorScheme === "dark"
              ? "light"
              : "dark"
          }
        />
      </ThemeProvider>
    );
  }

  /*
   * =========================================================
   * AUTHENTICATED TASKFLOW WORKSPACE
   * =========================================================
   *
   * ONE global sidebar.
   *
   * Individual screens must NOT render their own
   * desktop or mobile navigation.
   */
  return (
    <ThemeProvider
      value={
        colorScheme === "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          backgroundColor:
            colorScheme === "dark"
              ? "#0F172A"
              : Colors.background,
        }}
      >
        {/* ===================================================
            GLOBAL TASKFLOW SIDEBAR
        =================================================== */}

        <TaskFlowMobileSidebar
          collapsed={effectiveSidebarCollapsed}
          onToggle={() => {
            if (isDesktop) {
              setSidebarCollapsed(
                (current) => !current,
              );
            }
          }}
        />

        {/* ===================================================
            MAIN APPLICATION AREA
        =================================================== */}

        <View
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: sidebarSpace,
          }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              animationDuration: 180,
              contentStyle: {
                backgroundColor:
                  colorScheme === "dark"
                    ? "#0F172A"
                    : Colors.background,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="tasks"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="add-activity"
              options={{
                animation: "slide_from_right",
              }}
            />

            <Stack.Screen
              name="calendar"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="library"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="reports"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="ai-assist"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="meetings"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="settings"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="help"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="trash"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="explore"
              options={{
                animation: "fade",
              }}
            />

            <Stack.Screen
              name="security"
              options={{
                animation: "fade",
              }}
            />
          </Stack>
        </View>
      </View>

      <StatusBar
        style={
          colorScheme === "dark"
            ? "light"
            : "dark"
        }
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TaskFlowSettingsProvider>
        <RootNavigator />
      </TaskFlowSettingsProvider>
    </AuthProvider>
  );
}