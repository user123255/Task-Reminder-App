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
} from 'react-native';

import { supabase } from '@/utils/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
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
        console.error('LOGIN ERROR:', error);

        const normalizedMessage =
          error.message.toLowerCase();

        if (
          normalizedMessage.includes(
            'invalid login credentials'
          )
        ) {
          setErrorMessage(
            'The email or password is incorrect. Please check your password and try again.'
          );
        } else if (
          normalizedMessage.includes(
            'email not confirmed'
          )
        ) {
          setErrorMessage(
            'Your email address has not been confirmed yet.'
          );
        } else if (
          normalizedMessage.includes(
            'too many requests'
          )
        ) {
          setErrorMessage(
            'Too many login attempts. Please wait a moment and try again.'
          );
        } else {
          setErrorMessage(error.message);
        }

        return;
      }

      if (!data.user || !data.session) {
        setErrorMessage(
          'Login did not create an active session. Please try again.'
        );
        return;
      }

      console.log('LOGIN SUCCESS');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Session exists:', Boolean(data.session));
      console.log('==============================');

      /**
       * Supabase already persists the session through
       * the configuration in utils/supabase.ts.
       *
       * Remember-me is therefore only stored as a preference
       * for future app behavior.
       */
      if (Platform.OS === 'web') {
        try {
          if (rememberMe) {
            window.localStorage.setItem(
              'task_reminder_remember_me',
              'true'
            );
          } else {
            window.localStorage.removeItem(
              'task_reminder_remember_me'
            );
          }
        } catch (storageError) {
          console.warn(
            'Could not save remember-me preference:',
            storageError
          );
        }
      }

      setSuccessMessage(
        'Welcome back! Opening your dashboard...'
      );

      /**
       * The AuthProvider receives the SIGNED_IN event
       * from Supabase. A small delay prevents the router
       * from racing the authentication state update.
       */
      setTimeout(() => {
        router.replace('/');
      }, 150);
    } catch (error) {
      console.error('LOGIN ERROR:', error);

      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error
      ) {
        const message = String(
          (error as { message: unknown }).message
        );

        setErrorMessage(message);
      } else {
        setErrorMessage(
          'Unable to sign in. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>✓</Text>
          </View>

          <Text style={styles.brandName}>
            Task Reminder
          </Text>

          <Text style={styles.heroText}>
            Stay focused, organized, and intentional
            with your day.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headerIcon}>
            <View style={styles.headerDot} />
          </View>

          <Text style={styles.title}>
            Welcome back
          </Text>

          <Text style={styles.subtitle}>
            Sign in to continue managing your tasks.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>
                Sign in failed
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                {successMessage}
              </Text>
            </View>
          ) : null}

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
              <Text style={styles.inputIcon}>@</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#98A2B3"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
              />
            </View>
          </View>

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
              <Text style={styles.inputIcon}>•</Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#98A2B3"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                editable={!loading}
                style={[
                  styles.input,
                  styles.passwordInput,
                ]}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <Pressable
                onPress={() =>
                  setShowPassword(
                    (current) => !current
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
                <Text style={styles.eyeText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <Pressable
              onPress={() =>
                setRememberMe(
                  (current) => !current
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
                {rememberMe ? (
                  <Text style={styles.checkmark}>
                    ✓
                  </Text>
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
                <ActivityIndicator color="#FFFFFF" />

                <Text style={styles.buttonText}>
                  Signing in...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonText}>
                  Sign in
                </Text>

                <Text style={styles.arrow}>→</Text>
              </>
            )}
          </Pressable>

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
          Task Reminder © 2026
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#208AEF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  brandName: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  heroText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 330,
    marginTop: 6,
  },

  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    shadowColor: '#172033',
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 5,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#208AEF',
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#172033',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
    marginTop: 6,
    marginBottom: 24,
  },

  errorBox: {
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FDA29B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },

  errorTitle: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },

  errorText: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 19,
  },

  successBox: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#6CE9A6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },

  successText: {
    color: '#027A48',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475467',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },

  inputWrapper: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
  },

  inputWrapperActive: {
    borderColor: '#A8D4FF',
    backgroundColor: '#FFFFFF',
  },

  inputIcon: {
    width: 42,
    textAlign: 'center',
    color: '#98A2B3',
    fontSize: 17,
    fontWeight: '800',
  },

  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 2,
    paddingRight: 12,
    fontSize: 15,
    color: '#172033',
  },

  passwordInput: {
    paddingRight: 4,
  },

  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },

  eyeText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '800',
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 22,
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  checkboxChecked: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  rememberText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },

  forgotText: {
    color: '#208AEF',
    fontSize: 12,
    fontWeight: '800',
  },

  button: {
    height: 54,
    borderRadius: 15,
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#208AEF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },

  buttonPressed: {
    opacity: 0.88,
    transform: [{ translateY: 1 }],
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },

  registerSection: {
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
    marginTop: 24,
    paddingTop: 20,
    alignItems: 'center',
  },

  registerText: {
    color: '#667085',
    fontSize: 13,
  },

  registerLink: {
    color: '#208AEF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 7,
  },

  footer: {
    textAlign: 'center',
    color: '#98A2B3',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 20,
  },
});