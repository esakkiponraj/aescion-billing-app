import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { BusinessType, TaxMode, SyncState } from '@aescion/shared-types';
import { calculateLineTax, computeInvoiceTotals, formatCurrencyINR } from '@aescion/shared-utils';
import { queueOfflineMutation } from '../services/sqlite-offline';

interface POSItem {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  taxRate: number;
}

interface CartEntry {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
}

export const MobilePOSScreen: React.FC = () => {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  const sampleProducts: POSItem[] = [
    { id: '1', name: 'Aashirvaad Atta 5kg', sku: 'AAS-05', sellingPrice: 245.0, taxRate: 5 },
    { id: '2', name: 'Tata Salt 1kg', sku: 'TAT-01', sellingPrice: 28.0, taxRate: 0 },
    { id: '3', name: 'Fortune Sunflower Oil 1L', sku: 'FOR-01', sellingPrice: 165.0, taxRate: 5 },
    { id: '4', name: 'Amul Butter 500g', sku: 'AMU-50', sellingPrice: 275.0, taxRate: 12 },
    { id: '5', name: 'Parle-G Gold 1kg', sku: 'PAR-01', sellingPrice: 120.0, taxRate: 18 }
  ];

  const addToCart = (product: POSItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.sellingPrice,
          quantity: 1,
          taxRate: product.taxRate
        }
      ];
    });
  };

  const clearCart = () => setCart([]);

  const lineResults = cart.map((c) =>
    calculateLineTax({
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      taxRate: c.taxRate,
      taxMode: TaxMode.EXCLUSIVE
    })
  );

  const totals = computeInvoiceTotals(lineResults);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const mutationId = `OFFLINE-MOB-${Date.now()}`;
    const invoicePayload = {
      items: cart.map((c) => ({
        productId: c.productId,
        name: c.name,
        quantity: c.quantity,
        unit: 'PCS',
        unitPrice: c.unitPrice,
        taxRate: c.taxRate,
        taxMode: TaxMode.EXCLUSIVE
      })),
      payment: {
        method: 'CASH',
        amount: totals.grandTotal
      }
    };

    if (!isOnline) {
      await queueOfflineMutation({
        id: mutationId,
        organizationId: 'org-1',
        branchId: 'main-branch',
        entityType: 'INVOICE',
        operation: 'CREATE',
        payload: invoicePayload,
        syncState: SyncState.PENDING,
        clientTimestamp: Date.now()
      });
      Alert.alert('Offline Mode', 'Sale saved to offline SQLite queue. It will automatically synchronize when connected.');
    } else {
      Alert.alert('Sale Completed', `Invoice generated! Amount: ${formatCurrencyINR(totals.grandTotal)}`);
    }
    clearCart();
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AESCION Mobile POS</Text>
          <Text style={styles.headerSubtitle}>Branch: Main Supermarket Store</Text>
        </View>
        <TouchableOpacity
          style={[styles.networkBadge, isOnline ? styles.networkOnline : styles.networkOffline]}
          onPress={() => setIsOnline(!isOnline)}
        >
          <Text style={styles.networkBadgeText}>{isOnline ? '● Online' : '○ Offline SQLite'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainLayout}>
        {/* Product Catalog */}
        <View style={styles.catalogPane}>
          <TextInput
            style={styles.searchInput}
            placeholder="Scan barcode or search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={sampleProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
                <View>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productSku}>{item.sku} • {item.taxRate}% GST</Text>
                </View>
                <Text style={styles.productPrice}>{formatCurrencyINR(item.sellingPrice)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Cart & Totals */}
        <View style={styles.cartPane}>
          <Text style={styles.cartTitle}>Cart Items ({cart.length})</Text>
          <ScrollView style={styles.cartList}>
            {cart.map((item) => (
              <View key={item.productId} style={styles.cartItem}>
                <View style={styles.cartItemDetails}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemMeta}>
                    {item.quantity} x {formatCurrencyINR(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.cartItemTotal}>{formatCurrencyINR(item.quantity * item.unitPrice)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrencyINR(totals.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST Tax</Text>
              <Text style={styles.totalValue}>{formatCurrencyINR(totals.taxTotal)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrencyINR(totals.grandTotal)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]}
            onPress={handleCheckout}
            disabled={cart.length === 0}
          >
            <Text style={styles.checkoutBtnText}>Charge {formatCurrencyINR(totals.grandTotal)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B' },
  networkBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  networkOnline: { backgroundColor: '#ECFDF5' },
  networkOffline: { backgroundColor: '#FEF3C7' },
  networkBadgeText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  mainLayout: { flex: 1, flexDirection: 'row' },
  catalogPane: { flex: 3, padding: 12, borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 13
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  productSku: { fontSize: 11, color: '#64748B', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '800', color: '#2563EB' },
  cartPane: { flex: 2, padding: 12, backgroundColor: '#FFFFFF', justifyContent: 'space-between' },
  cartTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  cartList: { flex: 1 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cartItemDetails: { flex: 1 },
  cartItemName: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  cartItemMeta: { fontSize: 10, color: '#64748B' },
  cartItemTotal: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  totalsContainer: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 11, color: '#64748B' },
  totalValue: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, marginTop: 4 },
  grandTotalLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  grandTotalValue: { fontSize: 15, fontWeight: '900', color: '#2563EB' },
  checkoutBtn: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  checkoutBtnDisabled: { opacity: 0.5 },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }
});
