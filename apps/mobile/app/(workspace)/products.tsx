import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { getLocalDatabase } from '../../src/database/sqlite';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { useMobileAuth } from '../../src/auth/authContext';
import { syncInitialCatalog } from '../../src/sync/syncEngine';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function MobileProductsScreen() {
  const { organization, activeBranch, activeRole, isSuperAdmin } = useMobileAuth();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [unit, setUnit] = useState('PCS');
  const [initialStock, setInitialStock] = useState('10');
  const [isWeightBased, setIsWeightBased] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [editTaxRate, setEditTaxRate] = useState('18');
  const [isUpdating, setIsUpdating] = useState(false);

  const isOwner = activeRole?.roleType === 'OWNER' || isSuperAdmin;

  const loadLocalCatalog = useCallback(async (query = '') => {
    try {
      const db = await getLocalDatabase();
      let rows: any[] = [];
      if (query.trim()) {
        rows = await db.getAllAsync<any>(
          `SELECT * FROM local_products WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?`,
          [`%${query}%`, `%${query}%`, `%${query}%`]
        );
      } else {
        rows = await db.getAllAsync<any>(`SELECT * FROM local_products ORDER BY name ASC`);
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
      console.warn('Failed to load local catalog:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organization, activeBranch]);

  useEffect(() => {
    loadLocalCatalog(search);
    const unsub = subscribeToRealtimeEvent('product_updated', () => loadLocalCatalog(search));
    return unsub;
  }, [search, loadLocalCatalog]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (organization && activeBranch) {
      await syncInitialCatalog(organization.id, activeBranch.id);
    }
    await loadLocalCatalog(search);
    setIsRefreshing(false);
  };

  const openAddModal = () => {
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setCategory('General');
    setSellingPrice('');
    setCostPrice('');
    setMrp('');
    setTaxRate('18');
    setUnit('PCS');
    setInitialStock('10');
    setIsWeightBased(false);
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setEditName(product.name || '');
    setEditCategory(product.category || 'General');
    setEditSellingPrice(String(product.sellingPrice || ''));
    setEditCostPrice(String(product.costPrice || ''));
    setEditMrp(String(product.mrp || product.sellingPrice || ''));
    setEditTaxRate(String(product.taxRate || '18'));
  };

  const handleCreateProduct = async () => {
    if (!name.trim() || !sellingPrice.trim()) {
      Alert.alert('Validation Error', 'Product Name and Selling Price are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileApiClient.post('/products', {
        name: name.trim(),
        sku: sku.trim() || undefined,
        category: category.trim() || 'General',
        sellingPrice: parseFloat(sellingPrice),
        costPrice: costPrice ? parseFloat(costPrice) : parseFloat(sellingPrice) * 0.7,
        mrp: mrp ? parseFloat(mrp) : parseFloat(sellingPrice),
        taxRate: parseFloat(taxRate) || 0,
        unit: unit.trim() || 'PCS',
        initialStock: initialStock ? parseFloat(initialStock) : 0,
        isWeightBased,
        branchId: activeBranch?.id
      });
      setIsAddModalOpen(false);
      handleRefresh();
      Alert.alert('Success', 'Product catalog item created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    if (!editName.trim() || !editSellingPrice.trim()) {
      Alert.alert('Validation Error', 'Product Name and Selling Price are required.');
      return;
    }
    setIsUpdating(true);
    try {
      await MobileApiClient.put(`/products/${editingProduct.id}`, {
        name: editName.trim(),
        category: editCategory.trim() || 'General',
        sellingPrice: parseFloat(editSellingPrice),
        costPrice: editCostPrice ? parseFloat(editCostPrice) : undefined,
        mrp: editMrp ? parseFloat(editMrp) : undefined,
        taxRate: parseFloat(editTaxRate) || 0
      });
      setEditingProduct(null);
      handleRefresh();
      Alert.alert('Success', 'Product updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update product.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Item Catalog ({products.length})</Text>
          <Text style={styles.headerSub}>Active Branch: {activeBranch?.name || 'Main'}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search items, SKU or category..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() => openEditModal(item)}
              activeOpacity={0.85}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category || 'General'} • SKU: {item.sku || 'N/A'}</Text>
                {item.batchNumber && (
                  <Text style={styles.itemBatch}>Batch: {item.batchNumber} {item.expiryDate ? `(Exp: ${item.expiryDate.split('T')[0]})` : ''}</Text>
                )}
              </View>
              <View style={styles.itemPriceSection}>
                <Text style={styles.itemPrice}>₹{Number(item.sellingPrice).toLocaleString('en-IN')}</Text>
                <Text style={styles.itemTax}>+{item.taxRate}% GST</Text>
                <View style={[styles.stockPill, (item.currentStock || 0) <= 5 ? styles.stockLow : styles.stockOk]}>
                  <Text style={styles.stockText}>Qty: {item.currentStock || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptyDesc}>Tap "+ Add Product" to create your first catalog item.</Text>
            </View>
          }
        />
      )}

      {/* Add Product Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product to Catalog</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Product / Item Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Masala Dosa / Premium Rice 5kg"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>SKU / Barcode</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="SKU-1001"
                    placeholderTextColor="#94A3B8"
                    value={sku}
                    onChangeText={setSku}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Beverages / Food"
                    placeholderTextColor="#94A3B8"
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="120.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MRP (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="120.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={mrp}
                    onChangeText={setMrp}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>GST Tax Rate (%)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="5"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={taxRate}
                    onChangeText={setTaxRate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Initial Stock</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="50"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={initialStock}
                    onChangeText={setInitialStock}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Weight Scale Item (Loose / Kg)</Text>
                <Switch
                  value={isWeightBased}
                  onValueChange={setIsWeightBased}
                  trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                  thumbColor={isWeightBased ? '#2563EB' : '#94A3B8'}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleCreateProduct}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Save to Catalog</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal visible={!!editingProduct} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product: {editingProduct?.name}</Text>
              <TouchableOpacity onPress={() => setEditingProduct(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.formInput}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.formInput}
                value={editCategory}
                onChangeText={setEditCategory}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={editSellingPrice}
                    onChangeText={setEditSellingPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MRP (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={editMrp}
                    onChangeText={setEditMrp}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>GST Tax Rate (%)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={editTaxRate}
                onChangeText={setEditTaxRate}
              />

              <TouchableOpacity
                style={[styles.submitButton, isUpdating && styles.submitDisabled]}
                onPress={handleUpdateProduct}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Update Product</Text>}
              </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  addButton: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  searchHeader: { padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A'
  },
  loadingBox: { padding: 32, alignItems: 'center' },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  listContent: { padding: 16, paddingBottom: 40 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  itemMain: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemCategory: { fontSize: 11, color: '#64748B', marginTop: 2 },
  itemBatch: { fontSize: 10, color: '#D97706', marginTop: 2 },
  itemPriceSection: { alignItems: 'flex-end' },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  itemTax: { fontSize: 10, color: '#64748B' },
  stockPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  stockLow: { backgroundColor: '#FEE2E2' },
  stockOk: { backgroundColor: '#ECFDF5' },
  stockText: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
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
  formRow: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  switchLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  submitButton: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }
});
