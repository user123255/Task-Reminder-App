
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/utils/supabase";

export default function SecurityScreen() {
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        Alert.alert(
          "Email not available",
          "We couldn't find an email address for your account."
        );
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo:
            Platform.OS === "web"
              ? `${window.location.origin}/reset-password`
              : "http://localhost:8081/reset-password",
        }
      );

      if (error) {
        Alert.alert(
          "Unable to send reset email",
          error.message
        );
        return;
      }

      Alert.alert(
        "Reset link sent",
        `We've sent a password reset link to ${user.email}. Please check your inbox.`
      );
    } catch (error) {
      Alert.alert(
        "Something went wrong",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={10}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color="#172033"
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>Security</Text>
              <Text style={styles.subtitle}>
                Manage your account security
              </Text>
            </View>
          </View>

          {/* Security hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={32}
                color="#208AEF"
              />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                Your account is protected
              </Text>

              <Text style={styles.heroText}>
                Keep your password secure and make sure you can
                always access your TaskFlow account.
              </Text>
            </View>
          </View>

          {/* Password section */}
          <Text style={styles.sectionTitle}>Password</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name="key-outline"
                  size={22}
                  color="#208AEF"
                />
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>
                  Reset your password
                </Text>

                <Text style={styles.rowDescription}>
                  We'll send a secure password reset link to
                  your account email.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handlePasswordReset}
              disabled={loading}
              style={[
                styles.resetButton,
                loading && styles.disabledButton,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.resetButtonText}>
                    Send password reset link
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Account security */}
          <Text style={styles.sectionTitle}>
            Account security
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="checkmark-circle"
                size={21}
                color="#20A464"
              />

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Secure authentication
                </Text>

                <Text style={styles.infoText}>
                  Your account authentication is managed securely
                  by Supabase.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons
                name="lock-closed"
                size={21}
                color="#20A464"
              />

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Password protection
                </Text>

                <Text style={styles.infoText}>
                  Never share your TaskFlow password with anyone.
                </Text>
              </View>
            </View>
          </View>

          {/* Forgot password link */}
          <Pressable
            onPress={() => router.push("/forgot-password")}
            style={styles.forgotCard}
          >
            <View style={styles.forgotIcon}>
              <Ionicons
                name="help-circle-outline"
                size={22}
                color="#667085"
              />
            </View>

            <View style={styles.forgotContent}>
              <Text style={styles.forgotTitle}>
                Can't access your account?
              </Text>

              <Text style={styles.forgotText}>
                Use the password recovery page if you need to
                recover access to your account.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#98A2B3"
            />
          </Pressable>

          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#172033",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#667085",
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF4FF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 30,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  heroContent: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 6,
  },

  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    marginBottom: 28,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  rowContent: {
    flex: 1,
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  rowDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
  },

  resetButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#208AEF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 9,
  },

  disabledButton: {
    opacity: 0.65,
  },

  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 18,
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 4,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF1F5",
  },

  forgotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    padding: 17,
  },

  forgotIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  forgotContent: {
    flex: 1,
  },

  forgotTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 3,
  },

  forgotText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },

  bottomSpace: {
    height: 40,
  },
});