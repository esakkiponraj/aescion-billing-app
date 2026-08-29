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

export default function TeamScreen() {
  const { organization, activeBranch, activeRole, isSuperAdmin } = useMobileAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('CASHIER');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('CASHIER');
  const [editBranchId, setEditBranchId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const availableRoles = organization?.businessType === 'RESTAURANT'
    ? ['MANAGER', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF', 'WAITER', 'KITCHEN']
    : organization?.businessType === 'SERVICE'
    ? ['MANAGER', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF', 'TECHNICIAN']
    : ['MANAGER', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF'];

  const isOwner = activeRole?.roleType === 'OWNER' || isSuperAdmin;

  const fetchTeam = useCallback(async () => {
    try {
      const data = await MobileApiClient.get<any[]>('/team/members');
      setMembers(data || []);
    } catch (err) {
      console.warn('Failed to fetch team members:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchAuxiliary = useCallback(async () => {
    try {
      const [branchData, roleData] = await Promise.all([
        MobileApiClient.get<any[]>('/branches').catch(() => []),
        MobileApiClient.get<any[]>('/roles').catch(() => [])
      ]);
      setBranches(branchData || []);
      setRoles(roleData || []);
      if (branchData && branchData.length > 0) {
        setSelectedBranchId(branchData[0].id);
      }
    } catch (err) {
      console.warn('Failed to fetch branches/roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
    fetchAuxiliary();
    const unsub = subscribeToRealtimeEvent('team_updated', () => fetchTeam());
    return unsub;
  }, [fetchTeam, fetchAuxiliary]);

  const openAddModal = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setSelectedRole('CASHIER');
    setSelectedBranchId(activeBranch?.id || (branches[0]?.id ?? ''));
    setIsAddModalOpen(true);
  };

  const openEditModal = (member: any) => {
    const userObj = member.user || member;
    setEditingMember(member);
    setEditFirstName(userObj.firstName || '');
    setEditLastName(userObj.lastName || '');
    setEditEmail(userObj.email || '');
    setEditRole(member.role?.name || member.roleName || userObj.role || 'CASHIER');
    setEditBranchId(member.branchId || userObj.branchId || '');
    setEditIsActive(member.isActive !== false && userObj.isActive !== false);
  };

  const handleAddMember = async () => {
    if (!firstName.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'First Name, Username, and Password are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileApiClient.post('/team/members', {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        username: username.trim().toLowerCase(),
        password: password.trim(),
        roleName: selectedRole,
        branchId: selectedBranchId || activeBranch?.id
      });
      setIsAddModalOpen(false);
      fetchTeam();
      Alert.alert('Success', 'Staff member account created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    if (!editFirstName.trim()) {
      Alert.alert('Validation Error', 'First Name is required.');
      return;
    }
    setIsUpdating(true);
    try {
      await MobileApiClient.put(`/team/members/${editingMember.id}`, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim() || undefined,
        email: editEmail.trim() || undefined,
        roleName: editRole,
        branchId: editBranchId || undefined,
        isActive: editIsActive
      });
      setEditingMember(null);
      fetchTeam();
      Alert.alert('Success', 'Staff member details updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update staff member.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const userObj = m.user || m;
    return (
      (userObj.firstName || '').toLowerCase().includes(q) ||
      (userObj.lastName || '').toLowerCase().includes(q) ||
      (userObj.username || '').toLowerCase().includes(q) ||
      (userObj.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Staff & Access ({filteredMembers.length})</Text>
          <Text style={styles.headerSub}>Active Branch: {activeBranch?.name || 'Main'}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Staff</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search staff by name, handle or email..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Team Directory List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading staff directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchTeam(); }} />
          }
          renderItem={({ item }) => {
            const userObj = item.user || item;
            const roleName = item.role?.name || item.roleName || userObj.role || 'CASHIER';
            const isMemberOwner = roleName === 'OWNER';
            const fName = userObj.firstName || 'Staff';
            const lName = userObj.lastName || '';
            const uName = userObj.username || 'user';
            const uEmail = userObj.email || '';
            const branchAssigned = branches.find((b) => b.id === (item.branchId || userObj.branchId))?.name || 'All Branches';
            const isUserActive = item.isActive !== false && userObj.isActive !== false;

            return (
              <TouchableOpacity
                style={[styles.memberCard, !isUserActive && styles.memberCardInactive]}
                onPress={() => isOwner && openEditModal(item)}
                activeOpacity={isOwner ? 0.8 : 1}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, isMemberOwner && styles.avatarOwner]}>
                    <Text style={[styles.avatarText, isMemberOwner && styles.avatarTextOwner]}>
                      {fName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName}>{fName} {lName}</Text>
                      {!isUserActive && (
                        <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>INACTIVE</Text></View>
                      )}
                    </View>
                    <Text style={styles.memberMeta}>@{uName} • {uEmail || 'No email'}</Text>
                    <Text style={styles.branchAssigned}>📍 {branchAssigned}</Text>
                  </View>
                  <View style={[styles.roleBadge, isMemberOwner ? styles.roleBadgeOwner : styles.roleBadgeStaff]}>
                    <Text style={[styles.roleBadgeText, isMemberOwner ? styles.roleTextOwner : styles.roleTextStaff]}>
                      {roleName}
                    </Text>
                  </View>
                </View>

                {isOwner && !isMemberOwner && (
                  <View style={styles.cardFooter}>
                    <Text style={styles.editPrompt}>Tap to edit role, branch or permissions →</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Additional Staff</Text>
              <Text style={styles.emptyDesc}>Add Cashiers and Managers to delegate POS and inventory duties.</Text>
            </View>
          }
        />
      )}

      {/* Add Staff Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff Member</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="First Name"
                    placeholderTextColor="#94A3B8"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Last Name"
                    placeholderTextColor="#94A3B8"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Username * (Login Handle)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. cashier_john"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="john@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>Temporary Password * (Min 6 chars)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.inputLabel}>Role Designation</Text>
              <View style={styles.rolePickerRow}>
                {availableRoles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, selectedRole === r && styles.roleChipActive]}
                    onPress={() => setSelectedRole(r)}
                  >
                    <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextActive]}>{r.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {branches.length > 1 && (
                <>
                  <Text style={styles.inputLabel}>Branch Outlet</Text>
                  <View style={styles.rolePickerRow}>
                    {branches.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.roleChip, selectedBranchId === b.id && styles.roleChipActive]}
                        onPress={() => setSelectedBranchId(b.id)}
                      >
                        <Text style={[styles.roleChipText, selectedBranchId === b.id && styles.roleChipTextActive]}>{b.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleAddMember}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Create Staff Account</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal visible={!!editingMember} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Staff: {editingMember?.user?.username || editingMember?.username}</Text>
              <TouchableOpacity onPress={() => setEditingMember(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editLastName}
                    onChangeText={setEditLastName}
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

              <Text style={styles.inputLabel}>Role Designation</Text>
              <View style={styles.rolePickerRow}>
                {availableRoles.map((r) => {
                  const isMatch = editRole === r || editRole.toUpperCase() === r.replace('_', ' ');
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, isMatch && styles.roleChipActive]}
                      onPress={() => setEditRole(r)}
                    >
                      <Text style={[styles.roleChipText, isMatch && styles.roleChipTextActive]}>{r.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {branches.length > 1 && (
                <>
                  <Text style={styles.inputLabel}>Assigned Branch Outlet</Text>
                  <View style={styles.rolePickerRow}>
                    {branches.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.roleChip, editBranchId === b.id && styles.roleChipActive]}
                        onPress={() => setEditBranchId(b.id)}
                      >
                        <Text style={[styles.roleChipText, editBranchId === b.id && styles.roleChipTextActive]}>{b.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Account Active Status</Text>
                <Switch
                  value={editIsActive}
                  onValueChange={setEditIsActive}
                  trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                  thumbColor={editIsActive ? '#2563EB' : '#94A3B8'}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isUpdating && styles.submitDisabled]}
                onPress={handleUpdateMember}
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
  searchBox: { padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
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
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  memberCardInactive: { opacity: 0.6, borderColor: '#FCA5A5' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarOwner: { backgroundColor: '#FEF3C7' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#4F46E5' },
  avatarTextOwner: { color: '#D97706' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginRight: 6 },
  inactiveBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  inactiveBadgeText: { fontSize: 9, fontWeight: '800', color: '#DC2626' },
  memberMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  branchAssigned: { fontSize: 10, color: '#475569', marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeOwner: { backgroundColor: '#FEF3C7' },
  roleBadgeStaff: { backgroundColor: '#F1F5F9' },
  roleBadgeText: { fontSize: 10, fontWeight: '800' },
  roleTextOwner: { color: '#D97706' },
  roleTextStaff: { color: '#475569' },
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
  rolePickerRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleChip: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#F1F5F9', alignItems: 'center' },
  roleChipActive: { backgroundColor: '#2563EB' },
  roleChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  roleChipTextActive: { color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  switchLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  submitButton: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }
});
