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

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await MobileApiClient.get<any[]>('/suppliers');
      setSuppliers(data || []);
    } catch (err) {
      console.warn('Failed to fetch suppliers:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreateSupplier = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Supplier / Vendor Name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileApiClient.post('/suppliers', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gstin: gstin.trim() || undefined,
        city: city.trim() || undefined,
        paymentTerms
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setGstin('');
      setCity('');
      fetchSuppliers();
      Alert.alert('Success', 'Supplier registered successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Vendors & Suppliers ({suppliers.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addButtonText}>+ New Vendor</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading suppliers...</Text>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchSuppliers(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🏭</Text>
              <Text style={styles.emptyTitle}>No Suppliers Registered</Text>
              <Text style={styles.emptyDesc}>Add vendor profiles to manage purchase orders and stock GRN intake.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.supplierCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{item.name.substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.supplierName}>{item.name}</Text>
                  <Text style={styles.supplierPhone}>📞 {item.phone || 'No phone'}</Text>
                  {item.gstin ? <Text style={styles.gstinText}>GSTIN: {item.gstin}</Text> : null}
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>📍 {item.city || 'National'}</Text>
                <Text style={styles.termsText}>Terms: {item.paymentTerms || 'Standard'}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Supplier Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Vendor / Supplier</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Company / Vendor Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Metro Wholesale Distributors"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Contact Phone</Text>
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
                placeholder="e.g. vendor@metro.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>GSTIN</Text>
              <TextInput
                style={styles.formInput}
                placeholder="15-character GSTIN"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                maxLength={15}
                value={gstin}
                onChangeText={setGstin}
              />

              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.formInput}
                placeholder="City"
                placeholderTextColor="#94A3B8"
                value={city}
                onChangeText={setCity}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.btnDisabled]}
                onPress={handleCreateSupplier}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Supplier</Text>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260
  },
  supplierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#475569',
    fontWeight: '900',
    fontSize: 14
  },
  cardInfo: {
    flex: 1
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  supplierPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  gstinText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  metaText: {
    fontSize: 11,
    color: '#64748B'
  },
  termsText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700'
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
