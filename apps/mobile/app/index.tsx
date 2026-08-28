import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '../src/auth/authContext';
import { MobileLandingScreen } from '../src/screens/MobileLandingScreen';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useMobileAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(workspace)/dashboard');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>AESCION</Text>
        </View>
        <Text style={styles.title}>Enterprise Mobile POS</Text>
        <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
        <Text style={styles.subtitle}>Restoring secure session...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <MobileLandingScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  logoBadge: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 12
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 24
  },
  loader: {
    marginVertical: 16
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  }
});
