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

      console.log('==============================');
      console.log('LOGIN STARTED');
      console.log('Email:', cleanEmail);

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

      console.log('LOGIN AUTHENTICATED');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);

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

      console.log('SESSION VERIFIED');
      console.log('Session user:', sessionData.session.user.id);

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

      console.log('LOGIN SUCCESS');
      console.log('==============================');

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
        const errorMessage = String(
          (error as { message: unknown }).message,
        );

        if (
          errorMessage
            .toLowerCase()
            .includes('invalid login credentials')
        ) {
          message =
            'The email or password is incorrect. Please check your details or reset your password.';
        } else if (
          errorMessage
            .toLowerCase()
            .includes('email not confirmed')
        ) {
          message =
            'Please confirm your email address before signing in.';
        } else {
          message = errorMessage;
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
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isSmallScreen &&
            styles.scrollContentSmall,
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
          {/* BRAND HERO */}

          <View style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons
                name="checkmark"
                size={29}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.brandName}>
              TaskFlow
            </Text>

            <Text style={styles.heroText}>
              Stay focused, organized, and intentional
              with your day.
            </Text>
          </View>

          {/* LOGIN CARD */}

          <View style={styles.card}>
            <View style={styles.orangeLine} />

            <Text style={styles.eyebrow}>
              WELCOME BACK
            </Text>

            <Text style={styles.title}>
              Sign in to TaskFlow
            </Text>

            <Text style={styles.subtitle}>
              Continue managing your tasks, schedule,
              and productivity in one place.
            </Text>

            {/* ERROR */}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <View style={styles.errorIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={19}
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

            {/* SUCCESS */}

            {successMessage ? (
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
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
                <View style={styles.inputIconBox}>
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
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!loading}
                  style={styles.input}
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
                <View style={styles.inputIconBox}>
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
                  placeholder="Enter your password"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  editable={!loading}
                  style={styles.input}
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(
                      current => !current,
                    )
                  }
                  disabled={loading}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
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

            {/* OPTIONS */}

            <View
              style={[
                styles.optionsRow,
                isSmallScreen &&
                  styles.optionsRowSmall,
              ]}
            >
              <Pressable
                onPress={() =>
                  setRememberMe(
                    current => !current,
                  )
                }
                disabled={loading}
                style={styles.rememberRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe &&
                      styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={COLORS.white}
                    />
                  )}
                </View>

                <Text style={styles.rememberText}>
                  Remember me
                </Text>
              </Pressable>

              <Link
                href="/forgot-password"
                asChild
              >
                <Pressable disabled={loading}>
                  <Text style={styles.forgotText}>
                    Forgot password?
                  </Text>
                </Pressable>
              </Link>
            </View>

            {/* SIGN IN */}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                pressed &&
                  !loading &&
                  styles.buttonPressed,
                loading &&
                  styles.buttonDisabled,
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
                  <Text style={styles.buttonText}>
                    Sign in
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.white}
                  />
                </>
              )}
            </Pressable>

            {/* REGISTER */}

            <View style={styles.registerSection}>
              <Text style={styles.registerText}>
                Don't have an account?
              </Text>

              <Link
                href="/signup"
                asChild
              >
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
    marginBottom: 21,
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
    marginBottom: 16,
  },

  errorIcon: {
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
    fontWeight: '900',
    marginBottom: 3,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    lineHeight: 17,
  },

  successBox: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: '#B7E3C8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 16,
  },

  successIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '800',
  },

  field: {
    marginBottom: 16,
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

  inputIconBox: {
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
    paddingRight: 8,
    outlineStyle: 'none',
  } as any,

  eyeButton: {
    minWidth: 45,
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
    marginBottom: 21,
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
    borderColor: '#CBD2DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  checkboxChecked: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  rememberText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  forgotText: {
    color: COLORS.orangeDark,
    fontSize: 11,
    fontWeight: '900',
  },

  button: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    shadowColor: COLORS.orange,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.18,
    shadowRadius: 13,
    elevation: 5,
  },

  buttonPressed: {
    opacity: 0.86,
    transform: [
      {
        translateY: 1,
      },
    ],
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },

  registerSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 22,
    paddingTop: 18,
    alignItems: 'center',
  },

  registerText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  registerLink: {
    color: COLORS.orangeDark,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },

  footer: {
    textAlign: 'center',
    color: COLORS.lightMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 18,
  },
});