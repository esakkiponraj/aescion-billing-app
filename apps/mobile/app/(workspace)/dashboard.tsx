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

      {/* 5. Fast Primary Quick Actions Grid (Industry-Tailored, Max 4 Actions) */}
      <Text style={styles.sectionHeader}>Quick Actions</Text>
      <View style={styles.quickActionGrid}>
        {businessType === BusinessType.RESTAURANT ? (
          <>
            <TouchableOpacity style={[styles.quickActionBtn, styles.bgBlue]} onPress={() => router.push('/(workspace)/pos' as any)}>
              <Text style={styles.quickActionIcon}>⚡</Text>
              <View>
                <Text style={styles.quickActionTitle}>Fast POS</Text>
                <Text style={styles.quickActionSub}>Express Dine-in</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgAmber]} onPress={() => router.push('/(workspace)/restaurant' as any)}>
              <Text style={styles.quickActionIcon}>🍽️</Text>
              <View>
                <Text style={styles.quickActionTitle}>Dining Tables</Text>
                <Text style={styles.quickActionSub}>Live Floor View</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgEmerald]} onPress={() => router.push('/(workspace)/restaurant' as any)}>
              <Text style={styles.quickActionIcon}>👨‍🍳</Text>
              <View>
                <Text style={styles.quickActionTitle}>Kitchen KOT</Text>
                <Text style={styles.quickActionSub}>Active Orders</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgIndigo]} onPress={() => router.push('/(workspace)/products' as any)}>
              <Text style={styles.quickActionIcon}>📋</Text>
              <View>
                <Text style={styles.quickActionTitle}>Menu Catalog</Text>
                <Text style={styles.quickActionSub}>Food & Pricing</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : businessType === BusinessType.WHOLESALE ? (
          <>
            <TouchableOpacity style={[styles.quickActionBtn, styles.bgBlue]} onPress={() => router.push('/(workspace)/wholesale' as any)}>
              <Text style={styles.quickActionIcon}>🚚</Text>
              <View>
                <Text style={styles.quickActionTitle}>Sales Orders</Text>
                <Text style={styles.quickActionSub}>B2B Contracts</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgAmber]} onPress={() => router.push('/(workspace)/wholesale' as any)}>
              <Text style={styles.quickActionIcon}>📦</Text>
              <View>
                <Text style={styles.quickActionTitle}>Dispatch DC</Text>
                <Text style={styles.quickActionSub}>Delivery Challan</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgEmerald]} onPress={() => router.push('/(workspace)/pos' as any)}>
              <Text style={styles.quickActionIcon}>⚡</Text>
              <View>
                <Text style={styles.quickActionTitle}>Fast Bill</Text>
                <Text style={styles.quickActionSub}>Tax Invoice</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgIndigo]} onPress={() => router.push('/(workspace)/customers' as any)}>
              <Text style={styles.quickActionIcon}>👥</Text>
              <View>
                <Text style={styles.quickActionTitle}>B2B Clients</Text>
                <Text style={styles.quickActionSub}>Credit & Ledger</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.quickActionBtn, styles.bgBlue]} onPress={() => router.push('/(workspace)/pos' as any)}>
              <Text style={styles.quickActionIcon}>⚡</Text>
              <View>
                <Text style={styles.quickActionTitle}>Fast POS</Text>
                <Text style={styles.quickActionSub}>Bill & Collect</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgAmber]} onPress={() => router.push('/(workspace)/quotations' as any)}>
              <Text style={styles.quickActionIcon}>📑</Text>
              <View>
                <Text style={styles.quickActionTitle}>New Quote</Text>
                <Text style={styles.quickActionSub}>Price Estimate</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgEmerald]} onPress={() => router.push('/(workspace)/products' as any)}>
              <Text style={styles.quickActionIcon}>📦</Text>
              <View>
                <Text style={styles.quickActionTitle}>Products</Text>
                <Text style={styles.quickActionSub}>Add / Stock</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionBtn, styles.bgIndigo]} onPress={() => router.push('/(workspace)/customers' as any)}>
              <Text style={styles.quickActionIcon}>👥</Text>
              <View>
                <Text style={styles.quickActionTitle}>Customers</Text>
                <Text style={styles.quickActionSub}>Ledger & KYC</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 6. Live Commercial Document Counters (Strictly Industry-Adapted) */}
      <View style={styles.countersCard}>
        <Text style={styles.cardHeaderTitle}>Live Commercial Document Counters</Text>
        <View style={styles.counterGrid}>
          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/billing' as any)}>
            <Text style={styles.counterLabel}>🧾 Invoices</Text>
            <Text style={styles.counterValue}>{completedBills}</Text>
            <Text style={styles.counterSub}>Billed & Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/quotations' as any)}>
            <Text style={styles.counterLabel}>📑 Quotations</Text>
            <Text style={styles.counterValue}>{quotationCount}</Text>
            <Text style={styles.counterSub}>Active Estimates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/receipts' as any)}>
            <Text style={styles.counterLabel}>📜 Receipts</Text>
            <Text style={styles.counterValue}>{receiptCount}</Text>
            <Text style={styles.counterSub}>Settled Vouchers</Text>
          </TouchableOpacity>

          {/* Wholesale-Specific Counters ONLY */}
          {businessType === BusinessType.WHOLESALE && (
            <>
              <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/wholesale' as any)}>
                <Text style={styles.counterLabel}>🚚 Sales Orders</Text>
                <Text style={styles.counterValue}>{salesOrderCount}</Text>
                <Text style={styles.counterSub}>B2B Contracts</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.counterItem} onPress={() => router.push('/(workspace)/wholesale' as any)}>
                <Text style={styles.counterLabel}>📦 Pending DC</Text>
                <Text style={[styles.counterValue, { color: '#EF4444' }]}>{pendingDispatches}</Text>
                <Text style={styles.counterSub}>Needs Dispatch</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 7. Industry Specific Live Operational Panel */}
      {businessType === BusinessType.RESTAURANT && (
        <TouchableOpacity
          style={styles.industryPanelCard}
          onPress={() => router.push('/(workspace)/restaurant' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.industryPanelHeader}>
            <Text style={styles.industryPanelTitle}>🍽️ Restaurant Live Floor</Text>
            <Text style={styles.industryPanelLink}>Manage Tables →</Text>
          </View>
          <View style={styles.industryPanelGrid}>
            <View style={styles.industryPanelStatBox}>
              <Text style={styles.industryPanelStatVal}>
                {pulseData?.industryKpis?.restaurant?.occupiedTables ?? 0} / {pulseData?.industryKpis?.restaurant?.totalTables ?? 0}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Occupied Tables</Text>
            </View>
            <View style={styles.industryPanelStatBox}>
              <Text style={[styles.industryPanelStatVal, { color: '#D97706' }]}>
                {pulseData?.industryKpis?.restaurant?.activeKots ?? 0}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Active KOTs</Text>
            </View>
            <View style={styles.industryPanelStatBox}>
              <Text style={[styles.industryPanelStatVal, { color: '#059669' }]}>
                {pulseData?.industryKpis?.restaurant?.readyOrders ?? completedBills}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Bills Settled</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {businessType === BusinessType.SERVICE && (
        <TouchableOpacity
          style={styles.industryPanelCard}
          onPress={() => router.push('/(workspace)/service' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.industryPanelHeader}>
            <Text style={styles.industryPanelTitle}>🔧 Service Center Live Status</Text>
            <Text style={styles.industryPanelLink}>View Job Cards →</Text>
          </View>
          <View style={styles.industryPanelGrid}>
            <View style={styles.industryPanelStatBox}>
              <Text style={styles.industryPanelStatVal}>
                {pulseData?.industryKpis?.service?.openJobs ?? 0}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Open Repairs</Text>
            </View>
            <View style={styles.industryPanelStatBox}>
              <Text style={[styles.industryPanelStatVal, { color: '#059669' }]}>
                {pulseData?.industryKpis?.service?.readyJobs ?? 0}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Ready for Pickup</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {businessType === BusinessType.PHARMACY && (
        <TouchableOpacity
          style={styles.industryPanelCard}
          onPress={() => router.push('/(workspace)/pharmacy' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.industryPanelHeader}>
            <Text style={styles.industryPanelTitle}>💊 Pharmacy Compliance & Expiry</Text>
            <Text style={styles.industryPanelLink}>Batch Directory →</Text>
          </View>
          <View style={styles.industryPanelGrid}>
            <View style={styles.industryPanelStatBox}>
              <Text style={[styles.industryPanelStatVal, { color: '#EF4444' }]}>
                {pulseData?.industryKpis?.pharmacy?.nearExpiryMedicines ?? 0}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Near Expiry</Text>
            </View>
            <View style={styles.industryPanelStatBox}>
              <Text style={[styles.industryPanelStatVal, { color: '#D97706' }]}>
                {lowStockCount}
              </Text>
              <Text style={styles.industryPanelStatLbl}>Low Stock Meds</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {businessType === BusinessType.WHOLESALE && (
        <TouchableOpacity
          style={styles.industryPanelCard}
          onPress={() => router.push('/(workspace)/wholesale' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.industryPanelHeader}>
            <Text style={styles.industryPanelTitle}>🚚 Wholesale B2B Logistics</Text>
            <Text style={styles.industryPanelLink}>Dispatch Center →</Text>
          </View>
          <View style={styles.industryPanelGrid}>
            <View style={styles.industryPanelStatBox}>
              <Text style={styles.industryPanelStatVal}>{salesOrderCount}</Text>
              <Text style={styles.industryPanelStatLbl}>Sales Orders</Text>
            </View>
            <View style={styles.industryPanelStatBox}>
              <Text style={[styles.industryPanelStatVal, { color: '#EF4444' }]}>{pendingDispatches}</Text>
              <Text style={styles.industryPanelStatLbl}>Pending Challans</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* 8. Live Tender Collections Breakdown */}
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

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  statusPending: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  dotGreen: { backgroundColor: '#10B981' },
  dotAmber: { backgroundColor: '#F59E0B' },
  dotBlue: { backgroundColor: '#3B82F6' },
  statusBannerText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500'
  },
  welcomeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  welcomeTextGroup: {
    flex: 1
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500'
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  orgTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  orgTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  branchScroll: {
    marginTop: 4
  },
  branchChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8
  },
  branchChipActive: {
    backgroundColor: '#2563EB'
  },
  branchChipText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600'
  },
  branchChipTextActive: {
    color: '#FFFFFF'
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  periodTabActive: {
    backgroundColor: '#3B82F6'
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8'
  },
  periodTabTextActive: {
    color: '#FFFFFF'
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 12
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 8,
    fontSize: 12
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  borderBlue: { borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  borderGreen: { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  borderPurple: { borderLeftWidth: 4, borderLeftColor: '#A855F7' },
  borderOrange: { borderLeftWidth: 4, borderLeftColor: '#F97316' },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4
  },
  metricMeta: {
    fontSize: 11,
    color: '#64748B'
  },
  metricMetaGreen: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600'
  },
  metricMetaPurple: {
    fontSize: 11,
    color: '#A855F7',
    fontWeight: '600'
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  quickActionBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  bgBlue: { borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  bgAmber: { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  bgEmerald: { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  bgIndigo: { borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  quickActionIcon: {
    fontSize: 22,
    marginRight: 10
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  quickActionSub: {
    fontSize: 10,
    color: '#94A3B8'
  },
  countersCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  counterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  counterItem: {
    width: '31%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  counterLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center'
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 2
  },
  counterSub: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center'
  },
  industryPanelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  industryPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  industryPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  industryPanelLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8'
  },
  industryPanelGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  industryPanelStatBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#334155'
  },
  industryPanelStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 2
  },
  industryPanelStatLbl: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center'
  },
  tenderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  tenderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  tenderItem: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#334155'
  },
  tenderLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4
  },
  tenderValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981'
  },
  bottomSpacer: {
    height: 40
  }
});
