import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  usePathname,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  View,
  useColorScheme,
} from "react-native";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TaskFlowSettingsProvider } from "@/hooks/use-taskflow-settings";
import { Colors, Radii, Shadows } from "@/constants/theme";

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
  const { session, loading } = useAuth();
  const pathname = usePathname();

  const isAuthScreen =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  useEffect(() => {
    if (loading) {
      return;
    }

    if (pathname === "/reset-password") {
      return;
    }

    if (!session && !isAuthScreen) {
      router.replace("/login");
      return;
    }

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
          name="login"
          options={{ animation: "fade" }}
        />

        <Stack.Screen
          name="signup"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="forgot-password"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="reset-password"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="index"
          options={{ animation: "fade" }}
        />

        <Stack.Screen
          name="tasks"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="add-activity"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="calendar"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="library"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="reports"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="ai"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="meetings"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="settings"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="help"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="trash"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="explore"
          options={{ animation: "slide_from_right" }}
        />

        <Stack.Screen
          name="security"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>

      <StatusBar
        style={colorScheme === "dark" ? "light" : "dark"}
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