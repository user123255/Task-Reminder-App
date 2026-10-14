
import { Link, router } from 'expo-router';
import { useState } from 'react';
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

import { supabase } from '@/utils/supabase';

const COLORS = {
  navy: '#18233F',
  navy2: '#111A30',
  navy3: '#252F4D',

  lavender: '#7866E8',
  lavenderDark: '#6553D5',
  lavenderPressed: '#5644C4',
  lavenderSoft: '#EAE7FF',

  background: '#F7F7FC',
  backgroundInput: '#FAFAFE',
  white: '#FFFFFF',

  text: '#252B40',
  muted: '#667085',
  lightMuted: '#98A2B3',

  border: '#E4E7EC',
  borderLight: '#ECECF4',

  success: '#6553D5',
  successSoft: '#EAE7FF',

  danger: '#18233F',
  dangerSoft: '#F1EFFF',
};

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 420;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          'Unable to sign in. Please check your account and try again.',
        );
      }

      if (!data.session) {
        throw new Error(
          'Your account was authenticated, but no active session was created.',
        );
      }

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error(
          'Login succeeded, but your session could not be stored. Please try again.',
        );
      }

      if (Platform.OS === 'web') {
        try {
          if (rememberMe) {
            localStorage.setItem(
              'task_reminder_remember_me',
              'true',
            );
          } else {
            localStorage.removeItem(
              'task_reminder_remember_me',
            );
          }
        } catch (storageError) {
          console.warn(
            'Could not save remember-me preference:',
            storageError,
          );
        }
      }

      setSuccessMessage(
        'Welcome back! Opening your dashboard...',
      );

      setTimeout(() => {
        router.replace('/');
      }, 300);
    } catch (error) {
      console.error('LOGIN ERROR:', error);

      let message =
        'Unable to sign in. Please check your email and password.';

      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error
      ) {
        const detail = String(
          (error as { message: unknown }).message,
        );

        const lowerDetail = detail.toLowerCase();

        if (lowerDetail.includes('invalid login credentials')) {
          message =
            'The email or password is incorrect. Please check your details or reset your password.';
        } else if (lowerDetail.includes('email not confirmed')) {
          message =
            'Please confirm your email address before signing in.';
        } else {
          message = detail;
        }
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isSmallScreen && styles.scrollContentSmall,
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
                size={30}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.brandName}>TaskFlow</Text>

            <Text style={styles.heroText}>
              Stay focused, organized, and intentional with your day.
            </Text>
          </View>

          {/* LOGIN CARD */}

          <View style={styles.card}>
            <View style={styles.accentLine} />

            <Text style={styles.eyebrow}>WELCOME BACK</Text>

            <Text style={styles.title}>Sign in to TaskFlow</Text>

            <Text style={styles.subtitle}>
              Continue managing your tasks, schedule, and productivity
              in one place.
            </Text>

            {/* ERROR MESSAGE */}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <View style={styles.messageIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                </View>

                <View style={styles.messageBody}>
                  <Text style={styles.errorTitle}>
                    Sign in failed
                  </Text>
                  <Text style={styles.errorText}>
                    {errorMessage}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* SUCCESS MESSAGE */}

            {successMessage ? (
              <View style={styles.successBox}>
                <View style={styles.messageIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={COLORS.success}
                  />
                </View>

                <Text style={styles.successText}>
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {/* EMAIL */}

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>

              <View
                style={[
                  styles.inputWrapper,
                  email.length > 0 && styles.inputWrapperActive,
                ]}
              >
                <View style={styles.inputIconBox}>
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={
                      email.length > 0
                        ? COLORS.lavender
                        : COLORS.lightMuted
                    }
                  />
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.lightMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!loading}
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>
            </View>

            {/* PASSWORD */}

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>

              <View
                style={[
                  styles.inputWrapper,
                  password.length > 0 && styles.inputWrapperActive,
                ]}
              >
                <View style={styles.inputIconBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={
                      password.length > 0
                        ? COLORS.lavender
                        : COLORS.lightMuted
                    }
                  />
                </View>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.lightMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={styles.input}
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(current => !current)
                  }
                  disabled={loading}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={20}
                    color={COLORS.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* OPTIONS */}

            <View
              style={[
                styles.optionsRow,
                isSmallScreen && styles.optionsRowSmall,
              ]}
            >
              <Pressable
                onPress={() =>
                  setRememberMe(current => !current)
                }
                disabled={loading}
                style={styles.rememberRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe ? (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={COLORS.white}
                    />
                  ) : null}
                </View>

                <Text style={styles.rememberText}>
                  Remember me
                </Text>
              </Pressable>

              <Link href="/forgot-password" asChild>
                <Pressable disabled={loading}>
                  <Text style={styles.forgotText}>
                    Forgot password?
                  </Text>
                </Pressable>
              </Link>
            </View>

            {/* SIGN IN BUTTON */}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                pressed && !loading && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color={COLORS.white}
                    size="small"
                  />
                  <Text style={styles.buttonText}>
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign in</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={COLORS.white}
                  />
                </>
              )}
            </Pressable>

            {/* REGISTER LINK */}

            <View style={styles.registerSection}>
              <Text style={styles.registerText}>
                Don't have an account?
              </Text>

              <Link href="/signup" asChild>
                <Pressable disabled={loading}>
                  <Text style={styles.registerLink}>
                    Create account →
                  </Text>
                </Pressable>
              </Link>
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
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },

  scrollContentSmall: {
    paddingHorizontal: 14,
    paddingVertical: 24,
  },

  page: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },

  pageSmall: {
    maxWidth: 500,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 25,
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

  brandName: {
    color: COLORS.navy,
    fontSize: 23,
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
    borderRadius: 22,
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

  accentLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lavender,
    marginBottom: 12,
  },

  eyebrow: {
    color: COLORS.lavenderDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 6,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 22,
  },

  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#DCD5FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 16,
  },

  messageIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageBody: {
    flex: 1,
    minWidth: 0,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },

  errorText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },

  successBox: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: '#DCD5FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 16,
  },

  successText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  field: {
    marginBottom: 17,
  },

  label: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundInput,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputWrapperActive: {
    borderColor: COLORS.lavender,
    backgroundColor: COLORS.white,
  },

  inputIconBox: {
    width: 44,
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
    paddingRight: 8,
    outlineStyle: 'none',
  } as any,

  eyeButton: {
    minWidth: 44,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
    marginBottom: 22,
  },

  optionsRowSmall: {
    flexWrap: 'wrap',
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C9C8D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  checkboxChecked: {
    backgroundColor: COLORS.lavender,
    borderColor: COLORS.lavender,
  },

  rememberText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  forgotText: {
    color: COLORS.lavenderDark,
    fontSize: 12,
    fontWeight: '800',
  },

  button: {
    minHeight: 53,
    borderRadius: 12,
    backgroundColor: COLORS.lavender,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
    shadowColor: COLORS.lavender,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 5,
  },

  buttonPressed: {
    backgroundColor: COLORS.lavenderPressed,
    opacity: 0.95,
    transform: [{ translateY: 1 }],
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  registerSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 23,
    paddingTop: 18,
    alignItems: 'center',
  },

  registerText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  registerLink: {
    color: COLORS.lavenderDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },

  footer: {
    textAlign: 'center',
    color: COLORS.lightMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 19,
  },
});
