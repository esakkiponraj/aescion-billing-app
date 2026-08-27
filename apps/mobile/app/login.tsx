import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '../src/auth/authContext';
import { setMobileApiUrl, getMobileApiUrl } from '../src/api/mobileApiClient';

export default function LoginScreen() {
  const { login } = useMobileAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState(getMobileApiUrl());
  const [showConfig, setShowConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      setMobileApiUrl(apiUrl.trim());
      await login(identifier.trim(), password);
      router.replace('/(workspace)/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Check server connection and credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* AESCION Public Platform Identity */}
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>⚡</Text>
          </View>
          <Text style={styles.brandTitle}>AESCION</Text>
          <Text style={styles.brandSubtitle}>Commerce Mobile OS & Fast POS</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to Workspace</Text>
          <Text style={styles.cardDesc}>Enter your enterprise credentials to access POS & billing</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Identifier Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email / Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. owner@store.com or cashier_01"
              placeholderTextColor="#94A3B8"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* API Server URL Config Toggle */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? '▲ Hide Server Config' : '⚙️ API Server Connection'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.label}>API Base URL</Text>
              <TextInput
                style={styles.configInput}
                value={apiUrl}
                onChangeText={setApiUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.configHint}>Default: http://localhost:4000/api/v1 (or 10.0.2.2 on Android)</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Authenticate & Launch POS</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AESCION Commerce Enterprise v2.0 • Offline-First Engine</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  brandIconText: {
    fontSize: 26
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600'
  },
  configToggle: {
    alignSelf: 'flex-start',
    marginVertical: 8
  },
  configToggleText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700'
  },
  configBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  configInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  configHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  footer: {
    marginTop: 24,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500'
  }
});
