import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function ReportsScreen() {
  const [pulseData, setPulseData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('TODAY');
  const [activeTab, setActiveTab] = useState<'CHARTS' | 'SALES' | 'RECEIVABLES' | 'AUDIT'>('CHARTS');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const [pulse, summary, logsRes] = await Promise.all([
        MobileApiClient.get<any>(`/reports/dashboard-pulse?period=${period}`),
        MobileApiClient.get<any>('/reports/summary'),
        MobileApiClient.get<any>('/reports/audit-logs?limit=25').catch(() => ({ logs: [] }))
      ]);
      setPulseData(pulse);
      setSummaryData(summary);
      setAuditLogs(logsRes?.logs || []);
    } catch (err) {
      console.warn('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReports();
    const unsub = subscribeToRealtimeEvent('pulse_updated', () => fetchReports());
    const unsubInv = subscribeToRealtimeEvent('invoice_created', () => fetchReports());
    const unsubPay = subscribeToRealtimeEvent('payment_created', () => fetchReports());

    return () => {
      unsub();
      unsubInv();
      unsubPay();
    };
  }, [fetchReports]);

  const totalRevenue = pulseData?.totalRevenue ?? 0;
  const completedBills = pulseData?.completedBills ?? pulseData?.invoiceCount ?? 0;
  const quotationCount = pulseData?.quotationCount ?? 0;
  const receiptCount = pulseData?.receiptCount ?? 0;
  const salesOrderCount = pulseData?.salesOrderCount ?? 0;
  const pendingDispatches = pulseData?.pendingDispatches ?? 0;
  const grossMargin = pulseData?.estimatedProfit ?? 0;
  const receivables = pulseData?.customerReceivables ?? pulseData?.pendingReceivables ?? 0;
  const supplierPayables = pulseData?.supplierPayables ?? 0;

  const collections = pulseData?.collections || {
    cash: pulseData?.paymentBreakdown?.CASH || 0,
    upi: pulseData?.paymentBreakdown?.UPI || 0,
    card: pulseData?.paymentBreakdown?.CARD || 0,
    other: pulseData?.paymentBreakdown?.CREDIT || 0
  };

  const totalCollected = (collections.cash + collections.upi + collections.card + collections.other) || 1;
  const revenueTrend = summaryData?.revenueTrend || [];
  const topProducts = summaryData?.topSellingProducts || [];
  const ageing = summaryData?.receivablesAgeing || { current0to30: 0, days31to60: 0, days61to90: 0, daysAbove90: 0, total: 0 };
  const invoiceStatus = summaryData?.invoiceStatusBreakdown || { PAID: 0, PARTIALLY_PAID: 0, UNPAID: 0 };
  const orderStatus = summaryData?.salesOrderStatusBreakdown || { ORDER_PLACED: 0, DISPATCHED: 0, INVOICED: 0 };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchReports(); }} />}
    >
      {/* Period Selection */}
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

      {/* 8 Primary KPI Tiles */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.borderBlue]}>
          <Text style={styles.kpiLabel}>Revenue</Text>
          <Text style={styles.kpiVal}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderGreen]}>
          <Text style={styles.kpiLabel}>Gross Margin</Text>
          <Text style={[styles.kpiVal, styles.textGreen]}>₹{grossMargin.toLocaleString('en-IN')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderIndigo]}>
          <Text style={styles.kpiLabel}>Invoices</Text>
          <Text style={styles.kpiVal}>{completedBills}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderSky]}>
          <Text style={styles.kpiLabel}>Quotations</Text>
          <Text style={styles.kpiVal}>{quotationCount}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderTeal]}>
          <Text style={styles.kpiLabel}>Receipts</Text>
          <Text style={styles.kpiVal}>{receiptCount}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderPurple]}>
          <Text style={styles.kpiLabel}>Receivables</Text>
          <Text style={styles.kpiVal}>₹{receivables.toLocaleString('en-IN')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderOrange]}>
          <Text style={styles.kpiLabel}>Payables</Text>
          <Text style={styles.kpiVal}>₹{supplierPayables.toLocaleString('en-IN')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.borderRed]}>
          <Text style={styles.kpiLabel}>Pending DC</Text>
          <Text style={[styles.kpiVal, { color: '#EF4444' }]}>{pendingDispatches}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNav}>
        {[
          { id: 'CHARTS', label: 'Charts & Trends' },
          { id: 'SALES', label: 'Top Items' },
          { id: 'RECEIVABLES', label: 'Ageing' },
          { id: 'AUDIT', label: 'Audit Trail' }
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabButton, activeTab === t.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(t.id as any)}
          >
            <Text style={[styles.tabButtonText, activeTab === t.id && styles.tabButtonTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && !pulseData ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Compiling business analytics...</Text>
        </View>
      ) : (
        <>
          {/* TAB 1: CHARTS & TRENDS */}
          {activeTab === 'CHARTS' && (
            <View style={styles.tabContent}>
              {/* Revenue Trend Visual Bar Graph */}
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>7-Day Revenue Trend (₹)</Text>
                {revenueTrend.length === 0 ? (
                  <Text style={styles.noDataText}>No revenue history recorded.</Text>
                ) : (
                  <View style={styles.trendContainer}>
                    {(() => {
                      const maxRev = Math.max(...revenueTrend.map((d: any) => d.revenue), 100);
                      return (
                        <View style={styles.barGraphRow}>
                          {revenueTrend.map((d: any, idx: number) => {
                            const h = Math.max(8, Math.round((d.revenue / maxRev) * 110));
                            return (
                              <View key={idx} style={styles.barCol}>
                                <Text style={styles.barVal}>₹{d.revenue > 999 ? `${Math.round(d.revenue / 1000)}k` : d.revenue}</Text>
                                <View style={[styles.barPillar, { height: h }]} />
                                <Text style={styles.barLabel}>{d.label.split(',')[0]}</Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>

              {/* Tender Breakdown Progress Bars */}
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Settlement by Payment Tender</Text>
                <View style={styles.tenderList}>
                  {[
                    { label: '💵 Cash in Drawer', val: collections.cash, color: '#10B981' },
                    { label: '📱 UPI / QR Code', val: collections.upi, color: '#2563EB' },
                    { label: '💳 Credit / Debit Card', val: collections.card, color: '#F97316' },
                    { label: '📋 Customer Credit', val: collections.other, color: '#8B5CF6' }
                  ].map((it, idx) => {
                    const pct = Math.round((it.val / totalCollected) * 100) || 0;
                    return (
                      <View key={idx} style={styles.tenderRowItem}>
                        <View style={styles.tenderRowHeader}>
                          <Text style={styles.tenderRowName}>{it.label}</Text>
                          <Text style={styles.tenderRowAmt}>
                            ₹{it.val.toLocaleString('en-IN')} ({pct}%)
                          </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: it.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Status Distribution */}
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Commercial Pipelines</Text>
                <View style={styles.pipelineGrid}>
                  <View style={styles.pipelineCol}>
                    <Text style={styles.pipelineHeader}>Invoices</Text>
                    {Object.entries(invoiceStatus).map(([st, c]: any) => (
                      <View key={st} style={styles.pipelineItem}>
                        <Text style={styles.pipelineName}>{st}</Text>
                        <Text style={styles.pipelineCount}>{c}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.pipelineCol}>
                    <Text style={styles.pipelineHeader}>Wholesale</Text>
                    {Object.entries(orderStatus).slice(0, 3).map(([st, c]: any) => (
                      <View key={st} style={styles.pipelineItem}>
                        <Text style={styles.pipelineName}>{st.replace(/_/g, ' ')}</Text>
                        <Text style={styles.pipelineCount}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: TOP SELLING PRODUCTS */}
          {activeTab === 'SALES' && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Top Selling Items</Text>
              {topProducts.length === 0 ? (
                <Text style={styles.noDataText}>No sales recorded in this timeframe.</Text>
              ) : (
                topProducts.map((p: any, idx: number) => (
                  <View key={idx} style={styles.rankRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankNum}>#{idx + 1}</Text>
                    </View>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>{p.name}</Text>
                      <Text style={styles.rankQty}>{p.quantity} units sold</Text>
                    </View>
                    <Text style={styles.rankRevenue}>₹{Number(p.revenue || p.totalRevenue || 0).toLocaleString('en-IN')}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: RECEIVABLES AGEING */}
          {activeTab === 'RECEIVABLES' && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Credit Receivables Ageing</Text>
              <View style={styles.ageingList}>
                <View style={styles.ageingRow}>
                  <Text style={[styles.ageingLabel, { color: '#047857' }]}>0 – 30 Days (Current)</Text>
                  <Text style={styles.ageingVal}>₹{ageing.current0to30.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.ageingRow}>
                  <Text style={[styles.ageingLabel, { color: '#B45309' }]}>31 – 60 Days</Text>
                  <Text style={styles.ageingVal}>₹{ageing.days31to60.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.ageingRow}>
                  <Text style={[styles.ageingLabel, { color: '#C2410C' }]}>61 – 90 Days</Text>
                  <Text style={styles.ageingVal}>₹{ageing.days61to90.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.ageingRow}>
                  <Text style={[styles.ageingLabel, { color: '#B91C1C' }]}>90+ Days (Overdue)</Text>
                  <Text style={[styles.ageingVal, { color: '#B91C1C' }]}>₹{ageing.daysAbove90.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'AUDIT' && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Recent System Audit Log</Text>
              {auditLogs.length === 0 ? (
                <Text style={styles.noDataText}>No audit activity recorded.</Text>
              ) : (
                auditLogs.map((log: any) => (
                  <View key={log.id} style={styles.auditCard}>
                    <View style={styles.auditHeaderRow}>
                      <Text style={styles.auditUser}>👤 {log.userName || 'System'}</Text>
                      <Text style={styles.auditTime}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.auditBadgeRow}>
                      <View style={styles.auditBadge}>
                        <Text style={styles.auditBadgeText}>{log.action}</Text>
                      </View>
                      <Text style={styles.auditEntity}>{log.entityType}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    padding: 14,
    paddingBottom: 40
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
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  periodTabTextActive: {
    color: '#FFFFFF'
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  kpiCard: {
    width: '23.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3
  },
  borderBlue: { borderLeftColor: '#2563EB' },
  borderGreen: { borderLeftColor: '#10B981' },
  borderIndigo: { borderLeftColor: '#6366F1' },
  borderSky: { borderLeftColor: '#3B82F6' },
  borderTeal: { borderLeftColor: '#059669' },
  borderPurple: { borderLeftColor: '#8B5CF6' },
  borderOrange: { borderLeftColor: '#F97316' },
  borderRed: { borderLeftColor: '#EF4444' },
  kpiLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase'
  },
  kpiVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2
  },
  textGreen: {
    color: '#047857'
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
    marginBottom: 12
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6
  },
  tabButtonActive: {
    backgroundColor: '#2563EB'
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  tabButtonTextActive: {
    color: '#FFFFFF'
  },
  tabContent: {
    gap: 12
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
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
    letterSpacing: 0.5,
    marginBottom: 12
  },
  trendContainer: {
    paddingTop: 8
  },
  barGraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  barVal: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 2
  },
  barPillar: {
    width: 18,
    backgroundColor: '#2563EB',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  barLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4
  },
  tenderList: {
    gap: 10
  },
  tenderRowItem: {
    marginBottom: 4
  },
  tenderRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  tenderRowName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155'
  },
  tenderRowAmt: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'monospace'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  pipelineGrid: {
    flexDirection: 'row',
    gap: 10
  },
  pipelineCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8
  },
  pipelineHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  pipelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  pipelineName: {
    fontSize: 10,
    color: '#334155'
  },
  pipelineCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
    fontFamily: 'monospace'
  },
  noDataText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 14
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  rankNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1D4ED8'
  },
  rankInfo: {
    flex: 1
  },
  rankName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A'
  },
  rankQty: {
    fontSize: 10,
    color: '#64748B'
  },
  rankRevenue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  ageingList: {
    gap: 8
  },
  ageingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6
  },
  ageingLabel: {
    fontSize: 11,
    fontWeight: '600'
  },
  ageingVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'monospace'
  },
  auditCard: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EDF1F5'
  },
  auditHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  auditUser: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  auditTime: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace'
  },
  auditBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  auditBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#EFF6FF',
    borderRadius: 4
  },
  auditBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1D4ED8'
  },
  auditEntity: {
    fontSize: 10,
    color: '#64748B'
  }
});
