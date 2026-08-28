import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { useMobileAuth } from '../../src/auth/authContext';
import { getLocalDatabase } from '../../src/database/sqlite';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { enqueueOfflineMutation, syncInitialCatalog } from '../../src/sync/syncEngine';
import { defaultPrinter } from '../../src/hardware/printerAdapter';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export default function MobilePOSScreen() {
  const { organization, activeBranch, user } = useMobileAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);

  // Search local SQLite products
  const loadProducts = async (query = '') => {
    try {
      const db = await getLocalDatabase();
      let rows: any[] = [];
      if (query.trim()) {
        rows = await db.getAllAsync<any>(
          `SELECT * FROM local_products WHERE name LIKE ? OR sku LIKE ? OR barcode = ? LIMIT 20`,
          [`%${query}%`, `%${query}%`, query]
        );
      } else {
        rows = await db.getAllAsync<any>(`SELECT * FROM local_products LIMIT 20`);
      }

      if ((!rows || rows.length === 0) && !query.trim() && organization?.id && activeBranch?.id) {
        const onlineProducts = await MobileApiClient.get<any[]>('/products').catch(() => []);
        if (onlineProducts && onlineProducts.length > 0) {
          await syncInitialCatalog(organization.id, activeBranch.id);
          rows = onlineProducts;
        }
      }

      setProducts(rows || []);
    } catch (err) {
      console.warn('Local product query failed:', err);
    }
  };

  useEffect(() => {
    loadProducts(searchQuery);
  }, [searchQuery]);

  const addToCart = (product: any) => {
    const existingIndex = cart.findIndex((i) => i.id === product.id);
    const unitPrice = Number(product.sellingPrice) || 0;
    const taxRate = Number(product.taxRate) || 0;

    if (existingIndex >= 0) {
      const updated = [...cart];
      const item = updated[existingIndex];
      const newQty = item.quantity + 1;
      const baseAmount = newQty * unitPrice;
      const taxAmount = (baseAmount * taxRate) / 100;
      item.quantity = newQty;
      item.taxAmount = taxAmount;
      item.lineTotal = baseAmount + taxAmount;
      setCart(updated);
    } else {
      const baseAmount = 1 * unitPrice;
      const taxAmount = (baseAmount * taxRate) / 100;
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          quantity: 1,
          unitPrice,
          taxRate,
          taxAmount,
          lineTotal: baseAmount + taxAmount
        }
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          const baseAmount = newQty * item.unitPrice;
          const taxAmount = (baseAmount * item.taxRate) / 100;
          return {
            ...item,
            quantity: newQty,
            taxAmount,
            lineTotal: baseAmount + taxAmount
          };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    setCart(updated);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxTotal = cart.reduce((sum, item) => sum + item.taxAmount, 0);
  const rawTotal = subtotal + taxTotal;
  const roundOff = Math.round(rawTotal) - rawTotal;
  const grandTotal = Math.round(rawTotal);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const invoicePayload = {
      branchId: activeBranch?.id,
      customerName: 'Walk-in Customer',
      lines: cart.map((item) => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxMode: 'EXCLUSIVE',
        unit: 'PCS'
      })),
      payment: {
        method: paymentMode,
        amount: grandTotal
      }
    };

    let billNumber = `TMP-MOB-${Date.now().toString().slice(-6)}`;

    try {
      // Try online API first
      const onlineRes = await MobileApiClient.post<any>('/invoices', invoicePayload);
      billNumber = onlineRes.invoiceNumber || billNumber;
      Alert.alert('✅ Bill Created (Online)', `Invoice: ${billNumber}\nAmount: ₹${grandTotal}`);
    } catch (onlineErr) {
      // Fall back to offline SQLite queue
      console.warn('Online billing failed, queuing in SQLite:', onlineErr);
      const clientTxId = await enqueueOfflineMutation({
        entityType: 'INVOICE',
        operationType: 'CREATE',
        payload: invoicePayload,
        organizationId: organization?.id || '',
        branchId: activeBranch?.id || '',
        userId: user?.id || ''
      });
      billNumber = clientTxId;
      Alert.alert('💾 Bill Saved Offline', `Queued for sync: ${clientTxId}\nAmount: ₹${grandTotal}`);
    }

    // Print Receipt via PrinterAdapter
    defaultPrinter.printReceipt({
      companyName: organization?.name || 'AESCION Commerce',
      legalName: organization?.legalName || undefined,
      branchName: activeBranch?.name || 'Main Branch',
      invoiceNumber: billNumber,
      date: new Date().toLocaleTimeString(),
      items: cart.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
        total: i.lineTotal
      })),
      subtotal,
      taxTotal,
      grandTotal,
      paymentMethod: paymentMode,
      cashierName: `${user?.firstName} ${user?.lastName}`
    });

    setLastBill({ billNumber, grandTotal, items: cart });
    setCart([]);
    setIsCheckoutOpen(false);
    setIsProcessing(false);
  };

  return (
    <View style={styles.container}>
      {/* Search & Barcode Scan Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Scan barcode or search items..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Split: Products List & Cart Preview */}
      <View style={styles.body}>
        {/* Product Catalog Grid */}
        <View style={styles.catalogSection}>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>₹{item.sellingPrice}</Text>
                <View style={styles.stockBadge}>
                  <Text style={styles.stockText}>Stock: {item.currentStock || 0}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matching products in local database.</Text>
              </View>
            }
          />
        </View>

        {/* Floating Cart Summary Bar */}
        {cart.length > 0 && (
          <View style={styles.cartBar}>
            <View>
              <Text style={styles.cartCountText}>
                {cart.reduce((s, i) => s + i.quantity, 0)} Items in Cart
              </Text>
              <Text style={styles.cartTotalText}>₹{grandTotal}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => setIsCheckoutOpen(true)}>
              <Text style={styles.checkoutBtnText}>Checkout & Pay ➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Checkout Modal with Split Tender */}
      <Modal visible={isCheckoutOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settle Payment</Text>
              <TouchableOpacity onPress={() => setIsCheckoutOpen(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItemsScroll}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemRate}>
                      ₹{item.unitPrice} x {item.quantity} (+{item.taxRate}% GST)
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>₹{item.lineTotal.toFixed(0)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.billSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST Taxes</Text>
                <Text style={styles.summaryValue}>₹{taxTotal.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{grandTotal}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.paymentMethodLabel}>Select Payment Method</Text>
            <View style={styles.paymentOptions}>
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.paymentChip, paymentMode === mode && styles.paymentChipActive]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text
                    style={[styles.paymentChipText, paymentMode === mode && styles.paymentChipTextActive]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.completeSaleBtn, isProcessing && styles.completeSaleBtnDisabled]}
              onPress={handleCompleteSale}
              disabled={isProcessing}
            >
              <Text style={styles.completeSaleBtnText}>
                {isProcessing ? 'Processing Transaction...' : `Charge ₹${grandTotal} (${paymentMode})`}
              </Text>
            </TouchableOpacity>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600'
  },
  clearSearchBtn: {
    padding: 8
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: 'bold'
  },
  body: {
    flex: 1
  },
  catalogSection: {
    flex: 1,
    padding: 8
  },
  productCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    minHeight: 110
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563EB'
  },
  stockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6
  },
  stockText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B'
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  },
  cartBar: {
    backgroundColor: '#0F172A',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  cartCountText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  cartTotalText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900'
  },
  checkoutBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A'
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold'
  },
  cartItemsScroll: {
    maxHeight: 180,
    marginBottom: 12
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  cartItemInfo: {
    flex: 1
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B'
  },
  cartItemRate: {
    fontSize: 10,
    color: '#64748B'
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12
  },
  qtyBtn: {
    width: 26,
    height: 26,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  qtyText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 50,
    textAlign: 'right'
  },
  billSummary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    marginVertical: 12
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  summaryValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700'
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 4
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB'
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  paymentChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center'
  },
  paymentChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  paymentChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569'
  },
  paymentChipTextActive: {
    color: '#FFFFFF'
  },
  completeSaleBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  completeSaleBtnDisabled: {
    opacity: 0.6
  },
  completeSaleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  }
});
