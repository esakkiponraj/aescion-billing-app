import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function WholesaleScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Form states
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unitRate, setUnitRate] = useState('500');
  const [taxRate, setTaxRate] = useState('5');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Dispatch Form
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transporterName, setTransporterName] = useState('Direct Cargo Delivery');

  const fetchOrders = useCallback(async () => {
    try {
      const statusParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const data = await MobileApiClient.get<any[]>(`/wholesale/sales-orders${statusParam}`);
      setOrders(data || []);
    } catch (err) {
      console.warn('Failed to load wholesale orders:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();

    const unsubOrder = subscribeToRealtimeEvent('wholesale_order_updated', () => fetchOrders());
    const unsubInvoice = subscribeToRealtimeEvent('invoice_created', () => fetchOrders());

    return () => {
      unsubOrder();
      unsubInvoice();
    };
  }, [fetchOrders]);

  const handleCreateSalesOrder = async () => {
    if (!buyerName.trim() || !productName.trim()) {
      Alert.alert('Validation Error', 'Please specify buyer name and product description');
      return;
    }

    try {
      await MobileApiClient.post('/wholesale/sales-orders', {
        customerName: buyerName.trim(),
        customerPhone: buyerPhone.trim() || '9876543210',
        paymentTerms,
        items: [
          {
            name: productName.trim(),
            quantityOrdered: parseFloat(quantity) || 1,
            unitPrice: parseFloat(unitRate) || 0,
            taxRate: parseFloat(taxRate) || 0
          }
        ]
      });

      Alert.alert('Success', 'Wholesale Sales Order created successfully');
      setIsCreateModalOpen(false);
      setBuyerName('');
      setBuyerPhone('');
      setProductName('');
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create sales order');
    }
  };

  const openDispatch = (order: any) => {
    setSelectedOrder(order);
    setVehicleNo('');
    setDriverName('Primary Driver');
    setTransporterName('Direct Cargo Logistics');
    setIsDispatchModalOpen(true);
  };

  const handleExecuteDispatch = async () => {
    if (!selectedOrder) return;
    if (!vehicleNo.trim()) {
      Alert.alert('Validation Error', 'Please enter vehicle registration number (e.g. TN-09-AB-1234)');
      return;
    }

    try {
      const res = await MobileApiClient.post<any>(`/wholesale/sales-orders/${selectedOrder.id}/dispatch`, {
        vehicleNo: vehicleNo.trim().toUpperCase(),
        driverName: driverName.trim(),
        transporterName: transporterName.trim()
      });

      Alert.alert('Dispatched', `Delivery Challan ${res.challanNumber} issued successfully! Stock deducted.`);
      setIsDispatchModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to dispatch order');
    }
  };

  const handleConvertToInvoice = async (orderId: string) => {
    Alert.alert(
      'Confirm Invoice Generation',
      'Convert this wholesale order into an authoritative GST tax invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Invoice',
          onPress: async () => {
            try {
              const res = await MobileApiClient.post<any>(`/wholesale/sales-orders/${orderId}/convert-to-invoice`, {});
              Alert.alert('Invoice Billed', `Tax Invoice ${res.invoice.invoiceNumber} created and ledger updated.`);
              fetchOrders();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to generate invoice');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Wholesale & Distribution</Text>
          <Text style={styles.headerSubtitle}>B2B Sales Orders, Dispatch & Challans</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsCreateModalOpen(true)}>
          <Text style={styles.addBtnText}>+ New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'ORDER_PLACED', label: 'Placed' },
            { id: 'PARTIALLY_DISPATCHED', label: 'Partial' },
            { id: 'DISPATCHED', label: 'Dispatched' },
            { id: 'INVOICED', label: 'Invoiced' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterChip, statusFilter === tab.id && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.filterChipText, statusFilter === tab.id && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading wholesale orders...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchOrders(); }} />}
        >
          {orders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Sales Orders Found</Text>
              <Text style={styles.emptyDesc}>Tap "+ New Order" above to create your first wholesale order.</Text>
            </View>
          ) : (
            orders.map((so) => {
              const items = so.items || [];
              return (
                <View key={so.id} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View>
                      <Text style={styles.orderNum}>{so.orderNumber}</Text>
                      <Text style={styles.orderDate}>{new Date(so.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        so.status === 'INVOICED'
                          ? styles.statusPurple
                          : so.status === 'DISPATCHED'
                          ? styles.statusGreen
                          : so.status === 'PARTIALLY_DISPATCHED'
                          ? styles.statusAmber
                          : styles.statusBlue
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          so.status === 'INVOICED'
                            ? styles.textPurple
                            : so.status === 'DISPATCHED'
                            ? styles.textGreen
                            : so.status === 'PARTIALLY_DISPATCHED'
                            ? styles.textAmber
                            : styles.textBlue
                        ]}
                      >
                        {so.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.buyerRow}>
                    <Text style={styles.buyerName}>🏢 {so.customerName}</Text>
                    <Text style={styles.orderAmount}>₹{Number(so.totalAmount || 0).toLocaleString('en-IN')}</Text>
                  </View>

                  {items.length > 0 && (
                    <View style={styles.itemSummaryBox}>
                      {items.map((it: any, idx: number) => (
                        <View key={idx} style={styles.itemSummaryRow}>
                          <Text style={styles.itemName}>{it.name}</Text>
                          <Text style={styles.itemQty}>
                            {it.quantityOrdered} ord • {it.dispatchedQuantity || 0} disp
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    {so.status !== 'DISPATCHED' && so.status !== 'INVOICED' && (
                      <TouchableOpacity style={styles.dispatchBtn} onPress={() => openDispatch(so)}>
                        <Text style={styles.dispatchBtnText}>🚚 Issue DC</Text>
                      </TouchableOpacity>
                    )}

                    {so.status !== 'INVOICED' && (
                      <TouchableOpacity style={styles.invoiceBtn} onPress={() => handleConvertToInvoice(so.id)}>
                        <Text style={styles.invoiceBtnText}>🧾 Bill Invoice</Text>
                      </TouchableOpacity>
                    )}

                    {so.status === 'INVOICED' && (
                      <View style={styles.invoicedTag}>
                        <Text style={styles.invoicedTagText}>✓ Invoiced in Accounts</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* CREATE ORDER MODAL */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Wholesale Sales Order</Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Buyer / Agency Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Royal Wholesale Mart"
                value={buyerName}
                onChangeText={setBuyerName}
              />

              <Text style={styles.inputLabel}>Contact Phone</Text>
              <TextInput
                style={styles.textInput}
                placeholder="9876543210"
                keyboardType="phone-pad"
                value={buyerPhone}
                onChangeText={setBuyerPhone}
              />

              <Text style={styles.inputLabel}>Product Description *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Basmati Rice 25kg Bag"
                value={productName}
                onChangeText={setProductName}
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Quantity (Units)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Unit Rate (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={unitRate}
                    onChangeText={setUnitRate}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>GST %</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={taxRate}
                    onChangeText={setTaxRate}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Credit Terms</Text>
                  <TextInput
                    style={styles.textInput}
                    value={paymentTerms}
                    onChangeText={setPaymentTerms}
                  />
                </View>
              </View>

              <View style={styles.totalPreviewBox}>
                <Text style={styles.totalPreviewLabel}>Estimated Total Amount:</Text>
                <Text style={styles.totalPreviewVal}>
                  ₹{(
                    (parseFloat(quantity) || 0) *
                    (parseFloat(unitRate) || 0) *
                    (1 + (parseFloat(taxRate) || 0) / 100)
                  ).toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSalesOrder}>
                <Text style={styles.submitBtnText}>Confirm & Save Sales Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DISPATCH MODAL */}
      <Modal visible={isDispatchModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Issue Delivery Challan (DC)</Text>
                <Text style={styles.modalSubtitle}>{selectedOrder?.orderNumber} • {selectedOrder?.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDispatchModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Vehicle Registration No. *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. TN-09-AB-1234"
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                value={vehicleNo}
                onChangeText={setVehicleNo}
              />

              <Text style={styles.inputLabel}>Driver Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Suresh Kumar"
                value={driverName}
                onChangeText={setDriverName}
              />

              <Text style={styles.inputLabel}>Logistics Carrier</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Direct Road Express"
                value={transporterName}
                onChangeText={setTransporterName}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleExecuteDispatch}>
                <Text style={styles.submitBtnText}>Confirm Dispatch & Deduct Stock</Text>
              </TouchableOpacity>
            </ScrollView>
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTextGroup: {
    flex: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8
  },
  filterRow: {
    paddingHorizontal: 12
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 6
  },
  filterChipActive: {
    backgroundColor: '#2563EB'
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  filterChipTextActive: {
    color: '#FFFFFF'
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8
  },
  listContainer: {
    flex: 1
  },
  listContent: {
    padding: 12,
    paddingBottom: 30
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1D4ED8',
    fontFamily: 'monospace'
  },
  orderDate: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  statusBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  statusGreen: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusAmber: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statusPurple: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  textBlue: { color: '#1D4ED8' },
  textGreen: { color: '#047857' },
  textAmber: { color: '#B45309' },
  textPurple: { color: '#6D28D9' },
  divider: {
    height: 1,
    backgroundColor: '#EDF1F5',
    marginVertical: 10
  },
  buyerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  buyerName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  itemSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10
  },
  itemSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  itemName: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
    flex: 1
  },
  itemQty: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  dispatchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  dispatchBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB'
  },
  invoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2563EB'
  },
  invoiceBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  invoicedTag: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  invoicedTagText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%'
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  modalClose: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8'
  },
  modalBody: {
    padding: 16
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A'
  },
  formRow: {
    flexDirection: 'row',
    gap: 8
  },
  formCol: {
    flex: 1
  },
  totalPreviewBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalPreviewLabel: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600'
  },
  totalPreviewVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1D4ED8'
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  }
});
