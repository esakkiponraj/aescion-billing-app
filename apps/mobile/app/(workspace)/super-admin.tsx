import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useMobileAuth } from '../../src/auth/authContext';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { getMobileSocket, subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function MobileSuperAdminScreen() {
  const { user, logout } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COMPANIES' | 'ACTIVITY' | 'REPORTS'>('OVERVIEW');
  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [presenceData, setPresenceData] = useState<any>({ onlineOwners: [], snapshot: {} });
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companyDetailTab, setCompanyDetailTab] = useState<'OVERVIEW' | 'PRESENCE' | 'INVOICES' | 'USERS' | 'AUDIT'>('OVERVIEW');
  const [companyDetailData, setCompanyDetailData] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchPlatformData = useCallback(async () => {
    try {
      const [statsData, compData, presenceData, actData, repData] = await Promise.all([
        MobileApiClient.get<any>('/super-admin/stats'),
        MobileApiClient.get<any>('/super-admin/companies?limit=50'),
        MobileApiClient.get<any>('/super-admin/presence'),
        MobileApiClient.get<any[]>('/super-admin/activity-feed?limit=30'),
        MobileApiClient.get<any>('/super-admin/reports/platform')
      ]);
      setStats(statsData);
      setCompanies(compData?.data || []);
      setPresenceData(presenceData || { onlineOwners: [], snapshot: {} });
      setActivities(actData || []);
      setReports(repData);
    } catch (err) {
      console.warn('Failed to load mobile Super Admin data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformData();

    const socket = getMobileSocket();
    if (socket) {
      socket.emit('join_super_admin');
      socket.emit('join_platform');

      const handlePresence = (payload: any) => {
        if (payload?.onlineOwners) {
          setPresenceData({
            onlineOwners: payload.onlineOwners,
            snapshot: {
              onlineOwnersCount: payload.onlineOwnersCount,
              activeSessionsCount: payload.activeSessionsCount
            }
          });
        } else {
          fetchPlatformData();
        }
      };

      const unsubPresence = subscribeToRealtimeEvent('presence_updated', handlePresence);
      const unsubPulse = subscribeToRealtimeEvent('platform_pulse_updated', fetchPlatformData);
      const unsubInv = subscribeToRealtimeEvent('platform_invoice_created', fetchPlatformData);
      const unsubQtn = subscribeToRealtimeEvent('platform_quotation_updated', fetchPlatformData);
      const unsubPay = subscribeToRealtimeEvent('platform_payment_created', fetchPlatformData);
      const unsubAct = subscribeToRealtimeEvent('platform_activity_created', fetchPlatformData);

      return () => {
        unsubPresence();
        unsubPulse();
        unsubInv();
        unsubQtn();
        unsubPay();
        unsubAct();
      };
    }
  }, [fetchPlatformData]);

  // Load individual company detail drilldown
  const openCompanyDetail = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setCompanyDetailTab('OVERVIEW');
    setIsDetailLoading(true);
    try {
      const comp = await MobileApiClient.get<any>(`/super-admin/companies/${companyId}`);
      const overview = await MobileApiClient.get<any>(`/super-admin/companies/${companyId}/overview`);
      setSelectedCompany(comp);
      setCompanyDetailData(overview);
    } catch (err) {
      Alert.alert('Error', 'Failed to load company detail');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const switchDetailTab = async (tab: 'OVERVIEW' | 'PRESENCE' | 'INVOICES' | 'USERS' | 'AUDIT') => {
    setCompanyDetailTab(tab);
    if (!selectedCompanyId) return;

    setIsDetailLoading(true);
    try {
      let data: any = null;
      if (tab === 'OVERVIEW') {
        data = await MobileApiClient.get<any>(`/super-admin/companies/${selectedCompanyId}/overview`);
      } else if (tab === 'PRESENCE') {
        data = await MobileApiClient.get<any>(`/super-admin/companies/${selectedCompanyId}/presence`);
      } else if (tab === 'INVOICES') {
        data = await MobileApiClient.get<any>(`/super-admin/companies/${selectedCompanyId}/invoices`);
      } else if (tab === 'USERS') {
        data = await MobileApiClient.get<any>(`/super-admin/companies/${selectedCompanyId}/users`);
      } else if (tab === 'AUDIT') {
        data = await MobileApiClient.get<any>(`/super-admin/companies/${selectedCompanyId}/audit-logs`);
      }
      setCompanyDetailData(data);
    } catch (err) {
      Alert.alert('Error', `Failed to load ${tab} data`);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId: string, currentStatus: string, companyName: string) => {
    const isActivating = currentStatus === 'SUSPENDED';
    Alert.alert(
      isActivating ? 'Activate Company' : 'Suspend Company',
      isActivating ? `Reactivate ${companyName}?` : `Suspend ${companyName}? Staff will not be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActivating ? 'Activate' : 'Suspend',
          style: isActivating ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await MobileApiClient.patch(`/super-admin/companies/${companyId}/status`, {
                active: isActivating,
                reason: isActivating ? 'Reactivated by Mobile Super Admin' : 'Suspended by Mobile Super Admin'
              });
              fetchPlatformData();
              if (selectedCompanyId === companyId) {
                openCompanyDetail(companyId);
              }
            } catch (err: any) {
              Alert.alert('Action Failed', err.message || 'Could not update status');
            }
          }
        }
      ]
    );
  };

  const onlineOwnersList = presenceData?.onlineOwners || [];
  const onlineOwnersCount = stats?.onlineOwners || onlineOwnersList.length || 0;
  const desktopSessionsCount = stats?.desktopSessions ?? presenceData?.snapshot?.desktopSessionsCount ?? 0;
  const mobileSessionsCount = stats?.mobileSessions ?? presenceData?.snapshot?.mobileSessionsCount ?? 0;

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.businessType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Platform Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.livePulse} />
            <Text style={styles.badgeText}>PLATFORM SUPER ADMIN</Text>
          </View>
          <Text style={styles.title}>AESCION Central OS</Text>
          <Text style={styles.subtitle}>{user?.email} • Platform Master</Text>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Bar */}
      <View style={styles.tabBar}>
        {(['OVERVIEW', 'COMPANIES', 'ACTIVITY', 'REPORTS'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Connecting to Authoritative Platform Engine...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchPlatformData(); }} />}
        >
          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'OVERVIEW' && (
            <View style={styles.tabContent}>
              {/* Presence Live Grid */}
              <Text style={styles.sectionHeader}>LIVE OWNER PRESENCE & SESSIONS</Text>
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderColor: '#10b981', backgroundColor: '#ecfdf5' }]}>
                  <Text style={styles.kpiLabel}>ONLINE OWNERS</Text>
                  <Text style={[styles.kpiValue, { color: '#047857' }]}>{onlineOwnersCount}</Text>
                  <Text style={styles.kpiSub}>Unique Active Owners</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>ACTIVE SESSIONS</Text>
                  <Text style={[styles.kpiValue, { color: '#4f46e5' }]}>{desktopSessionsCount + mobileSessionsCount}</Text>
                  <Text style={styles.kpiSub}>
                    {desktopSessionsCount} Desktop • {mobileSessionsCount} Mobile
                  </Text>
                </View>
              </View>

              {/* Live Connected Owners Roster */}
              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>CONNECTED OWNERS NOW</Text>
              {onlineOwnersList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No Owners currently connected to realtime socket.</Text>
                </View>
              ) : (
                onlineOwnersList.map((owner: any) => (
                  <TouchableOpacity
                    key={owner.userId}
                    onPress={() => openCompanyDetail(owner.organizationId)}
                    style={styles.presenceOwnerCard}
                  >
                    <View style={styles.presenceOwnerRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{owner.userName?.charAt(0) || 'O'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.ownerName}>{owner.userName}</Text>
                          <Text style={styles.onlinePill}>ONLINE</Text>
                        </View>
                        <Text style={styles.companySub}>{owner.companyName} • {owner.businessType}</Text>
                      </View>
                    </View>

                    <View style={styles.presenceMetaRow}>
                      <Text style={styles.platformBadge}>
                        {owner.platform === 'both' ? '💻 Desktop + 📱 Mobile' : owner.platform === 'desktop' ? '💻 Desktop Only' : '📱 Mobile Only'}
                      </Text>
                      <Text style={styles.timeText}>Since: {new Date(owner.connectedSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* Financial KPIs */}
              <Text style={[styles.sectionHeader, { marginTop: 18 }]}>PLATFORM COMMERCIAL VOLUME</Text>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>TOTAL REVENUE</Text>
                  <Text style={styles.kpiValue}>₹{(stats?.totalPlatformRevenue || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.kpiSub}>Gross Invoiced Volume</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>TAX INVOICES</Text>
                  <Text style={styles.kpiValue}>{(stats?.totalInvoices || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.kpiSub}>Commercial Bills</Text>
                </View>
              </View>

              <View style={[styles.kpiGrid, { marginTop: 10 }]}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>REGISTERED TENANTS</Text>
                  <Text style={styles.kpiValue}>{stats?.totalCompanies || 0}</Text>
                  <Text style={styles.kpiSub}>{stats?.activeCompanies || 0} Active Accounts</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>RECEIVABLES</Text>
                  <Text style={[styles.kpiValue, { color: '#d97706' }]}>₹{(stats?.totalReceivables || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.kpiSub}>Total Customer Balances</Text>
                </View>
              </View>
            </View>
          )}

          {/* ================= COMPANIES DIRECTORY TAB ================= */}
          {activeTab === 'COMPANIES' && (
            <View style={styles.tabContent}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search company, owner, business type..."
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
              />

              <Text style={styles.sectionHeader}>REGISTERED ENTERPRISES ({filteredCompanies.length})</Text>

              {filteredCompanies.map((comp) => {
                const isSuspended = comp.status === 'SUSPENDED';
                const isOnline = comp.isOnline;

                return (
                  <TouchableOpacity
                    key={comp.id}
                    onPress={() => openCompanyDetail(comp.id)}
                    style={styles.companyCard}
                  >
                    <View style={styles.companyCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.companyName}>{comp.name}</Text>
                          {isOnline ? (
                            <Text style={styles.onlineBadge}>ONLINE</Text>
                          ) : (
                            <Text style={styles.offlineBadge}>OFFLINE</Text>
                          )}
                        </View>
                        <Text style={styles.companyOwner}>Owner: {comp.ownerName} • {comp.businessType}</Text>
                      </View>

                      <Text style={[styles.statusPill, isSuspended ? styles.statusSuspended : styles.statusActive]}>
                        {comp.status}
                      </Text>
                    </View>

                    <View style={styles.companyCardFooter}>
                      <Text style={styles.metaItem}>🏢 {comp.branchesCount} Outlets</Text>
                      <Text style={styles.metaItem}>👥 {comp.usersCount} Staff</Text>
                      <Text style={styles.revenueItem}>₹{(comp.totalRevenue || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ================= ACTIVITY STREAM TAB ================= */}
          {activeTab === 'ACTIVITY' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>LIVE CROSS-TENANT AUDIT FEED</Text>

              {activities.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No platform activity recorded yet.</Text>
                </View>
              ) : (
                activities.map((act) => (
                  <View key={act.id} style={styles.activityItem}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityCompany}>{act.companyName}</Text>
                      <Text style={styles.activityTime}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.activityAction}>{act.action} by {act.userName}</Text>
                    <Text style={styles.activityMeta}>Entity: {act.entityType}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ================= PLATFORM REPORTS TAB ================= */}
          {activeTab === 'REPORTS' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>TOP REVENUE PRODUCING COMPANIES</Text>
              {(reports?.topCompanies || []).map((tc: any, i: number) => (
                <TouchableOpacity
                  key={tc.id}
                  onPress={() => openCompanyDetail(tc.id)}
                  style={styles.topCompRow}
                >
                  <Text style={styles.rankNum}>#{i + 1}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.topCompName}>{tc.name}</Text>
                    <Text style={styles.topCompType}>{tc.businessType} • {tc.invoiceCount} invoices</Text>
                  </View>
                  <Text style={styles.topCompRev}>₹{(tc.revenue || 0).toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ================= SINGLE-TENANT DRILLDOWN MODAL ================= */}
      <Modal visible={selectedCompanyId != null} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedCompanyId(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedCompany?.name || 'Company Details'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                selectedCompany &&
                toggleCompanyStatus(selectedCompany.id, selectedCompany.status, selectedCompany.name)
              }
              style={[
                styles.modalActionBtn,
                selectedCompany?.status === 'SUSPENDED' ? styles.btnActivate : styles.btnSuspend
              ]}
            >
              <Text style={styles.modalActionBtnText}>
                {selectedCompany?.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modal Sub Tabs */}
          <View style={styles.modalTabBar}>
            {(['OVERVIEW', 'PRESENCE', 'INVOICES', 'USERS', 'AUDIT'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => switchDetailTab(tab)}
                style={[styles.modalTabItem, companyDetailTab === tab && styles.modalTabActive]}
              >
                <Text style={[styles.modalTabText, companyDetailTab === tab && styles.modalTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isDetailLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.loadingText}>Fetching isolated company data...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody}>
              {companyDetailTab === 'OVERVIEW' && (
                <View style={{ gap: 12 }}>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.infoLabel}>OWNER & CONTACT</Text>
                    <Text style={styles.infoValue}>
                      {selectedCompany?.owner?.firstName} {selectedCompany?.owner?.lastName}
                    </Text>
                    <Text style={styles.infoSub}>{selectedCompany?.owner?.email || selectedCompany?.email}</Text>
                    <Text style={styles.infoSub}>{selectedCompany?.phone}</Text>
                  </View>

                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiLabel}>REVENUE</Text>
                      <Text style={styles.kpiValue}>
                        ₹{(selectedCompany?.financials?.totalRevenue || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiLabel}>INVOICES</Text>
                      <Text style={styles.kpiValue}>{selectedCompany?.financials?.invoiceCount || 0}</Text>
                    </View>
                  </View>
                </View>
              )}

              {companyDetailTab === 'PRESENCE' && (
                <View style={{ gap: 10 }}>
                  <Text style={styles.sectionHeader}>ACTIVE CLIENT SESSIONS</Text>
                  {companyDetailData?.sessions?.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>No active device sessions for this company.</Text>
                    </View>
                  ) : (
                    companyDetailData?.sessions?.map((s: any, idx: number) => (
                      <View key={idx} style={styles.presenceSessionCard}>
                        <Text style={styles.sessionPlatform}>
                          {s.platform === 'desktop' ? '💻 Desktop Session' : '📱 Mobile Session'}
                        </Text>
                        <Text style={styles.sessionUser}>{s.userName} ({s.roleType})</Text>
                        <Text style={styles.sessionTime}>Connected: {new Date(s.connectedAt).toLocaleTimeString()}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {companyDetailTab === 'INVOICES' && (
                <View style={{ gap: 8 }}>
                  {Array.isArray(companyDetailData) &&
                    companyDetailData.map((inv: any) => (
                      <View key={inv.id} style={styles.detailRow}>
                        <View>
                          <Text style={styles.detailRowMain}>{inv.invoiceNumber}</Text>
                          <Text style={styles.detailRowSub}>{inv.customerName || 'Walk-in'}</Text>
                        </View>
                        <Text style={styles.detailRowRight}>₹{Number(inv.grandTotal).toLocaleString('en-IN')}</Text>
                      </View>
                    ))}
                </View>
              )}

              {companyDetailTab === 'USERS' && (
                <View style={{ gap: 8 }}>
                  {Array.isArray(companyDetailData) &&
                    companyDetailData.map((u: any) => (
                      <View key={u.userId} style={styles.detailRow}>
                        <View>
                          <Text style={styles.detailRowMain}>{u.name}</Text>
                          <Text style={styles.detailRowSub}>{u.role} • {u.email}</Text>
                        </View>
                        <Text style={[styles.statusPill, u.isActive ? styles.statusActive : styles.statusSuspended]}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {companyDetailTab === 'AUDIT' && (
                <View style={{ gap: 8 }}>
                  {Array.isArray(companyDetailData) &&
                    companyDetailData.map((a: any) => (
                      <View key={a.id} style={styles.detailRow}>
                        <View>
                          <Text style={styles.detailRowMain}>{a.action}</Text>
                          <Text style={styles.detailRowSub}>{a.userName} • {new Date(a.createdAt).toLocaleTimeString()}</Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#818cf8', letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  subtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  logoutButton: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#f87171', fontSize: 11, fontWeight: '700' },
  tabBar: { flexDirection: 'row', backgroundColor: '#1e293b', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#818cf8' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  kpiValue: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginVertical: 4 },
  kpiSub: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  presenceOwnerCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  presenceOwnerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  ownerName: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  onlinePill: { fontSize: 9, fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  companySub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  presenceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  platformBadge: { fontSize: 10, fontWeight: '700', color: '#c084fc' },
  timeText: { fontSize: 10, color: '#64748b' },
  searchInput: { backgroundColor: '#1e293b', color: '#ffffff', padding: 12, borderRadius: 10, fontSize: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  companyCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  companyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyName: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  companyOwner: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  onlineBadge: { fontSize: 9, fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  offlineBadge: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  statusPill: { fontSize: 9, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399' },
  statusSuspended: { backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' },
  companyCardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  metaItem: { fontSize: 11, color: '#94a3b8' },
  revenueItem: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  activityItem: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  activityCompany: { fontSize: 12, fontWeight: '800', color: '#818cf8' },
  activityTime: { fontSize: 10, color: '#64748b' },
  activityAction: { fontSize: 12, fontWeight: '700', color: '#ffffff', marginTop: 2 },
  activityMeta: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  topCompRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginBottom: 8 },
  rankNum: { fontSize: 13, fontWeight: '800', color: '#818cf8' },
  topCompName: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  topCompType: { fontSize: 10, color: '#94a3b8' },
  topCompRev: { fontSize: 13, fontWeight: '900', color: '#34d399' },
  emptyCard: { padding: 24, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12 },
  emptyText: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#94a3b8', fontSize: 12, marginTop: 10 },
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#818cf8', fontWeight: '800', fontSize: 13 },
  modalTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', flex: 1, marginHorizontal: 8 },
  modalActionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  btnSuspend: { backgroundColor: 'rgba(239,68,68,0.2)' },
  btnActivate: { backgroundColor: 'rgba(16,185,129,0.2)' },
  modalActionBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  modalTabBar: { flexDirection: 'row', backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modalTabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  modalTabText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  modalTabTextActive: { color: '#818cf8' },
  modalBody: { flex: 1, padding: 16 },
  modalInfoBox: { backgroundColor: '#1e293b', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  infoLabel: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  infoSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  detailRow: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  detailRowMain: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  detailRowSub: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  detailRowRight: { fontSize: 12, fontWeight: '800', color: '#34d399' },
  presenceSessionCard: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  sessionPlatform: { fontSize: 12, fontWeight: '800', color: '#c084fc' },
  sessionUser: { fontSize: 11, color: '#ffffff', marginTop: 2 },
  sessionTime: { fontSize: 10, color: '#64748b', marginTop: 2 }
});
