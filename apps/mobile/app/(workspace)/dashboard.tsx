import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  AppState,
  AppStateStatus
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/auth/authContext';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeSyncStatus, OfflineSyncStatus, triggerImmediateSync } from '../../src/sync/syncEngine';
import { subscribeToRealtimeEvent, joinMobileBranchRoom, reconnectMobileSocket } from '../../src/realtime/socket';
import { BusinessType } from '@aescion/shared-types';

export default function MobileDashboardScreen() {
  const { user, organization, branches, activeBranch, switchBranch } = useMobileAuth();
  const router = useRouter();

  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('TODAY');
  const [pulseData, setPulseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranch?.id || '');

  const appState = useRef(AppState.currentState);

  const fetchDashboardData = useCallback(async (showFullLoading = false) => {
    if (showFullLoading) setIsLoading(true);
    try {
      const branchParam = selectedBranchId ? `&branchId=${selectedBranchId}` : '';
      const data = await MobileApiClient.get<any>(`/reports/dashboard-pulse?period=${period}${branchParam}`);
      if (data) {
        setPulseData(data);
        setIsOnline(true);
      }
    } catch (err: any) {
      console.warn('[Dashboard] Pulse fetch failed, running in offline fallback mode:', err.message || err);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, selectedBranchId]);

  useEffect(() => {
    setSelectedBranchId(activeBranch?.id || '');
  }, [activeBranch?.id]);

  useEffect(() => {
    fetchDashboardData(true);

    if (organization?.id) {
      joinMobileBranchRoom(organization.id, selectedBranchId);
    }

    // 1. Subscribe to real-time events for live zero-click refreshes
    const unsubPulse = subscribeToRealtimeEvent('pulse_updated', () => fetchDashboardData(false));
    const unsubInvoice = subscribeToRealtimeEvent('invoice_created', () => fetchDashboardData(false));
    const unsubQuotation = subscribeToRealtimeEvent('quotation_updated', () => fetchDashboardData(false));
    const unsubPayment = subscribeToRealtimeEvent('payment_created', () => fetchDashboardData(false));
    const unsubWholesale = subscribeToRealtimeEvent('wholesale_order_updated', () => fetchDashboardData(false));
    const unsubShift = subscribeToRealtimeEvent('shift_updated', () => fetchDashboardData(false));
    const unsubProduct = subscribeToRealtimeEvent('product_updated', () => fetchDashboardData(false));
    const unsubCustomer = subscribeToRealtimeEvent('customer_updated', () => fetchDashboardData(false));

    // 2. Subscribe to local offline sync status
    const unsubSync = subscribeSyncStatus(setSyncStatus);

    // 3. Foreground resume handler
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        reconnectMobileSocket();
        triggerImmediateSync();
        fetchDashboardData(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      unsubPulse();
      unsubInvoice();
      unsubQuotation();
      unsubPayment();
      unsubWholesale();
      unsubShift();
      unsubProduct();
      unsubCustomer();
      unsubSync();
      subscription.remove();
    };
  }, [fetchDashboardData, organization?.id, selectedBranchId]);

  const onRefresh = () => {
    setIsRefreshing(true);
    triggerImmediateSync();
    fetchDashboardData(false);
  };

  const totalRevenue = pulseData?.totalRevenue ?? pulseData?.metrics?.totalSales ?? 0;
  const completedBills = pulseData?.completedBills ?? pulseData?.metrics?.invoiceCount ?? 0;
  const quotationCount = pulseData?.quotationCount ?? 0;
  const receiptCount = pulseData?.receiptCount ?? 0;
  const salesOrderCount = pulseData?.salesOrderCount ?? 0;
  const pendingDispatches = pulseData?.pendingDispatches ?? 0;
  const grossMargin = pulseData?.estimatedProfit ?? 0;
  const receivables = pulseData?.customerReceivables ?? pulseData?.pendingReceivables ?? 0;
  const supplierPayables = pulseData?.supplierPayables ?? 0;
  const lowStockCount = pulseData?.lowStockCount ?? 0;

  const collections = pulseData?.collections || {
    cash: pulseData?.paymentBreakdown?.CASH || 0,
    upi: pulseData?.paymentBreakdown?.UPI || 0,
    card: pulseData?.paymentBreakdown?.CARD || 0,
    other: pulseData?.paymentBreakdown?.CREDIT || 0
  };

  const pendingSyncs = syncStatus?.pendingCount || 0;
  const isSyncing = syncStatus?.isSyncing || false;
  const businessType = (organization?.businessType as BusinessType) || BusinessType.SUPERMARKET;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* 1. Realtime & Sync Status Banner */}
      <View
        style={[
          styles.statusBanner,
          !isOnline ? styles.statusOffline : pendingSyncs > 0 ? styles.statusPending : styles.statusOnline
        ]}
      >
        <View
          style={[
            styles.statusDot,
            !isOnline ? styles.dotAmber : pendingSyncs > 0 ? styles.dotBlue : styles.dotGreen
          ]}
        />
        <Text style={styles.statusBannerText}>
          {!isOnline
            ? 'Offline Mode • Showing Cached Data'
            : isSyncing
            ? 'Syncing offline transactions with server...'
            : pendingSyncs > 0
            ? `Offline Queue: ${pendingSyncs} pending mutation${pendingSyncs > 1 ? 's' : ''}`
            : '⚡ Live POS Connected • Real-time Sync Active'}
        </Text>
      </View>

      {/* 2. Greeting & Branch Context Header */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeTextGroup}>
            <Text style={styles.welcomeSubtitle}>Welcome back,</Text>
            <Text style={styles.welcomeTitle}>{user?.firstName} {user?.lastName}</Text>
          </View>
          <View style={styles.orgTag}>
            <Text style={styles.orgTagText}>{organization?.name || 'AESCION'}</Text>
          </View>
        </View>

        {/* Branch Selector Chips */}
        {branches && branches.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.branchScroll}>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.branchChip,
                  selectedBranchId === b.id && styles.branchChipActive
                ]}
                onPress={() => {
                  setSelectedBranchId(b.id);
                  switchBranch(b.id);
                }}
              >
                <Text
                  style={[
                    styles.branchChipText,
                    selectedBranchId === b.id && styles.branchChipTextActive
                  ]}
                >
                  📍 {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 3. Period Filter Tabs */}
      <View style={styles.periodContainer}>
        {(['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.periodTab, period === tab && styles.periodTabActive]}
            onPress={() => setPeriod(tab)}
          >
            <Text style={[styles.periodTabText, period === tab && styles.periodTabTextActive]}>
              {tab === 'TODAY' ? 'Today' : tab === 'THIS_WEEK' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. Primary Financial Metrics Grid */}
      {isLoading && !pulseData ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading authoritative metrics...</Text>
        </View>
      ) : (
        <View style={styles.metricsGrid}>
          {/* Revenue */}
          <View style={[styles.metricCard, styles.borderBlue]}>
            <Text style={styles.metricLabel}>{period === 'TODAY' ? "Today's Revenue" : 'Total Revenue'}</Text>
            <Text style={styles.metricValue}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricMeta}>{completedBills} completed bill{completedBills !== 1 ? 's' : ''}</Text>
          </View>

          {/* Gross Margin */}
          <View style={[styles.metricCard, styles.borderGreen]}>
            <Text style={styles.metricLabel}>Gross Margin</Text>
            <Text style={styles.metricValue}>₹{grossMargin.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricMetaGreen}>Tax Settled (22%)</Text>
          </View>

          {/* Receivables */}
          <View style={[styles.metricCard, styles.borderPurple]}>
            <Text style={styles.metricLabel}>Receivables</Text>
            <Text style={styles.metricValue}>₹{receivables.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricMetaPurple}>Credit Due</Text>
          </View>

          {/* Payables */}
          <View style={[styles.metricCard, styles.borderOrange]}>
            <Text style={styles.metricLabel}>Supplier Payables</Text>
            <Text style={styles.metricValue}>₹{supplierPayables.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricMeta}>Pending POs</Text>
          </View>
        </View>
      )}

      {/* 5. Live Commercial Counters (Quotations, Invoices, Receipts, Orders, Dispatches) */}
      <View style={styles.countersCard}>
        <Text style={styles.cardHeaderTitle}>Live Commercial Document Counters</Text>
        <View style={styles.counterGrid}>
          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/billing')}>
            <Text style={styles.counterLabel}>🧾 Invoices</Text>
            <Text style={styles.counterValue}>{completedBills}</Text>
            <Text style={styles.counterSub}>Billed & Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/quotations')}>
            <Text style={styles.counterLabel}>📑 Quotations</Text>
            <Text style={styles.counterValue}>{quotationCount}</Text>
            <Text style={styles.counterSub}>Active Estimates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/receipts')}>
            <Text style={styles.counterLabel}>📜 Receipts</Text>
            <Text style={styles.counterValue}>{receiptCount}</Text>
            <Text style={styles.counterSub}>Settled Vouchers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/wholesale')}>
            <Text style={styles.counterLabel}>🚚 Sales Orders</Text>
            <Text style={styles.counterValue}>{salesOrderCount}</Text>
            <Text style={styles.counterSub}>B2B Contracts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/wholesale')}>
            <Text style={styles.counterLabel}>📦 Pending DC</Text>
            <Text style={[styles.counterValue, { color: '#EF4444' }]}>{pendingDispatches}</Text>
            <Text style={styles.counterSub}>Needs Dispatch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. Live Tender Collections Breakdown */}
      <View style={styles.tenderCard}>
        <Text style={styles.cardHeaderTitle}>Live Tender Collections Breakdown</Text>
        <View style={styles.tenderGrid}>
          <View style={styles.tenderItem}>
            <Text style={styles.tenderLabel}>💵 Cash</Text>
            <Text style={styles.tenderValue}>₹{(collections.cash || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.tenderItem}>
            <Text style={styles.tenderLabel}>📱 UPI / QR</Text>
            <Text style={styles.tenderValue}>₹{(collections.upi || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.tenderItem}>
            <Text style={styles.tenderLabel}>💳 Card</Text>
            <Text style={styles.tenderValue}>₹{(collections.card || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.tenderItem}>
            <Text style={styles.tenderLabel}>📋 Credit</Text>
            <Text style={styles.tenderValue}>₹{(collections.other || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* 7. Quick POS Launch Button */}
      <TouchableOpacity style={styles.posLaunchButton} onPress={() => router.push('/(workspace)/pos')}>
        <View style={styles.posIconCircle}>
          <Text style={styles.posIcon}>⚡</Text>
        </View>
        <View style={styles.posTextContainer}>
          <Text style={styles.posLaunchTitle}>Launch Fast POS</Text>
          <Text style={styles.posLaunchDesc}>Scan barcodes, take orders & collect payments</Text>
        </View>
        <Text style={styles.arrowIcon}>→</Text>
      </TouchableOpacity>

      {/* 8. Industry Specific Live KPIs */}
      {pulseData?.industryKpis && (
        <View style={styles.industryKpiContainer}>
          {businessType === BusinessType.RESTAURANT && pulseData.industryKpis.restaurant && (
            <View style={styles.industryKpiCard}>
              <Text style={styles.industryKpiTitle}>🍽️ Restaurant Live Floor</Text>
              <View style={styles.industryKpiRow}>
                <Text style={styles.industryKpiStat}>
                  Occupied Tables: <Text style={styles.boldText}>{pulseData.industryKpis.restaurant.occupiedTables} / {pulseData.industryKpis.restaurant.totalTables}</Text>
                </Text>
                <Text style={styles.industryKpiStat}>
                  Active KOTs: <Text style={styles.boldText}>{pulseData.industryKpis.restaurant.activeKots}</Text>
                </Text>
              </View>
            </View>
          )}

          {businessType === BusinessType.SERVICE && pulseData.industryKpis.service && (
            <View style={styles.industryKpiCard}>
              <Text style={styles.industryKpiTitle}>🔧 Service Center Status</Text>
              <View style={styles.industryKpiRow}>
                <Text style={styles.industryKpiStat}>
                  Open Jobs: <Text style={styles.boldText}>{pulseData.industryKpis.service.openJobs}</Text>
                </Text>
                <Text style={styles.industryKpiStat}>
                  Ready for Delivery: <Text style={styles.boldText}>{pulseData.industryKpis.service.readyJobs}</Text>
                </Text>
              </View>
            </View>
          )}

          {businessType === BusinessType.PHARMACY && pulseData.industryKpis.pharmacy && (
            <View style={styles.industryKpiCard}>
              <Text style={styles.industryKpiTitle}>💊 Pharmacy Compliance</Text>
              <View style={styles.industryKpiRow}>
                <Text style={styles.industryKpiStat}>
                  Near Expiry: <Text style={styles.boldText}>{pulseData.industryKpis.pharmacy.nearExpiryMedicines}</Text>
                </Text>
                <Text style={styles.industryKpiStat}>
                  Quarantined: <Text style={styles.boldText}>{pulseData.industryKpis.pharmacy.expiredCount}</Text>
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 9. Operational Workflows Navigation Grid */}
      <Text style={styles.sectionHeader}>Business Workflows & Management</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/shifts')}>
          <Text style={styles.tileEmoji}>⏱️</Text>
          <Text style={styles.tileTitle}>Cashier Shifts</Text>
          <Text style={styles.tileDesc}>Open / close drawer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/products')}>
          <Text style={styles.tileEmoji}>📦</Text>
          <Text style={styles.tileTitle}>Item Catalog</Text>
          <Text style={styles.tileDesc}>{lowStockCount > 0 ? `${lowStockCount} low stock` : 'Live stock & MRP'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/billing')}>
          <Text style={styles.tileEmoji}>🧾</Text>
          <Text style={styles.tileTitle}>Tax Invoices</Text>
          <Text style={styles.tileDesc}>Receipt reprints & void</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/customers')}>
          <Text style={styles.tileEmoji}>👥</Text>
          <Text style={styles.tileTitle}>Customers</Text>
          <Text style={styles.tileDesc}>Credit ledger & loyalty</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/quotations')}>
          <Text style={styles.tileEmoji}>📑</Text>
          <Text style={styles.tileTitle}>Quotations</Text>
          <Text style={styles.tileDesc}>Draft estimates</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/receipts')}>
          <Text style={styles.tileEmoji}>📜</Text>
          <Text style={styles.tileTitle}>Receipts</Text>
          <Text style={styles.tileDesc}>Payment vouchers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/wholesale')}>
          <Text style={styles.tileEmoji}>🚚</Text>
          <Text style={styles.tileTitle}>Wholesale & B2B</Text>
          <Text style={styles.tileDesc}>Sales Orders & DC</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/suppliers')}>
          <Text style={styles.tileEmoji}>🏭</Text>
          <Text style={styles.tileTitle}>Suppliers & GRN</Text>
          <Text style={styles.tileDesc}>PO & Stock intake</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/reports')}>
          <Text style={styles.tileEmoji}>📊</Text>
          <Text style={styles.tileTitle}>Reports & Audits</Text>
          <Text style={styles.tileDesc}>Analytics & Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(workspace)/team')}>
          <Text style={styles.tileEmoji}>🛡️</Text>
          <Text style={styles.tileTitle}>Staff & Roles</Text>
          <Text style={styles.tileDesc}>Access controls</Text>
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12
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
  statusPending: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  dotGreen: { backgroundColor: '#10B981' },
  dotAmber: { backgroundColor: '#F59E0B' },
  dotBlue: { backgroundColor: '#2563EB' },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B'
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  welcomeTextGroup: {
    flex: 1
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#64748B'
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  orgTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  orgTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1D4ED8'
  },
  branchScroll: {
    marginTop: 12
  },
  branchChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  branchChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  branchChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  branchChipTextActive: {
    color: '#FFFFFF'
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12
  },
  periodTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6
  },
  periodTabActive: {
    backgroundColor: '#2563EB'
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  periodTabTextActive: {
    color: '#FFFFFF'
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4
  },
  borderBlue: { borderLeftColor: '#2563EB' },
  borderGreen: { borderLeftColor: '#10B981' },
  borderOrange: { borderLeftColor: '#F97316' },
  borderPurple: { borderLeftColor: '#8B5CF6' },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginVertical: 4
  },
  metricMeta: {
    fontSize: 10,
    color: '#64748B'
  },
  metricMetaGreen: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '600'
  },
  metricMetaPurple: {
    fontSize: 10,
    color: '#6D28D9',
    fontWeight: '600'
  },
  countersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12
  },
  counterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10
  },
  counterItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FAFBFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF1F5'
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  counterValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginVertical: 2
  },
  counterSub: {
    fontSize: 9,
    color: '#64748B'
  },
  tenderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tenderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  tenderItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#EDF1F5'
  },
  tenderLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  tenderValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2
  },
  posLaunchButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  posIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  posIcon: {
    fontSize: 20
  },
  posTextContainer: {
    flex: 1
  },
  posLaunchTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold'
  },
  posLaunchDesc: {
    color: '#E0E7FF',
    fontSize: 11
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  industryKpiContainer: {
    marginBottom: 16
  },
  industryKpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  industryKpiTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6
  },
  industryKpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  industryKpiStat: {
    fontSize: 11,
    color: '#64748B'
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0F172A'
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  tileEmoji: {
    fontSize: 20,
    marginBottom: 4
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  tileDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  }
});
