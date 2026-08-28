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

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setName('');
      setPhone('');
      setEmail('');
      setGstin('');
      setAddress('');
      setCity('');
      setState('');
      setCreditLimit('');
      fetchCustomers();
      Alert.alert('Success', 'Customer registered successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header & Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name, phone..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
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
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{item.name.substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerPhone}>📞 {item.phone || 'No phone'}</Text>
                  {item.gstin ? <Text style={styles.customerGstin}>GSTIN: {item.gstin}</Text> : null}
                </View>
                <View style={styles.balanceBadgeContainer}>
                  <Text style={styles.balanceLabel}>Outstanding</Text>
                  <Text style={[styles.balanceValue, item.currentOutstanding > 0 ? styles.textRed : styles.textGreen]}>
                    ₹{(item.currentOutstanding || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.customerFooter}>
                <Text style={styles.footerMeta}>Credit Limit: ₹{(item.creditLimit || 0).toLocaleString('en-IN')}</Text>
                <Text style={styles.footerMeta}>Loyalty: {item.loyaltyPoints || 0} pts</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Customer</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Mobile Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. ramesh@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>GSTIN (For B2B)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="15-character GSTIN"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                maxLength={15}
                value={gstin}
                onChangeText={setGstin}
              />

              <Text style={styles.inputLabel}>Credit Limit (₹)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 50000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={creditLimit}
                onChangeText={setCreditLimit}
              />

              <Text style={styles.inputLabel}>City & State</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, marginRight: 8 }]}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={city}
                  onChangeText={setCity}
                />
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="State"
                  placeholderTextColor="#94A3B8"
                  value={state}
                  onChangeText={setState}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.btnDisabled]}
                onPress={handleCreateCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Register Customer</Text>
                )}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A'
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8
  },
  listContent: {
    padding: 14,
    paddingBottom: 30
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center'
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600'
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 14
  },
  customerInfo: {
    flex: 1
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  customerPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  customerGstin: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2
  },
  balanceBadgeContainer: {
    alignItems: 'flex-end'
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase'
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2
  },
  textRed: {
    color: '#DC2626'
  },
  textGreen: {
    color: '#10B981'
  },
  customerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  footerMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A'
  },
  modalClose: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '700',
    padding: 4
  },
  formScroll: {
    paddingBottom: 20
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A'
  },
  formRow: {
    flexDirection: 'row'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30
  },
  btnDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  }
});
