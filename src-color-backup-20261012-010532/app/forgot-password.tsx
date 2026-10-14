
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/utils/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
redirectTo: "http://localhost:8081/reset-password",        }
      );

      if (error) {
        Alert.alert("Unable to send reset email", error.message);
        return;
      }

      setSent(true);
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔐</Text>
            </View>

            <Text style={styles.title}>Forgot your password?</Text>

            <Text style={styles.subtitle}>
              Enter the email address associated with your account and
              we'll send you a link to reset your password.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✓</Text>

              <Text style={styles.successTitle}>
                Check your email
              </Text>

              <Text style={styles.successText}>
                We've sent a password reset link to{" "}
                <Text style={styles.emailText}>{email.trim()}</Text>.
                Check your inbox and follow the instructions.
              </Text>

              <Pressable
                onPress={() => setSent(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Try another email
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#98A2B3"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />

              <Pressable
                onPress={handleResetPassword}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  loading && styles.disabledButton,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Send reset link
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Remember your password?{" "}
            </Text>

            <Link href="/login" asChild>
              <Pressable>
                <Text style={styles.loginLink}>Log in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: "#172033",
    marginRight: 4,
  },

  backLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#172033",
  },

  header: {
    alignItems: "center",
    marginTop: 40,
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E7F2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  icon: {
    fontSize: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#667085",
    textAlign: "center",
    maxWidth: 360,
  },

  form: {
    marginTop: 40,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 8,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#D9E0EA",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#172033",
  },

  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 40,
    borderWidth: 1,
    borderColor: "#E5EAF1",
  },

  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E8F7EF",
    color: "#20A464",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
  },

  successTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 10,
  },

  successText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#667085",
    textAlign: "center",
  },

  emailText: {
    fontWeight: "700",
    color: "#172033",
  },

  secondaryButton: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  secondaryButtonText: {
    color: "#208AEF",
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    paddingVertical: 30,
  },

  footerText: {
    color: "#667085",
    fontSize: 14,
  },

  loginLink: {
    color: "#208AEF",
    fontSize: 14,
    fontWeight: "700",
  },
});