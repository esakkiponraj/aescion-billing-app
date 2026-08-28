import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Share,
  Alert
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';
import { useMobileAuth } from '../../src/auth/authContext';

export default function ReceiptsScreen() {
  const { organization, activeBranch } = useMobileAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showSoftCopyModal, setShowSoftCopyModal] = useState(false);

  const fetchReceipts = useCallback(async () => {
    try {
      // Authoritative endpoint in PaymentsController is /payments/receipts
      const data = await MobileApiClient.get<any[]>('/payments/receipts');
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch receipts:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
    const unsub = subscribeToRealtimeEvent('payment_created', () => fetchReceipts());
    const unsubInv = subscribeToRealtimeEvent('invoice_created', () => fetchReceipts());
    return () => {
      unsub();
      unsubInv();
    };
  }, [fetchReceipts]);

  const handleOpenReceiptDetail = async (receiptId: string) => {
    setIsDetailLoading(true);
    try {
      const receipt = await MobileApiClient.get<any>(`/payments/receipts/${receiptId}/reprint`);
      setSelectedReceipt(receipt);
      setShowSoftCopyModal(true);
    } catch (err: any) {
      Alert.alert('Receipt Error', err.message || 'Failed to fetch detailed receipt soft copy.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!selectedReceipt) return;

    const companyName = organization?.name || 'AESCION Enterprise';
    const amount = Number(selectedReceipt.amountPaid || selectedReceipt.amount || 0).toLocaleString('en-IN');
    const invoiceNum = selectedReceipt.invoice?.invoiceNumber || 'N/A';
    const customer = selectedReceipt.customerName || 'Customer';
    const date = new Date(selectedReceipt.createdAt || selectedReceipt.issuedAt).toLocaleString();

    const receiptMessage = `
========================================
      ${companyName.toUpperCase()}
   OFFICIAL DIGITAL PAYMENT RECEIPT
========================================
Receipt No: ${selectedReceipt.receiptNumber}
Date/Time: ${date}
Cashier: ${selectedReceipt.cashierName || 'Cashier'}

CUSTOMER DETAILS:
Customer: ${customer}
Invoice Ref: ${invoiceNum}

PAYMENT DETAILS:
Tender Mode: ${selectedReceipt.paymentMethod}
Amount Received: ₹${amount}
Remaining Balance: ₹${(Number(selectedReceipt.remainingBalance) || 0).toLocaleString('en-IN')}

Thank you for your business!
Powered by AESCION Commerce
========================================
    `.trim();

    try {
      await Share.share({
        title: `Payment Receipt ${selectedReceipt.receiptNumber}`,
        message: receiptMessage
      });
    } catch (error: any) {
      console.warn('Error sharing receipt:', error.message);
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedReceipt) return;
    Alert.alert(
      'Print Soft Copy',
      `Sending Receipt #${selectedReceipt.receiptNumber} to thermal/network printer. (Read-Only Preview)`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.headerBar}>
        <div>
          <Text style={styles.headerTitle}>Payments & Receipts</Text>
          <Text style={styles.headerSubtitle}>
            Authoritative vouchers for settled customer transactions ({receipts.length} Total)
          </Text>
        </div>
        <TouchableOpacity
          onPress={() => { setIsRefreshing(true); fetchReceipts(); }}
          style={styles.refreshBtn}
        >
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading payment vouchers...</Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchReceipts(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💳</Text>
              <Text style={styles.emptyTitle}>No Receipts Recorded</Text>
              <Text style={styles.emptyDesc}>Settled payments from POS, invoices, and wholesale orders will appear here automatically.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.receiptCard}
              onPress={() => handleOpenReceiptDetail(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.receiptHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptNumber}>{item.receiptNumber}</Text>
                  <Text style={styles.customerName}>{item.customerName || 'Walk-in Customer'}</Text>
                </View>
                <View style={[
                  styles.methodBadge,
                  item.paymentMethod === 'UPI' ? styles.methodUpi :
                  item.paymentMethod === 'CASH' ? styles.methodCash : styles.methodCard
                ]}>
                  <Text style={styles.methodBadgeText}>{item.paymentMethod}</Text>
                </View>
              </View>

              <View style={styles.receiptDetails}>
                <Text style={styles.dateMeta}>📅 {new Date(item.issuedAt || item.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.paidAmount}>₹{(Number(item.amountPaid || item.amount || 0)).toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.footerText}>
                  Invoice: {item.invoice?.invoiceNumber || item.invoiceId?.slice(0, 8) || 'Direct POS'}
                </Text>
                <Text style={styles.viewLink}>View Soft Copy →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ========================================================= */}
      {/* OFFICIAL SOFT COPY RECEIPT PREVIEW MODAL */}
      {/* ========================================================= */}
      <Modal visible={showSoftCopyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>🧾</Text>
                <Text style={styles.modalTitle}>Receipt Soft Copy</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSoftCopyModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {isDetailLoading || !selectedReceipt ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Rendering soft copy...</Text>
              </View>
            ) : (
              <ScrollView style={styles.voucherContainer} showsVerticalScrollIndicator={false}>
                {/* Printable Soft Copy Paper */}
                <View style={styles.voucherPaper}>
                  {/* Business Header */}
                  <Text style={styles.voucherOrg}>{organization?.name || 'AESCION COMMERCE'}</Text>
                  {organization?.legalName && (
                    <Text style={styles.voucherLegal}>{organization.legalName}</Text>
                  )}
                  <Text style={styles.voucherSub}>OFFICIAL DIGITAL PAYMENT RECEIPT</Text>
                  <Text style={styles.voucherBranch}>Branch: {activeBranch?.name || selectedReceipt.invoice?.branch?.name || 'Main Outlet'}</Text>
                  {organization?.gstin && (
                    <Text style={styles.voucherGst}>GSTIN: {organization.gstin}</Text>
                  )}

                  <View style={styles.voucherDivider} />

                  {/* Voucher Meta */}
                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherLabel}>Receipt No:</Text>
                    <Text style={styles.voucherValBold}>{selectedReceipt.receiptNumber}</Text>
                  </View>
                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherLabel}>Date & Time:</Text>
                    <Text style={styles.voucherVal}>{new Date(selectedReceipt.createdAt || selectedReceipt.issuedAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherLabel}>Cashier / Staff:</Text>
                    <Text style={styles.voucherVal}>{selectedReceipt.cashierName || 'Staff'}</Text>
                  </View>

                  <View style={styles.voucherDivider} />

                  {/* Customer & Invoice Linkage */}
                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherLabel}>Customer Name:</Text>
                    <Text style={styles.voucherValBold}>{selectedReceipt.customerName || 'Walk-in Customer'}</Text>
                  </View>
                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherLabel}>Invoice Reference:</Text>
                    <Text style={styles.voucherValBlue}>{selectedReceipt.invoice?.invoiceNumber || selectedReceipt.invoiceId || 'N/A'}</Text>
                  </View>
                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherLabel}>Payment Mode:</Text>
                    <Text style={styles.voucherValBold}>{selectedReceipt.paymentMethod}</Text>
                  </View>

                  <View style={styles.voucherDivider} />

                  {/* Financial Summary */}
                  <View style={styles.highlightRow}>
                    <Text style={styles.voucherTotalLabel}>Amount Received</Text>
                    <Text style={styles.voucherTotalVal}>₹{Number(selectedReceipt.amountPaid || selectedReceipt.amount || 0).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.voucherRow}>
                    <Text style={styles.voucherBalLabel}>Remaining Balance:</Text>
                    <Text style={styles.voucherBalVal}>
                      ₹{Number(selectedReceipt.remainingBalance || selectedReceipt.invoice?.balanceAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.voucherDivider} />

                  {/* Footer Notes */}
                  <Text style={styles.voucherThank}>Thank you for your business!</Text>
                  <Text style={styles.voucherFooterText}>
                    This is an authoritative computer-generated soft copy payment receipt.
                  </Text>
                </View>

                {/* Soft Copy Actions: Print, Share, Save */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={handlePrintReceipt}
                    style={[styles.actionBtn, styles.actionBtnPrint]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnIcon}>🖨️</Text>
                    <Text style={styles.actionBtnPrintText}>Print Slip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShareReceipt}
                    style={[styles.actionBtn, styles.actionBtnShare]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnIcon}>📤</Text>
                    <Text style={styles.actionBtnShareText}>Share Soft Copy</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8
  },
  refreshBtnText: {
    fontSize: 16
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  listContent: {
    padding: 14,
    gap: 10
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  emptyDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  receiptNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  customerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  methodCash: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  methodUpi: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  methodCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA'
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A'
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  dateMeta: {
    fontSize: 11,
    color: '#64748B'
  },
  paidAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669'
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  footerText: {
    fontSize: 10,
    color: '#94A3B8'
  },
  viewLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalCloseBtn: {
    padding: 4
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B'
  },
  voucherContainer: {
    padding: 16
  },
  voucherPaper: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center'
  },
  voucherOrg: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center'
  },
  voucherLegal: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1
  },
  voucherSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginTop: 4
  },
  voucherBranch: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  voucherGst: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    marginTop: 1
  },
  voucherDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 2.5
  },
  voucherLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  voucherVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600'
  },
  voucherValBold: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '800'
  },
  voucherValBlue: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '800'
  },
  highlightRow: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginVertical: 4
  },
  voucherTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase'
  },
  voucherTotalVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    marginTop: 2
  },
  voucherBalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706'
  },
  voucherBalVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706'
  },
  voucherThank: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2
  },
  voucherFooterText: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 20
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2
  },
  actionBtnIcon: {
    fontSize: 14,
    marginRight: 6
  },
  actionBtnPrint: {
    backgroundColor: '#2563EB'
  },
  actionBtnPrintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  actionBtnShare: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  actionBtnShareText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700'
  }
});
