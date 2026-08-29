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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Zap,
  ArrowLeft,
  Lock,
  User,
  Server,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  UserPlus,
  ArrowRight,
  HelpCircle
} from 'lucide-react-native';
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
      const res = await login(identifier.trim(), password);
      if (res.activeRole?.roleType === 'SUPER_ADMIN' || (res.activeRole?.roleType as any) === 'SUPER_ADMIN') {
        router.replace('/(workspace)/super-admin' as any);
      } else {
        router.replace('/(workspace)/dashboard' as any);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Check server connection and credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLanding = () => {
    router.replace('/' as any);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'For security, password resets are managed by your Organization Owner or System Administrator. If you are the Owner, contact AESCION support at support@aescion.com.',
      [{ text: 'OK' }]
    );
  };

  const handleCreateAccount = () => {
    router.push('/register' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackToLanding} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#2563EB" />
            <Text style={styles.backBtnText}>Welcome Page</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* AESCION Brand Header */}
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <Zap size={28} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitleBold}>AESCION</Text>
              <Text style={styles.brandTitleAccent}>Commerce</Text>
            </View>
            <Text style={styles.brandSubtitle}>Mobile Operating System & Fast POS</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardDesc}>Enter your enterprise credentials to access POS & billing</Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#DC2626" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Identifier Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User size={13} color="#475569" style={styles.labelIcon} />
                <Text style={styles.label}>Email / Username</Text>
              </View>
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
              <View style={styles.labelRow}>
                <Lock size={13} color="#475569" style={styles.labelIcon} />
                <Text style={styles.label}>Password</Text>
              </View>
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

            {/* Submit Sign In Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Sign In to Workspace</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword} activeOpacity={0.7}>
              <HelpCircle size={13} color="#64748B" style={styles.forgotIcon} />
              <Text style={styles.forgotBtnText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Create Owner Account Section */}
            <View style={styles.createAccountSection}>
              <Text style={styles.createAccountPrompt}>New to AESCION Commerce?</Text>
              <TouchableOpacity
                style={styles.createAccountBtn}
                onPress={handleCreateAccount}
                activeOpacity={0.85}
              >
                <UserPlus size={16} color="#2563EB" style={styles.createAccountIcon} />
                <Text style={styles.createAccountBtnText}>Create Owner Account</Text>
                <ArrowRight size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>

            {/* API Server URL Config Toggle */}
            <TouchableOpacity
              style={styles.configToggle}
              onPress={() => setShowConfig(!showConfig)}
            >
              <Server size={13} color="#64748B" style={styles.configIcon} />
              <Text style={styles.configToggleText}>
                {showConfig ? 'Hide Server Configuration' : 'Server Connection Settings'}
              </Text>
              {showConfig ? (
                <ChevronUp size={14} color="#64748B" />
              ) : (
                <ChevronDown size={14} color="#64748B" />
              )}
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
                <Text style={styles.configHint}>Host URL: http://127.0.0.1:4000/api/v1 (USB ADB reverse)</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AESCION Commerce Enterprise v2.0 • Offline-First Engine</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC'
  },
  container: {
    flex: 1
  },
  topNav: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandTitleBold: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5
  },
  brandTitleAccent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2563EB',
    marginLeft: 4
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A'
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 18
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorIcon: {
    marginRight: 8
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  inputGroup: {
    marginBottom: 14
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  labelIcon: {
    marginRight: 6
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
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
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4
  },
  forgotIcon: {
    marginRight: 5
  },
  forgotBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 10
  },
  createAccountSection: {
    alignItems: 'center',
    marginTop: 2
  },
  createAccountPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8
  },
  createAccountBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  createAccountIcon: {
    marginRight: 8
  },
  createAccountBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8',
    marginRight: 6
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20
  },
  configIcon: {
    marginRight: 6
  },
  configToggleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginRight: 4
  },
  configBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 10
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4
  },
  configHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4
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
