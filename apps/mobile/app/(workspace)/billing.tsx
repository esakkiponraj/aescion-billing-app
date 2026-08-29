import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { useMobileAuth } from '../../src/auth/authContext';
import { defaultPrinter } from '../../src/hardware/printerAdapter';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function MobileBillingScreen() {
  const { organization, activeBranch, activeRole, isSuperAdmin } = useMobileAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Collect Payment Modal State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Void Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const isOwner = activeRole?.roleType === 'OWNER' || isSuperAdmin;

  const fetchInvoices = useCallback(async () => {
    try {
      const q = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const data = await MobileApiClient.get<any[]>(`/invoices${q}`);
      setInvoices(data || []);
    } catch (err: any) {
      console.warn('Failed to fetch invoices:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
    const unsub = subscribeToRealtimeEvent('invoice_created', () => fetchInvoices());
    const unsubPay = subscribeToRealtimeEvent('payment_created', () => fetchInvoices());
    return () => {
      unsub();
      unsubPay();
    };
  }, [fetchInvoices]);

  const handleReprint = (inv: any) => {
    defaultPrinter.printReceipt({
      companyName: organization?.name || 'AESCION Commerce',
      branchName: activeBranch?.name || 'Main Branch',
      invoiceNumber: inv.invoiceNumber,
      date: new Date(inv.createdAt).toLocaleString(),
      customerName: inv.customerName || inv.customer?.name || 'Walk-in Customer',
      items: (inv.lines || inv.items || []).map((i: any) => ({
        name: i.name || i.product?.name || 'Item',
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
        total: Number(i.lineTotal || (i.quantity * i.unitPrice))
      })),
      subtotal: Number(inv.subtotal),
      taxTotal: Number(inv.taxTotal),
      grandTotal: Number(inv.grandTotal),
      paymentMethod: inv.paymentMethod || inv.payments?.[0]?.method || 'CASH',
      cashierName: inv.createdByName || 'Cashier'
    });
    Alert.alert('🖨️ Receipt Dispatched', `Sent invoice ${inv.invoiceNumber} to thermal printer.`);
  };

  const handleOpenCollectPayment = (inv: any) => {
    const due = Number(inv.balanceAmount || (inv.grandTotal - (inv.paidAmount || 0)));
    setCollectAmount(String(due > 0 ? due : inv.grandTotal));
    setCollectMethod('CASH');
    setIsCollectModalOpen(true);
  };

  const handleCollectPayment = async () => {
    if (!selectedInvoice) return;
    const amount = parseFloat(collectAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive payment amount.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await MobileApiClient.post('/payments/collect', {
        invoiceId: selectedInvoice.id,
        amount,
        method: collectMethod,
        branchId: activeBranch?.id
      });
      setIsCollectModalOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
      Alert.alert('Success', `Payment of ₹${amount.toLocaleString('en-IN')} collected and receipt issued.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to collect payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!selectedInvoice) return;
    if (!voidReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for voiding this invoice.');
      return;
    }

    setIsVoiding(true);
    try {
      await MobileApiClient.put(`/invoices/${selectedInvoice.id}/void`, {
        reason: voidReason.trim()
      });
      setIsVoidModalOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
      Alert.alert('Invoice Voided', `Invoice ${selectedInvoice.invoiceNumber} marked as VOID.`);
    } catch (err: any) {
      Alert.alert('Void Failed', err.message || 'Failed to void invoice.');
    } finally {
      setIsVoiding(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      (inv.customerName || inv.customer?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Invoices & Bills ({filteredInvoices.length})</Text>
          <Text style={styles.headerSub}>Branch: {activeBranch?.name || 'Main'}</Text>
        </View>
        <TouchableOpacity style={styles.newBillBtn} onPress={() => router.push('/(workspace)/pos')}>
          <Text style={styles.newBillBtnText}>+ New Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Status Filter */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by invoice #, client name..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'VOID'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Invoices List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchInvoices(); }} />
          }
          renderItem={({ item }) => {
            const isPaid = item.status === 'PAID' || item.paymentStatus === 'PAID';
            const isVoid = item.status === 'VOID';
            const due = Number(item.balanceAmount || (item.grandTotal - (item.paidAmount || 0)));

            return (
              <TouchableOpacity
                style={[styles.invoiceCard, isVoid && styles.invoiceCardVoid]}
                onPress={() => setSelectedInvoice(item)}
                activeOpacity={0.9}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                    <Text style={styles.invoiceCustomer}>
                      👤 {item.customerName || item.customer?.name || 'Walk-in Customer'}
                    </Text>
                    <Text style={styles.invoiceDate}>
                      🕒 {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.invoiceAmount}>₹{Number(item.grandTotal).toLocaleString('en-IN')}</Text>
                    <View style={[styles.statusTag, isPaid ? styles.statusPaid : isVoid ? styles.statusVoid : styles.statusPending]}>
                      <Text style={[styles.statusTagText, isPaid ? styles.statusTextPaid : isVoid ? styles.statusTextVoid : styles.statusTextPending]}>
                        {item.status || item.paymentStatus || 'PAID'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity style={styles.printBtn} onPress={() => handleReprint(item)}>
                    <Text style={styles.printBtnText}>🖨️ Thermal Print</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.detailBtn} onPress={() => setSelectedInvoice(item)}>
                    <Text style={styles.detailBtnText}>View Breakdown →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>No Invoices Found</Text>
              <Text style={styles.emptyDesc}>Generate bills using Fast POS.</Text>
            </View>
          }
        />
      )}

      {/* Invoice Detail Modal */}
      <Modal visible={!!selectedInvoice} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedInvoice?.invoiceNumber}</Text>
                <Text style={styles.invoiceCustomer}>{selectedInvoice?.customerName || 'Walk-in Customer'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 12 }}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSecTitle}>ITEMIZED BREAKDOWN</Text>
                {(selectedInvoice?.lines || selectedInvoice?.items || []).map((line: any, idx: number) => (
                  <View key={idx} style={styles.detailLineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineName}>{line.name || line.product?.name || 'Item'}</Text>
                      <Text style={styles.lineMeta}>{line.quantity} x ₹{line.unitPrice} (+{line.taxRate}% GST)</Text>
                    </View>
                    <Text style={styles.lineTotal}>₹{Number(line.lineTotal || (line.quantity * line.unitPrice)).toLocaleString('en-IN')}</Text>
                  </View>
                ))}

                <View style={styles.totalsSummaryBox}>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLbl}>Subtotal:</Text>
                    <Text style={styles.sumVal}>₹{Number(selectedInvoice?.subtotal || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLbl}>Tax (GST):</Text>
                    <Text style={styles.sumVal}>₹{Number(selectedInvoice?.taxTotal || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.sumRow, styles.grandSumRow]}>
                    <Text style={styles.grandSumLbl}>Grand Total:</Text>
                    <Text style={styles.grandSumVal}>₹{Number(selectedInvoice?.grandTotal || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLbl}>Paid Amount:</Text>
                    <Text style={[styles.sumVal, { color: '#059669' }]}>₹{Number(selectedInvoice?.paidAmount || selectedInvoice?.grandTotal || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrint]}
                  onPress={() => {
                    handleReprint(selectedInvoice);
                    setSelectedInvoice(null);
                  }}
                >
                  <Text style={styles.actionBtnPrintText}>🖨️ Print Thermal</Text>
                </TouchableOpacity>

                {selectedInvoice?.status !== 'PAID' && selectedInvoice?.status !== 'VOID' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPay]}
                    onPress={() => handleOpenCollectPayment(selectedInvoice)}
                  >
                    <Text style={styles.actionBtnPayText}>💳 Collect Payment</Text>
                  </TouchableOpacity>
                )}

                {isOwner && selectedInvoice?.status !== 'VOID' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnVoid]}
                    onPress={() => {
                      setVoidReason('');
                      setIsVoidModalOpen(true);
                    }}
                  >
                    <Text style={styles.actionBtnVoidText}>🚫 Void Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal visible={isCollectModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Collect Invoice Payment</Text>
            <Text style={styles.dialogSub}>Invoice: {selectedInvoice?.invoiceNumber}</Text>

            <Text style={styles.inputLabel}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={collectAmount}
              onChangeText={setCollectAmount}
            />

            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={styles.methodRow}>
              {['CASH', 'UPI', 'CARD'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, collectMethod === m && styles.methodChipActive]}
                  onPress={() => setCollectMethod(m)}
                >
                  <Text style={[styles.methodChipText, collectMethod === m && styles.methodChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setIsCollectModalOpen(false)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogConfirmBtn, isSubmittingPayment && styles.submitDisabled]}
                onPress={handleCollectPayment}
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dialogConfirmText}>Record Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Void Modal */}
      <Modal visible={isVoidModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <Text style={[styles.dialogTitle, { color: '#DC2626' }]}>Void Commercial Invoice</Text>
            <Text style={styles.dialogSub}>Marking {selectedInvoice?.invoiceNumber} as VOID will reverse accounting and ledger entries.</Text>

            <Text style={styles.inputLabel}>Reason for Void *</Text>
            <TextInput
              style={[styles.formInput, { height: 60 }]}
              placeholder="e.g. Order cancelled by customer / Billing error"
              placeholderTextColor="#94A3B8"
              multiline
              value={voidReason}
              onChangeText={setVoidReason}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setIsVoidModalOpen(false)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: '#DC2626' }, isVoiding && styles.submitDisabled]}
                onPress={handleVoidInvoice}
                disabled={isVoiding}
              >
                {isVoiding ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dialogConfirmText}>Confirm Void</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  newBillBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  newBillBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  filterSection: { padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8
  },
  filterTabs: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#F1F5F9', marginRight: 6 },
  filterChipActive: { backgroundColor: '#2563EB' },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16, paddingBottom: 40 },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  invoiceCardVoid: { opacity: 0.6, borderColor: '#FCA5A5' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  invoiceCustomer: { fontSize: 12, color: '#334155', fontWeight: '600', marginTop: 2 },
  invoiceDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  invoiceAmount: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  statusPaid: { backgroundColor: '#ECFDF5' },
  statusVoid: { backgroundColor: '#FEF2F2' },
  statusPending: { backgroundColor: '#FFFBEB' },
  statusTagText: { fontSize: 10, fontWeight: '800' },
  statusTextPaid: { color: '#059669' },
  statusTextVoid: { color: '#DC2626' },
  statusTextPending: { color: '#D97706' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  printBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  printBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  detailBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  detailBtnText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  centerContainer: { padding: 48, alignItems: 'center' },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptyDesc: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  modalClose: { fontSize: 16, fontWeight: '700', color: '#64748B', padding: 4 },
  detailSection: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  detailSecTitle: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  detailLineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  lineName: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  lineMeta: { fontSize: 10, color: '#64748B' },
  lineTotal: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  totalsSummaryBox: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginTop: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  sumLbl: { fontSize: 11, color: '#475569' },
  sumVal: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  grandSumRow: { borderTopWidth: 1, borderTopColor: '#CBD5E1', paddingTop: 4, marginTop: 2 },
  grandSumLbl: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  grandSumVal: { fontSize: 14, fontWeight: '900', color: '#2563EB' },
  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 20 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnPrint: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  actionBtnPrintText: { color: '#0F172A', fontWeight: '700', fontSize: 12 },
  actionBtnPay: { backgroundColor: '#2563EB' },
  actionBtnPayText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  actionBtnVoid: { backgroundColor: '#FEE2E2' },
  actionBtnVoidText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  dialogBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, margin: 20, marginBottom: 'auto', marginTop: 'auto' },
  dialogTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  dialogSub: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 8 },
  formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  methodRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  methodChip: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#F1F5F9', alignItems: 'center' },
  methodChipActive: { backgroundColor: '#2563EB' },
  methodChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  methodChipTextActive: { color: '#FFFFFF' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  dialogCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  dialogCancelText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  dialogConfirmBtn: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  dialogConfirmText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  submitDisabled: { opacity: 0.6 }
});
