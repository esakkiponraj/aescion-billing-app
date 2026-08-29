import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';
import { useMobileAuth } from '../../src/auth/authContext';

export default function QuotationsScreen() {
  const { organization, activeBranch, activeRole, isSuperAdmin } = useMobileAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // New Quote Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [items, setItems] = useState<any[]>([
    { name: '', quantity: 1, unitPrice: 0, taxRate: 18 }
  ]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail / View Modal State
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  const fetchQuotations = useCallback(async () => {
    try {
      const data = await MobileApiClient.get<any[]>('/quotations');
      setQuotations(data || []);
    } catch (err) {
      console.warn('Failed to fetch quotations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [custList, prodList] = await Promise.all([
        MobileApiClient.get<any[]>('/customers').catch(() => []),
        MobileApiClient.get<any[]>('/products').catch(() => [])
      ]);
      setCustomers(custList || []);
      setProducts(prodList || []);
    } catch (err) {
      console.warn('Failed to load aux data for quotes:', err);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
    fetchAuxiliaryData();
    const unsub = subscribeToRealtimeEvent('quotation_updated', () => fetchQuotations());
    return unsub;
  }, [fetchQuotations, fetchAuxiliaryData]);

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setWalkinName('');
    setWalkinPhone('');
    setItems([{ name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
    setNotes('');
    setIsCreateModalOpen(true);
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, it) => sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1), 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, it) => {
      const lineSub = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
      const taxPct = (Number(it.taxRate) || 0) / 100;
      return sum + lineSub * taxPct;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreateQuotation = async () => {
    const validItems = items.filter((it) => it.name.trim() && Number(it.unitPrice) > 0);
    if (validItems.length === 0) {
      Alert.alert('Validation Error', 'Please enter at least one line item with a valid name and price.');
      return;
    }

    setIsSubmitting(true);
    try {
      await MobileApiClient.post('/quotations', {
        branchId: activeBranch?.id,
        customerId: selectedCustomer?.id || undefined,
        customerName: selectedCustomer ? selectedCustomer.name : (walkinName.trim() || 'Valued Client'),
        customerPhone: selectedCustomer ? selectedCustomer.phone : (walkinPhone.trim() || undefined),
        items: validItems.map((it) => ({
          productId: it.productId || undefined,
          name: it.name.trim(),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: Number(it.taxRate) || 0
        })),
        notes: notes.trim() || undefined
      });

      setIsCreateModalOpen(false);
      fetchQuotations();
      Alert.alert('Success', 'Commercial quotation created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, status: string) => {
    try {
      await MobileApiClient.put(`/quotations/${quoteId}/status`, { status });
      fetchQuotations();
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote((prev: any) => ({ ...prev, status }));
      }
      Alert.alert('Status Updated', `Quotation marked as ${status}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update quotation status.');
    }
  };

  const handleConvertToInvoice = async (quote: any) => {
    Alert.alert(
      'Convert Quotation',
      `Convert Estimate ${quote.quotationNumber} (₹${quote.grandTotal.toLocaleString('en-IN')}) into an official Tax Invoice?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert & Bill',
          onPress: async () => {
            setConvertingId(quote.id);
            try {
              await MobileApiClient.post(`/quotations/${quote.id}/convert`, {});
              Alert.alert('Success', `Invoice generated from ${quote.quotationNumber}!`);
              fetchQuotations();
              if (selectedQuote && selectedQuote.id === quote.id) {
                setSelectedQuote(null);
              }
            } catch (err: any) {
              Alert.alert('Conversion Failed', err.message || 'Failed to convert quotation.');
            } finally {
              setConvertingId(null);
            }
          }
        }
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return { bg: '#ECFDF5', text: '#059669', label: 'Converted' };
      case 'ACCEPTED':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Accepted' };
      case 'SENT':
        return { bg: '#FFFBEB', text: '#D97706', label: 'Sent' };
      case 'REJECTED':
        return { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: 'Draft' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Quotations & Estimates ({quotations.length})</Text>
          <Text style={styles.headerSub}>Active Branch: {activeBranch?.name || 'Main'}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+ New Quote</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading estimates & quotes...</Text>
        </View>
      ) : (
        <FlatList
          data={quotations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchQuotations(); }} />
          }
          renderItem={({ item }) => {
            const statusInfo = getStatusStyle(item.status);
            const isConverted = item.status === 'CONVERTED';
            const isConverting = convertingId === item.id;
            const itemCount = item.items?.length || 0;

            return (
              <TouchableOpacity style={styles.quoteCard} onPress={() => setSelectedQuote(item)} activeOpacity={0.9}>
                <View style={styles.cardHeader}>
                  <View style={styles.quoteInfo}>
                    <Text style={styles.quoteNumber}>{item.quotationNumber}</Text>
                    <Text style={styles.quoteCustomer}>
                      👤 {item.customer?.name || item.customerName || 'Walk-in Client'}
                    </Text>
                    <Text style={styles.quoteDate}>
                      📅 {new Date(item.createdAt).toLocaleDateString('en-IN')} • {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.priceColumn}>
                    <Text style={styles.quoteTotal}>₹{Number(item.grandTotal).toLocaleString('en-IN')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Action Row */}
                <View style={styles.cardActionRow}>
                  {!isConverted && (
                    <TouchableOpacity
                      style={styles.convertBtn}
                      onPress={() => handleConvertToInvoice(item)}
                      disabled={isConverting}
                    >
                      {isConverting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.convertBtnText}>⚡ Convert to Invoice</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.viewDetailBtn} onPress={() => setSelectedQuote(item)}>
                    <Text style={styles.viewDetailBtnText}>View Details →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📑</Text>
              <Text style={styles.emptyTitle}>No Quotations Created</Text>
              <Text style={styles.emptyDesc}>Generate draft estimates and convert them into tax invoices.</Text>
            </View>
          }
        />
      )}

      {/* Create Quotation Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Commercial Quotation</Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {/* Customer Selector */}
              <Text style={styles.inputLabel}>Client / Customer Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Client Name or Company"
                placeholderTextColor="#94A3B8"
                value={selectedCustomer ? selectedCustomer.name : walkinName}
                onChangeText={(val) => {
                  setSelectedCustomer(null);
                  setWalkinName(val);
                }}
              />

              <Text style={styles.inputLabel}>Client Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="9840012345"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={selectedCustomer ? selectedCustomer.phone : walkinPhone}
                onChangeText={(val) => setWalkinPhone(val)}
              />

              {/* Line Items Section */}
              <View style={styles.lineItemsHeader}>
                <Text style={styles.lineItemsTitle}>Line Items ({items.length})</Text>
                <TouchableOpacity onPress={addItemRow}>
                  <Text style={styles.addItemBtnText}>+ Add Item</Text>
                </TouchableOpacity>
              </View>

              {items.map((it, idx) => (
                <View key={idx} style={styles.itemRowCard}>
                  <View style={styles.itemRowTop}>
                    <TextInput
                      style={[styles.formInput, { flex: 1, marginRight: 8 }]}
                      placeholder="Item Description / SKU"
                      placeholderTextColor="#94A3B8"
                      value={it.name}
                      onChangeText={(val) => updateItemRow(idx, 'name', val)}
                    />
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItemRow(idx)} style={styles.delBtn}>
                        <Text style={styles.delBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.itemRowBottom}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.miniLabel}>Qty</Text>
                      <TextInput
                        style={styles.formInputMini}
                        keyboardType="numeric"
                        value={String(it.quantity)}
                        onChangeText={(val) => updateItemRow(idx, 'quantity', val)}
                      />
                    </View>
                    <View style={{ flex: 1.5, marginRight: 6 }}>
                      <Text style={styles.miniLabel}>Price (₹)</Text>
                      <TextInput
                        style={styles.formInputMini}
                        keyboardType="numeric"
                        placeholder="0.00"
                        value={String(it.unitPrice || '')}
                        onChangeText={(val) => updateItemRow(idx, 'unitPrice', val)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miniLabel}>GST %</Text>
                      <TextInput
                        style={styles.formInputMini}
                        keyboardType="numeric"
                        value={String(it.taxRate)}
                        onChangeText={(val) => updateItemRow(idx, 'taxRate', val)}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {/* Computed Totals */}
              <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLbl}>Subtotal:</Text>
                  <Text style={styles.totalVal}>₹{calculateSubtotal().toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLbl}>Estimated Tax (GST):</Text>
                  <Text style={styles.totalVal}>₹{calculateTax().toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLbl}>Grand Total:</Text>
                  <Text style={styles.grandTotalVal}>₹{calculateTotal().toLocaleString('en-IN')}</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Commercial Notes / Validity Terms</Text>
              <TextInput
                style={[styles.formInput, { height: 60 }]}
                placeholder="e.g. Valid for 15 days. Payment terms: 50% advance."
                placeholderTextColor="#94A3B8"
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleCreateQuotation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save & Issue Quotation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quote Detail Modal */}
      <Modal visible={!!selectedQuote} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedQuote?.quotationNumber}</Text>
                <Text style={styles.quoteCustomer}>{selectedQuote?.customer?.name || selectedQuote?.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedQuote(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>LINE ITEMS BREAKDOWN</Text>
                {(selectedQuote?.items || []).map((it: any, i: number) => (
                  <View key={i} style={styles.detailItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailItemName}>{it.name || it.product?.name || 'Item'}</Text>
                      <Text style={styles.detailItemMeta}>{it.quantity} x ₹{it.unitPrice} (+{it.taxRate}% GST)</Text>
                    </View>
                    <Text style={styles.detailItemTotal}>
                      ₹{((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalsBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLbl}>Grand Total:</Text>
                    <Text style={styles.grandTotalVal}>₹{Number(selectedQuote?.grandTotal || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>

              {/* Status Actions */}
              {selectedQuote?.status !== 'CONVERTED' && (
                <View style={styles.statusActionsBox}>
                  <Text style={styles.detailSectionTitle}>UPDATE STATUS</Text>
                  <View style={styles.statusBtnRow}>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => handleUpdateStatus(selectedQuote.id, 'ACCEPTED')}
                    >
                      <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 11 }}>✓ Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#FFFBEB' }]}
                      onPress={() => handleUpdateStatus(selectedQuote.id, 'SENT')}
                    >
                      <Text style={{ color: '#D97706', fontWeight: '700', fontSize: 11 }}>📤 Mark Sent</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => handleUpdateStatus(selectedQuote.id, 'REJECTED')}
                    >
                      <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 11 }}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.convertBtn, { marginTop: 12 }]}
                    onPress={() => handleConvertToInvoice(selectedQuote)}
                  >
                    <Text style={styles.convertBtnText}>⚡ Convert Directly to Tax Invoice</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  addButton: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  loadingBox: { padding: 32, alignItems: 'center' },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  listContent: { padding: 16, paddingBottom: 40 },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quoteInfo: { flex: 1 },
  quoteNumber: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  quoteCustomer: { fontSize: 12, color: '#334155', fontWeight: '600', marginTop: 2 },
  quoteDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  priceColumn: { alignItems: 'flex-end' },
  quoteTotal: { fontSize: 15, fontWeight: '800', color: '#2563EB' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  convertBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  convertBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  viewDetailBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  viewDetailBtnText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  emptyBox: { padding: 48, alignItems: 'center' },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptyDesc: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  modalClose: { fontSize: 16, fontWeight: '700', color: '#64748B', padding: 4 },
  formScroll: { marginTop: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 8 },
  formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  lineItemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  lineItemsTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' },
  addItemBtnText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  itemRowCard: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  itemRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemRowBottom: { flexDirection: 'row', alignItems: 'center' },
  formInputMini: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, color: '#0F172A' },
  miniLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  delBtn: { backgroundColor: '#FEE2E2', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  delBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '800' },
  totalsBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLbl: { fontSize: 11, color: '#475569' },
  totalVal: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#CBD5E1', paddingTop: 6, marginTop: 4 },
  grandTotalLbl: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  grandTotalVal: { fontSize: 15, fontWeight: '900', color: '#2563EB' },
  submitButton: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  detailCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  detailSectionTitle: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  detailItemName: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  detailItemMeta: { fontSize: 10, color: '#64748B' },
  detailItemTotal: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  statusActionsBox: { marginTop: 14 },
  statusBtnRow: { flexDirection: 'row', gap: 8 },
  statusActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }
});
