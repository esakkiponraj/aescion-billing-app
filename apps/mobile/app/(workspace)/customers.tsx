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

export default function CustomersScreen() {
  const { activeBranch, activeRole, isSuperAdmin } = useMobileAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add Customer Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Customer Form State
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isOwner = activeRole?.roleType === 'OWNER' || isSuperAdmin;

  const fetchCustomers = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await MobileApiClient.get<any[]>(`/customers${q}`);
      setCustomers(data || []);
    } catch (err) {
      console.warn('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
    const unsub = subscribeToRealtimeEvent('customer_updated', () => fetchCustomers());
    return unsub;
  }, [fetchCustomers]);

  const openAddModal = () => {
    setName('');
    setPhone('');
    setEmail('');
    setGstin('');
    setAddress('');
    setCity('');
    setState('');
    setCreditLimit('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (cust: any) => {
    setEditingCustomer(cust);
    setEditName(cust.name || '');
    setEditPhone(cust.phone || '');
    setEditEmail(cust.email || '');
    setEditGstin(cust.gstin || '');
    setEditAddress(cust.address || '');
    setEditCity(cust.city || '');
    setEditState(cust.state || '');
    setEditCreditLimit(String(cust.creditLimit || '0'));
  };

  const handleCreateCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileApiClient.post('/customers', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gstin: gstin.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0
      });
      setIsAddModalOpen(false);
      fetchCustomers();
      Alert.alert('Success', 'Customer registered successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }
    setIsUpdating(true);
    try {
      await MobileApiClient.put(`/customers/${editingCustomer.id}`, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        gstin: editGstin.trim() || undefined,
        address: editAddress.trim() || undefined,
        city: editCity.trim() || undefined,
        state: editState.trim() || undefined,
        creditLimit: editCreditLimit ? parseFloat(editCreditLimit) : 0
      });
      setEditingCustomer(null);
      fetchCustomers();
      Alert.alert('Success', 'Customer details updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update customer.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Customers & Credit ({customers.length})</Text>
          <Text style={styles.headerSub}>Active Branch: {activeBranch?.name || 'Main'}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search customer name, phone, GSTIN..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Customer List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading customer ledger...</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchCustomers(); }} />
          }
          renderItem={({ item }) => {
            const outstanding = Number(item.outstandingBalance || item.currentBalance || 0);

            return (
              <TouchableOpacity
                style={styles.customerCard}
                onPress={() => openEditModal(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name ? item.name.substring(0, 1).toUpperCase() : 'C'}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerMeta}>
                      {item.phone || 'No phone'} • {item.city || 'Local'}
                    </Text>
                    {item.gstin && <Text style={styles.gstinText}>GSTIN: {item.gstin}</Text>}
                  </View>
                  <View style={styles.creditBox}>
                    <Text style={styles.creditLabel}>Outstanding</Text>
                    <Text style={[styles.creditValue, outstanding > 0 ? styles.creditDue : styles.creditZero]}>
                      ₹{outstanding.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.editPrompt}>Tap to edit details or adjust credit limit →</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptyDesc}>Tap "+ Add Customer" to register client accounts.</Text>
            </View>
          }
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Customer</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Full Name / Company Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Client Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Mobile Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="9840012345"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Credit Limit (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="10000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="client@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
              <TextInput
                style={styles.formInput}
                placeholder="33AAAAA0000A1Z5"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={gstin}
                onChangeText={setGstin}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Street address"
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Chennai"
                    placeholderTextColor="#94A3B8"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Tamil Nadu"
                    placeholderTextColor="#94A3B8"
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleCreateCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Create Customer</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal visible={!!editingCustomer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Customer: {editingCustomer?.name}</Text>
              <TouchableOpacity onPress={() => setEditingCustomer(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Customer Name *</Text>
              <TextInput
                style={styles.formInput}
                value={editName}
                onChangeText={setEditName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Mobile Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={setEditPhone}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Credit Limit (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={editCreditLimit}
                    onChangeText={setEditCreditLimit}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="email-address"
                autoCapitalize="none"
                value={editEmail}
                onChangeText={setEditEmail}
              />

              <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
              <TextInput
                style={styles.formInput}
                autoCapitalize="characters"
                value={editGstin}
                onChangeText={setEditGstin}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.formInput}
                value={editAddress}
                onChangeText={setEditAddress}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editState}
                    onChangeText={setEditState}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isUpdating && styles.submitDisabled]}
                onPress={handleUpdateCustomer}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
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
  searchContainer: { padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
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
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#2563EB' },
  cardInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  customerMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  gstinText: { fontSize: 10, color: '#475569', marginTop: 1 },
  creditBox: { alignItems: 'flex-end' },
  creditLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  creditValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  creditDue: { color: '#DC2626' },
  creditZero: { color: '#059669' },
  cardFooter: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  editPrompt: { fontSize: 10, color: '#2563EB', fontWeight: '600' },
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
  submitButton: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }
});
