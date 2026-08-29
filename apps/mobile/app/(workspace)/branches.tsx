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
  RefreshControl,
  Switch
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { useMobileAuth } from '../../src/auth/authContext';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function BranchesScreen() {
  const { user, organization, activeBranch, switchBranch, activeRole, isSuperAdmin } = useMobileAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = activeRole?.roleType === 'OWNER' || isSuperAdmin;

  const fetchBranches = useCallback(async () => {
    try {
      const data = await MobileApiClient.get<any[]>('/branches');
      setBranches(data || []);
    } catch (err) {
      console.warn('Failed to fetch branches:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    const unsub = subscribeToRealtimeEvent('branch_updated', () => fetchBranches());
    return unsub;
  }, [fetchBranches]);

  const openAddModal = () => {
    setName('');
    setCode('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const openEditModal = (branch: any) => {
    setEditingBranch(branch);
    setName(branch.name || '');
    setCode(branch.code || '');
    setPhone(branch.phone || '');
    setAddress(branch.address || '');
    setCity(branch.city || '');
    setState(branch.state || '');
    setIsActive(branch.isActive !== false);
  };

  const handleCreateBranch = async () => {
    if (!name.trim() || !code.trim()) {
      Alert.alert('Validation Error', 'Branch Name and Unique Code are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileApiClient.post('/branches', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined
      });
      setIsAddModalOpen(false);
      fetchBranches();
      Alert.alert('Success', 'New branch location added successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Branch Name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileApiClient.put(`/branches/${editingBranch.id}`, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        isActive
      });
      setEditingBranch(null);
      fetchBranches();
      Alert.alert('Success', 'Branch location updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchBranch = (branch: any) => {
    switchBranch(branch.id);
    Alert.alert('Active Branch Switched', `Switched active POS and terminal operations to ${branch.name}.`);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Branch Outlets ({branches.length})</Text>
          <Text style={styles.headerSub}>Active: {activeBranch?.name || 'Main Branch'}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Branch</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Branch List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading branch outlets...</Text>
        </View>
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchBranches(); }} />
          }
          renderItem={({ item }) => {
            const isSelected = activeBranch?.id === item.id;
            const regCount = item.registers?.length || 1;

            return (
              <View style={[styles.branchCard, isSelected && styles.branchCardActive]}>
                <View style={styles.cardHeader}>
                  <View style={styles.branchIconBox}>
                    <Text style={styles.branchEmoji}>{item.isMain ? '🏛️' : '🏢'}</Text>
                  </View>
                  <View style={styles.cardMain}>
                    <View style={styles.nameRow}>
                      <Text style={styles.branchName}>{item.name}</Text>
                      {item.isMain && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>MAIN</Text></View>}
                    </View>
                    <Text style={styles.branchCode}>Code: {item.code} • {regCount} Register{regCount !== 1 ? 's' : ''}</Text>
                    {item.city && <Text style={styles.branchCity}>📍 {item.city}{item.state ? `, ${item.state}` : ''}</Text>}
                  </View>

                  <View style={[styles.statusBadge, item.isActive !== false ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusText, item.isActive !== false ? styles.statusTextActive : styles.statusTextInactive]}>
                      {item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>

                {/* Actions Footer */}
                <View style={styles.cardFooter}>
                  {!isSelected ? (
                    <TouchableOpacity style={styles.switchBtn} onPress={() => handleSwitchBranch(item)}>
                      <Text style={styles.switchBtnText}>Set as Active Terminal</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>✓ Current Active Branch</Text>
                    </View>
                  )}

                  {isOwner && (
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                      <Text style={styles.editBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🏢</Text>
              <Text style={styles.emptyTitle}>No Branches Configured</Text>
              <Text style={styles.emptyDesc}>Add store outlets or warehouse locations.</Text>
            </View>
          }
        />
      )}

      {/* Add Branch Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Branch Location</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Branch Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Airport Terminal Outlet"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Branch Code * (Unique prefix)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. APT-01"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="9840012345"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="100 Commercial Road"
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
                onPress={handleCreateBranch}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Branch</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal visible={!!editingBranch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Branch: {editingBranch?.code}</Text>
              <TouchableOpacity onPress={() => setEditingBranch(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.inputLabel}>Branch Name *</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.formInput}
                value={address}
                onChangeText={setAddress}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.formInput}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.formInput}
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Branch Active Status</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                  thumbColor={isActive ? '#2563EB' : '#94A3B8'}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleUpdateBranch}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
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
  headerSub: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  branchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  branchCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#FAFCFF'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  branchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  branchEmoji: {
    fontSize: 18
  },
  cardMain: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  branchName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 6
  },
  mainBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  mainBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  branchCode: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  branchCity: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusActive: {
    backgroundColor: '#ECFDF5'
  },
  statusInactive: {
    backgroundColor: '#FEF2F2'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800'
  },
  statusTextActive: {
    color: '#059669'
  },
  statusTextInactive: {
    color: '#DC2626'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  switchBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  switchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB'
  },
  activePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  emptyBox: {
    padding: 48,
    alignItems: 'center'
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    padding: 4
  },
  formScroll: {
    marginTop: 12
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
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A'
  },
  formRow: {
    flexDirection: 'row'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9'
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  submitDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  }
});
