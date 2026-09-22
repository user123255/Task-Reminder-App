import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { supabase } from '@/utils/supabase';

const COLORS = {
  navy: '#071A2F',
  navy2: '#0B2239',
  navy3: '#102E4A',

  orange: '#FF7A00',
  orangeDark: '#E76500',
  orangeSoft: '#FFF1E5',

  background: '#F5F6F8',
  white: '#FFFFFF',

  text: '#172033',
  muted: '#667085',
  lightMuted: '#98A2B3',

  border: '#E2E6EB',

  success: '#15803D',
  successSoft: '#ECFDF3',

  danger: '#C62828',
  dangerSoft: '#FFF0F0',
};

export default function SignupScreen() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 420;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Please enter your display name.');
      return;
    }

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must contain at least 6 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              name: cleanName,
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user) {
        throw new Error(
          'The account could not be created.',
        );
      }

      /*
       * With Supabase Email Confirmations disabled,
       * signUp returns a live session and the user can
       * continue directly into the application.
       */
      if (!data.session) {
        throw new Error(
          'Email confirmation is still enabled in Supabase. Disable Confirm Email in Authentication settings, then create the account again.',
        );
      }

      router.replace('/');
    } catch (err) {
      console.error('Signup failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create your account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isSmallScreen &&
            styles.contentSmall,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.page,
            isSmallScreen && styles.pageSmall,
          ]}
        >
          {/* BRAND */}

          <View style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons
                name="checkmark"
                size={29}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.brand}>
              TaskFlow
            </Text>

            <Text style={styles.heroText}>
              Create your personal workspace and
              start organizing your day.
            </Text>
          </View>

          {/* SIGN UP CARD */}

          <View style={styles.card}>
            <View style={styles.orangeLine} />

            <Text style={styles.eyebrow}>
              GET STARTED
            </Text>

            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Set up your personal TaskFlow workspace
              in just a few steps.
            </Text>

            {/* ERROR */}

            {error ? (
              <View style={styles.errorBox}>
                <View style={styles.errorIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={19}
                    color={COLORS.danger}
                  />
                </View>

                <View style={styles.errorBody}>
                  <Text style={styles.errorTitle}>
                    Account creation failed
                  </Text>

                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* DISPLAY NAME */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Full name
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  displayName.length > 0 &&
                    styles.inputWrapperActive,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={
                      displayName.length > 0
                        ? COLORS.orange
                        : COLORS.lightMuted
                    }
                  />
                </View>

                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your full name"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  style={styles.input}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading}
                />
              </View>
            </View>

            {/* EMAIL */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Email address
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  email.length > 0 &&
                    styles.inputWrapperActive,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={
                      email.length > 0
                        ? COLORS.orange
                        : COLORS.lightMuted
                    }
                  />
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!loading}
                />
              </View>
            </View>

            {/* PASSWORD */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Password
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  password.length > 0 &&
                    styles.inputWrapperActive,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={
                      password.length > 0
                        ? COLORS.orange
                        : COLORS.lightMuted
                    }
                  />
                </View>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!loading}
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(
                      value => !value,
                    )
                  }
                  disabled={loading}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={19}
                    color={COLORS.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* CONFIRM PASSWORD */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Confirm password
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  confirmPassword.length > 0 &&
                    styles.inputWrapperActive,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={
                      confirmPassword.length > 0
                        ? COLORS.orange
                        : COLORS.lightMuted
                    }
                  />
                </View>

                <TextInput
                  value={confirmPassword}
                  onChangeText={
                    setConfirmPassword
                  }
                  placeholder="Repeat your password"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  style={styles.input}
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!loading}
                />

                <Pressable
                  onPress={() =>
                    setShowConfirmPassword(
                      value => !value,
                    )
                  }
                  disabled={loading}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={19}
                    color={COLORS.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* CREATE ACCOUNT */}

            <Pressable
              disabled={loading}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.primaryButton,
                loading &&
                  styles.disabled,
                pressed &&
                  !loading &&
                  styles.pressed,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color={COLORS.white}
                    size="small"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Creating account...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Create account
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.white}
                  />
                </>
              )}
            </Pressable>

            {/* LOGIN */}

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>
                Already have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.replace('/login')
                }
                disabled={loading}
              >
                <Text style={styles.loginLink}>
                  Log in →
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footer}>
            TaskFlow © 2026
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 34,
  },

  contentSmall: {
    paddingHorizontal: 14,
    paddingVertical: 22,
  },

  page: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },

  pageSmall: {
    maxWidth: 520,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
    shadowColor: COLORS.navy,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 6,
  },

  brand: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  heroText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 350,
    marginTop: 5,
  },

  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 21,
    padding: 25,
    shadowColor: COLORS.navy,
    shadowOffset: {
      width: 0,
      height: 13,
    },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },

  orangeLine: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.orange,
    marginBottom: 10,
  },

  eyebrow: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 5,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 18,
  },

  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#F2C8C8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 14,
  },

  errorIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorBody: {
    flex: 1,
    minWidth: 0,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    lineHeight: 17,
  },

  field: {
    marginBottom: 14,
  },

  label: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 7,
  },

  inputWrapper: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputWrapperActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.white,
  },

  inputIcon: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 10,
    paddingRight: 7,
    outlineStyle: 'none',
  } as any,

  eyeButton: {
    minWidth: 45,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.orange,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.18,
    shadowRadius: 13,
    elevation: 5,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.65,
  },

  pressed: {
    opacity: 0.84,
    transform: [
      {
        translateY: 1,
      },
    ],
  },

  loginRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 21,
    paddingTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  loginText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  loginLink: {
    color: COLORS.orangeDark,
    fontSize: 12,
    fontWeight: '900',
  },

  footer: {
    textAlign: 'center',
    color: COLORS.lightMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 18,
  },
});