import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/auth/authContext';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeSyncStatus, OfflineSyncStatus } from '../../src/sync/syncEngine';

export default function MobileDashboardScreen() {
  const { user, organization, activeBranch } = useMobileAuth();
  const router = useRouter();

  const [pulseData, setPulseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.get<any>('/reports/dashboard-pulse?period=TODAY');
      setPulseData(data);
    } catch (err) {
      console.warn('Failed to fetch online pulse, showing local operational summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const unsub = subscribeSyncStatus(setSyncStatus);
    return unsub;
  }, []);

  const totalSales = pulseData?.metrics?.totalSales || 0;
  const invoiceCount = pulseData?.metrics?.invoiceCount || 0;
  const pendingSyncs = syncStatus?.pendingCount || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} />}
    >
      {/* Realtime / Offline Status Banner */}
      <View style={[styles.statusBanner, pendingSyncs > 0 ? styles.statusOffline : styles.statusOnline]}>
        <View style={[styles.statusDot, pendingSyncs > 0 ? styles.dotAmber : styles.dotGreen]} />
        <Text style={styles.statusBannerText}>
          {pendingSyncs > 0
            ? `Offline Queue: ${pendingSyncs} pending mutation${pendingSyncs > 1 ? 's' : ''}`
            : 'Live POS Connected • All Data Synced'}
        </Text>
      </View>

      {/* Greeting Card */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeSubtitle}>Welcome back,</Text>
        <Text style={styles.welcomeTitle}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.branchPill}>📍 {activeBranch?.name}</Text>
      </View>

      {/* Primary Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Today's Revenue</Text>
          <Text style={styles.metricValue}>₹{totalSales.toLocaleString('en-IN')}</Text>
          <Text style={styles.metricMeta}>Authoritative Tax Settled</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Invoices Billed</Text>
          <Text style={styles.metricValue}>{invoiceCount}</Text>
          <Text style={styles.metricMeta}>Transactions</Text>
        </View>
      </View>

      {/* Quick POS Launch Button */}
      <TouchableOpacity style={styles.posLaunchButton} onPress={() => router.push('/(workspace)/pos')}>
        <View style={styles.posIconCircle}>
          <Text style={styles.posIcon}>⚡</Text>
        </View>
        <View style={styles.posTextContainer}>
          <Text style={styles.posLaunchTitle}>Launch Fast POS</Text>
          <Text style={styles.posLaunchDesc}>Scan barcodes, take orders & collect payments</Text>
        </View>
      </TouchableOpacity>

      {/* Operational Action Tiles */}
      <Text style={styles.sectionHeader}>Operational Workflows</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/shifts')}>
          <Text style={styles.tileEmoji}>⏱️</Text>
          <Text style={styles.tileTitle}>Cashier Shift</Text>
          <Text style={styles.tileDesc}>Open / close drawer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/products')}>
          <Text style={styles.tileEmoji}>📦</Text>
          <Text style={styles.tileTitle}>Item Catalog</Text>
          <Text style={styles.tileDesc}>Live stock & prices</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/billing')}>
          <Text style={styles.tileEmoji}>🧾</Text>
          <Text style={styles.tileTitle}>Tax Invoices</Text>
          <Text style={styles.tileDesc}>Receipt reprints</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/sync')}>
          <Text style={styles.tileEmoji}>🔄</Text>
          <Text style={styles.tileTitle}>Sync Center</Text>
          <Text style={styles.tileDesc}>{pendingSyncs} pending items</Text>
        </TouchableOpacity>
      </View>

      {/* Industry Modules if enabled */}
      <Text style={styles.sectionHeader}>Industry Specialized Modes</Text>
      <View style={styles.industryRow}>
        <TouchableOpacity style={styles.industryChip} onPress={() => router.push('/(workspace)/restaurant')}>
          <Text style={styles.chipEmoji}>🍽️</Text>
          <Text style={styles.chipText}>Tables & KOT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.industryChip} onPress={() => router.push('/(workspace)/service')}>
          <Text style={styles.chipEmoji}>🔧</Text>
          <Text style={styles.chipText}>Repair Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.industryChip} onPress={() => router.push('/(workspace)/pharmacy')}>
          <Text style={styles.chipEmoji}>💊</Text>
          <Text style={styles.chipText}>Expiry Safety</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16
  },
  statusOnline: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  statusOffline: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  dotGreen: {
    backgroundColor: '#10B981'
  },
  dotAmber: {
    backgroundColor: '#F59E0B'
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B'
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2
  },
  branchPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B'
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4
  },
  metricMeta: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600'
  },
  posLaunchButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  posIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  posIcon: {
    fontSize: 20
  },
  posTextContainer: {
    flex: 1
  },
  posLaunchTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  posLaunchDesc: {
    fontSize: 11,
    color: '#DBEAFE',
    fontWeight: '500',
    marginTop: 2
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
    marginTop: 6
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  actionTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  tileEmoji: {
    fontSize: 22,
    marginBottom: 6
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  tileDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  industryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  industryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6
  },
  chipEmoji: {
    fontSize: 14
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B'
  }
});
