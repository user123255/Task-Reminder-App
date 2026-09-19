
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '@/utils/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = async (
      event: string,
    ) => {
      if (!mounted) {
        return;
      }

      console.log('Reset password auth event:', event);

      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (session) {
          setReady(true);
        }
      } catch (error) {
        console.error(
          'Failed to check recovery session:',
          error,
        );
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert(
        'Password required',
        'Please enter a new password.',
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Your password must be at least 6 characters long.',
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Please make sure both passwords are the same.',
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Alert.alert(
          'Unable to update password',
          error.message,
        );
        return;
      }

      setUpdated(true);
    } catch (error) {
      Alert.alert(
        'Something went wrong',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (updated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>

          <Text style={styles.title}>
            Password updated
          </Text>

          <Text style={styles.subtitle}>
            Your TaskFlow password has been successfully
            updated. You can now sign in with your new
            password.
          </Text>

          <Pressable
            onPress={() => router.replace('/login')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Go to login
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔐</Text>
            </View>

            <Text style={styles.title}>
              Create a new password
            </Text>

            <Text style={styles.subtitle}>
              Choose a new password for your TaskFlow
              account.
            </Text>
          </View>

          {!ready ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="large"
                color="#208AEF"
              />

              <Text style={styles.loadingTitle}>
                Verifying reset link...
              </Text>

              <Text style={styles.loadingText}>
                Please wait while we verify your password
                reset request.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>
                New password
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your new password"
                placeholderTextColor="#98A2B3"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />

              <Text style={styles.hint}>
                Use at least 6 characters.
              </Text>

              <Text style={styles.label}>
                Confirm new password
              </Text>

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                placeholderTextColor="#98A2B3"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />

              <Pressable
                onPress={handleUpdatePassword}
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
                    Update password
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.replace('/login')}
                disabled={loading}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>
                  Back to login
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
  },

  centerContent: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E7F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  icon: {
    fontSize: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#667085',
    textAlign: 'center',
    maxWidth: 390,
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 8,
    marginTop: 18,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#D9E0EA',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#172033',
  },

  hint: {
    fontSize: 13,
    color: '#98A2B3',
    marginTop: 7,
  },

  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  disabledButton: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  backButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },

  backButtonText: {
    color: '#208AEF',
    fontSize: 15,
    fontWeight: '700',
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5EAF1',
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#172033',
    marginTop: 20,
    marginBottom: 8,
  },

  loadingText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
    textAlign: 'center',
  },

  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  successIconText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#20A464',
  },
});
