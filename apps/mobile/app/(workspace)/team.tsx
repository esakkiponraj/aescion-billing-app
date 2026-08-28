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
import { useMobileAuth } from '../../src/auth/authContext';

export default function TeamScreen() {
  const { organization, activeRole } = useMobileAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('CASHIER');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

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
        roleName: selectedRole
      });
      setIsAddModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setUsername('');
      setPassword('');
      fetchTeam();
      Alert.alert('Success', 'Staff member account created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Staff & Roles ({members.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading staff directory...</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchTeam(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Additional Staff</Text>
              <Text style={styles.emptyDesc}>Add Cashiers and Managers to delegate POS and inventory duties.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const userObj = item.user || item;
            const roleName = item.role?.name || item.roleName || userObj.role || 'CASHIER';
            const isOwner = roleName === 'OWNER';
            const fName = userObj.firstName || 'Staff';
            const lName = userObj.lastName || '';
            const uName = userObj.username || 'user';
            const uEmail = userObj.email || '';

            return (
              <View style={styles.memberCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, isOwner && styles.avatarOwner]}>
                    <Text style={[styles.avatarText, isOwner && styles.avatarTextOwner]}>
                      {fName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.memberName}>{fName} {lName}</Text>
                    <Text style={styles.memberMeta}>@{uName} • {uEmail || 'No email'}</Text>
                  </View>
                  <View style={[styles.roleBadge, isOwner ? styles.roleBadgeOwner : styles.roleBadgeStaff]}>
                    <Text style={[styles.roleBadgeText, isOwner ? styles.roleTextOwner : styles.roleTextStaff]}>
                      {roleName}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
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

              <Text style={styles.inputLabel}>Username * (Login handle)</Text>
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
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.inputLabel}>Assign System Role</Text>
              <View style={styles.roleSelectionRow}>
                {['CASHIER', 'MANAGER', 'TECHNICIAN', 'ACCOUNTANT'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, selectedRole === r && styles.roleOptionActive]}
                    onPress={() => setSelectedRole(r)}
                  >
                    <Text style={[styles.roleOptionText, selectedRole === r && styles.roleOptionTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.btnDisabled]}
                onPress={handleAddMember}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Staff Account</Text>
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
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  cardHeader: {
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
  avatarOwner: {
    backgroundColor: '#FEF3C7'
  },
  avatarText: {
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 14
  },
  avatarTextOwner: {
    color: '#D97706'
  },
  cardInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  memberMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  roleBadgeOwner: {
    backgroundColor: '#FEF3C7'
  },
  roleBadgeStaff: {
    backgroundColor: '#F1F5F9'
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  roleTextOwner: {
    color: '#D97706'
  },
  roleTextStaff: {
    color: '#475569'
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
  formRow: {
    flexDirection: 'row'
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
  roleSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  roleOptionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  roleOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  roleOptionTextActive: {
    color: '#FFFFFF'
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
