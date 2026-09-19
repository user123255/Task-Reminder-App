import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { signUp } from '@/services/auth';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert(
        'Missing information',
        'Please complete all the fields.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Your password must contain at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Please make sure both passwords are the same.'
      );
      return;
    }

    try {
      setLoading(true);

      const data = await signUp(
        email.trim(),
        password,
        fullName.trim()
      );

      if (!data.session) {
        Alert.alert(
          'Check your email',
          'Your account has been created. Please verify your email before signing in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      } else {
        router.replace('/');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create your account. Please try again.';

      Alert.alert('Sign up failed', message);
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>✓</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>

        <Text style={styles.subtitle}>
          Build better habits, stay organized, and make progress every day.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>

          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#98A2B3"
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.label}>Email</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#98A2B3"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#98A2B3"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.label}>Confirm password</Text>

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            placeholderTextColor="#98A2B3"
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>

          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.loginLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#667085',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#172033',
  },

  button: {
    height: 56,
    backgroundColor: '#208AEF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
  },

  loginText: {
    color: '#667085',
    fontSize: 14,
  },

  loginLink: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '700',
  },
});