import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/auth/authContext';
import { defaultPrinter } from '../../src/hardware/printerAdapter';
import { syncInitialCatalog } from '../../src/sync/syncEngine';

export default function MobileSettingsScreen() {
  const { user, organization, branches, activeBranch, switchBranch, logout } = useMobileAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleTestPrint = () => {
    defaultPrinter.printReceipt({
      companyName: organization?.name || 'AESCION Test Store',
      branchName: activeBranch?.name || 'Main Branch',
      invoiceNumber: 'TEST-PRT-001',
      date: new Date().toLocaleTimeString(),
      items: [
        { name: 'Printer Diagnostic Roll Test', quantity: 1, unitPrice: 100, taxRate: 18, total: 118 }
      ],
      subtotal: 100,
      taxTotal: 18,
      grandTotal: 118,
      paymentMethod: 'TEST_MODE',
      cashierName: `${user?.firstName} ${user?.lastName}`
    });
    Alert.alert('🖨️ Test Print Dispatched', 'Thermal printer ESC/POS command transmitted.');
  };

  const handleForceRefreshCatalog = async () => {
    if (!organization || !activeBranch) return;
    setIsSyncing(true);
    try {
      await syncInitialCatalog(organization.id, activeBranch.id);
      Alert.alert('✅ Catalog Synchronized', 'Latest cloud products saved to local SQLite database.');
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Failed to refresh catalog.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of this POS terminal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Outlet Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Outlet / Branch</Text>
        <Text style={styles.cardDesc}>Switch the active sales counter location for this device.</Text>

        <View style={styles.branchList}>
          {branches.map((b) => {
            const isSelected = b.id === activeBranch?.id;
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.branchRow, isSelected && styles.branchRowSelected]}
                onPress={() => switchBranch(b.id)}
              >
                <View>
                  <Text style={[styles.branchName, isSelected && styles.branchNameSelected]}>
                    {b.name} ({b.code})
                  </Text>
                  <Text style={styles.branchMeta}>{b.city || 'City'}, {b.state || 'State'}</Text>
                </View>
                {isSelected && <Text style={styles.selectedCheck}>✓ Active</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* POS Hardware & Printer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hardware & Peripheral Setup</Text>
        <Text style={styles.cardDesc}>Thermal ESC/POS receipt printer and barcode scanner.</Text>

        <TouchableOpacity style={styles.actionRowBtn} onPress={handleTestPrint}>
          <Text style={styles.actionBtnEmoji}>🖨️</Text>
          <View style={styles.actionBtnInfo}>
            <Text style={styles.actionBtnTitle}>Run Printer Diagnostic Test</Text>
            <Text style={styles.actionBtnDesc}>Prints a test receipt to verify 58mm/80mm output</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRowBtn} onPress={handleForceRefreshCatalog}>
          <Text style={styles.actionBtnEmoji}>🔄</Text>
          <View style={styles.actionBtnInfo}>
            <Text style={styles.actionBtnTitle}>Force Catalog Sync to SQLite</Text>
            <Text style={styles.actionBtnDesc}>
              {isSyncing ? 'Updating local database...' : 'Download latest prices and items for offline use'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Terminal Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Terminal Diagnostics</Text>
        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Engine Version</Text>
          <Text style={styles.diagVal}>v2.0.0 Enterprise</Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Local SQLite Storage</Text>
          <Text style={styles.diagVal}>aescion_commerce_v2.db (WAL)</Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Secure Keystore</Text>
          <Text style={styles.diagVal}>Expo SecureStore Active</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out of Workspace</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A'
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14
  },
  branchList: {
    gap: 8
  },
  branchRow: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  branchRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6'
  },
  branchName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B'
  },
  branchNameSelected: {
    color: '#1D4ED8'
  },
  branchMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  selectedCheck: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB'
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  actionBtnEmoji: {
    fontSize: 24,
    marginRight: 12
  },
  actionBtnInfo: {
    flex: 1
  },
  actionBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  actionBtnDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  diagLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  diagVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700'
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800'
  }
});
