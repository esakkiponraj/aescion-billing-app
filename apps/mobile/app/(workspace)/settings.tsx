import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/auth/authContext';
import { defaultPrinter } from '../../src/hardware/printerAdapter';
import { syncInitialCatalog } from '../../src/sync/syncEngine';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { BusinessType } from '@aescion/shared-types';

export default function MobileSettingsScreen() {
  const { user, organization, branches, activeBranch, switchBranch, logout, activeRole, isSuperAdmin } = useMobileAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState(organization?.name || '');
  const [phone, setPhone] = useState(organization?.phone || '');
  const [email, setEmail] = useState(organization?.email || '');
  const [gstin, setGstin] = useState(organization?.gstin || '');
  const [address, setAddress] = useState(organization?.address || '');

  // Billing Preferences
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [quotePrefix, setQuotePrefix] = useState('QT-');
  const [receiptPrefix, setReceiptPrefix] = useState('REC-');
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  // Tax Preferences
  const [taxMode, setTaxMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [defaultTaxRate, setDefaultTaxRate] = useState('18');

  const isOwner = activeRole?.roleType === 'OWNER' || isSuperAdmin;
  const businessType = (organization?.businessType as BusinessType) || BusinessType.SUPERMARKET;

  useEffect(() => {
    if (organization) {
      setCompanyName(organization.name || '');
      setPhone(organization.phone || '');
      setEmail(organization.email || '');
      setGstin(organization.gstin || '');
      setAddress(organization.address || '');
    }
  }, [organization]);

  const handleSaveProfile = async () => {
    if (!companyName.trim()) {
      Alert.alert('Validation Error', 'Company Name is required.');
      return;
    }
    setIsSaving(true);
    try {
      await MobileApiClient.put('/organizations/profile', {
        name: companyName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gstin: gstin.trim() || undefined,
        address: address.trim() || undefined
      });
      Alert.alert('Success', 'Business profile settings saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update business profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = () => {
    defaultPrinter.printReceipt({
      companyName: companyName || organization?.name || 'AESCION Test Store',
      branchName: activeBranch?.name || 'Main Branch',
      invoiceNumber: 'TEST-PRT-001',
      date: new Date().toLocaleTimeString(),
      items: [
        { name: 'Thermal ESC/POS Alignment Check', quantity: 1, unitPrice: 100, taxRate: 18, total: 118 }
      ],
      subtotal: 100,
      taxTotal: 18,
      grandTotal: 118,
      paymentMethod: 'TEST_MODE',
      cashierName: `${user?.firstName} ${user?.lastName}`
    });
    Alert.alert('Printer Test Dispatched', 'Thermal printer ESC/POS command transmitted.');
  };

  const handleForceRefreshCatalog = async () => {
    if (!organization || !activeBranch) return;
    setIsSyncing(true);
    try {
      await syncInitialCatalog(organization.id, activeBranch.id);
      Alert.alert('Catalog Synchronized', 'Latest cloud products saved to local SQLite database.');
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
          router.replace('/');
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Quick Navigation Shortcuts */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Management Hub</Text>
        <Text style={styles.cardDesc}>Quick access to enterprise management modules.</Text>

        <View style={styles.shortcutGrid}>
          <TouchableOpacity style={styles.shortcutTile} onPress={() => router.push('/(workspace)/branches' as any)}>
            <Text style={styles.shortcutEmoji}>🏢</Text>
            <Text style={styles.shortcutTitle}>Branches</Text>
            <Text style={styles.shortcutSub}>{branches.length} Outlets</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shortcutTile} onPress={() => router.push('/(workspace)/team' as any)}>
            <Text style={styles.shortcutEmoji}>🛡️</Text>
            <Text style={styles.shortcutTitle}>Team & Staff</Text>
            <Text style={styles.shortcutSub}>Roles & Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shortcutTile} onPress={() => router.push('/(workspace)/customers' as any)}>
            <Text style={styles.shortcutEmoji}>👥</Text>
            <Text style={styles.shortcutTitle}>Customers</Text>
            <Text style={styles.shortcutSub}>Credit Ledger</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shortcutTile} onPress={() => router.push('/(workspace)/reports' as any)}>
            <Text style={styles.shortcutEmoji}>📈</Text>
            <Text style={styles.shortcutTitle}>Reports</Text>
            <Text style={styles.shortcutSub}>Audits & P&L</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Business Profile Settings */}
      {isOwner && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Company Profile</Text>
          <Text style={styles.cardDesc}>Commercial identity shown on invoices and receipts.</Text>

          <Text style={styles.inputLabel}>Business / Enterprise Name *</Text>
          <TextInput
            style={styles.formInput}
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Text style={styles.inputLabel}>Support Phone Number</Text>
          <TextInput
            style={styles.formInput}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.inputLabel}>Billing Email Address</Text>
          <TextInput
            style={styles.formInput}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
          <TextInput
            style={styles.formInput}
            autoCapitalize="characters"
            value={gstin}
            onChangeText={setGstin}
          />

          <Text style={styles.inputLabel}>Registered Address</Text>
          <TextInput
            style={[styles.formInput, { height: 60 }]}
            multiline
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Company Profile</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Document Prefixes & Receipt Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Billing & Receipt Preferences</Text>
        <Text style={styles.cardDesc}>Document numbering and formatting rules.</Text>

        <View style={styles.formRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Invoice Prefix</Text>
            <TextInput
              style={styles.formInput}
              value={invoicePrefix}
              onChangeText={setInvoicePrefix}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Quote Prefix</Text>
            <TextInput
              style={styles.formInput}
              value={quotePrefix}
              onChangeText={setQuotePrefix}
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Enable Auto Round-Off</Text>
            <Text style={styles.switchSub}>Round bill totals to nearest ₹1.00</Text>
          </View>
          <Switch
            value={enableRoundOff}
            onValueChange={setEnableRoundOff}
            trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
            thumbColor={enableRoundOff ? '#2563EB' : '#94A3B8'}
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Thermal Receipt Format</Text>
            <Text style={styles.switchSub}>Standard POS printer roll width</Text>
          </View>
          <View style={styles.paperWidthSelector}>
            {(['80mm', '58mm'] as const).map((w) => (
              <TouchableOpacity
                key={w}
                style={[styles.widthChip, paperWidth === w && styles.widthChipActive]}
                onPress={() => setPaperWidth(w)}
              >
                <Text style={[styles.widthChipText, paperWidth === w && styles.widthChipTextActive]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 4. Hardware & Sync Diagnostic */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hardware & Offline Storage</Text>
        <Text style={styles.cardDesc}>Bluetooth thermal printer & local SQLite sync engine.</Text>

        <TouchableOpacity style={styles.outlineButton} onPress={handleTestPrint}>
          <Text style={styles.outlineButtonText}>🖨️ Test Thermal Printer ({paperWidth})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineButton, { marginTop: 8 }]}
          onPress={handleForceRefreshCatalog}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.outlineButtonText}>🔄 Force Full Catalog Resync</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 5. Terminal Session / Sign Out */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Terminal Session</Text>
        <Text style={styles.cardDesc}>Logged in as {user?.firstName} {user?.lastName} ({activeRole?.name || 'Owner'})</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Sign Out of Terminal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cardDesc: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 12 },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcutTile: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  shortcutEmoji: { fontSize: 20, marginBottom: 4 },
  shortcutTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  shortcutSub: { fontSize: 10, color: '#64748B', marginTop: 2 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 8 },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A'
  },
  formRow: { flexDirection: 'row' },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8
  },
  switchTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  switchSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
  paperWidthSelector: { flexDirection: 'row', gap: 6 },
  widthChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  widthChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  widthChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  widthChipTextActive: { color: '#FFFFFF' },
  outlineButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center'
  },
  outlineButtonText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center'
  },
  logoutButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '800' }
});
