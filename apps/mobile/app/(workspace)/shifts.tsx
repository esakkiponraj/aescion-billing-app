import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { useMobileAuth } from '../../src/auth/authContext';

export default function MobileShiftsScreen() {
  const { activeBranch } = useMobileAuth();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openingFloat, setOpeningFloat] = useState('2000');
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActiveShift = async () => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.get<any>('/cashier-shifts/active');
      setActiveShift(data);
      if (data) {
        setActualCash(String(data.expectedCash || data.openingCash || 0));
      }
    } catch (err: any) {
      console.warn('Failed to fetch active shift:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveShift();
  }, [activeBranch?.id]);

  const handleOpenShift = async () => {
    const floatNum = Number(openingFloat);
    if (isNaN(floatNum) || floatNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid opening float amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const shift = await MobileApiClient.post<any>('/cashier-shifts/open', {
        openingCash: floatNum
      });
      setActiveShift(shift);
      Alert.alert('✅ Shift Opened', `Shift ${shift.shiftNumber} is now active.`);
    } catch (err: any) {
      Alert.alert('Shift Error', err.message || 'Failed to open shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    const counted = Number(actualCash);
    if (isNaN(counted) || counted < 0) {
      Alert.alert('Validation Error', 'Please enter the physical cash counted in the drawer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const closed = await MobileApiClient.post<any>('/cashier-shifts/close', {
        actualCash: counted,
        notes: notes.trim() || undefined
      });
      Alert.alert(
        '🏁 Shift Closed & Reconciled',
        `Expected: ₹${closed.expectedCash || 0}\nActual Counted: ₹${closed.actualCash || 0}\nDifference: ₹${closed.cashDifference || 0}`
      );
      setActiveShift(null);
    } catch (err: any) {
      Alert.alert('Shift Close Error', err.message || 'Failed to close shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Verifying drawer status...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeShift ? (
        /* ACTIVE SHIFT SUMMARY & CLOSE FORM */
        <View style={styles.card}>
          <View style={styles.activeBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeBadgeText}>ACTIVE CASHIER SHIFT</Text>
          </View>

          <Text style={styles.shiftNumber}>{activeShift.shiftNumber}</Text>
          <Text style={styles.shiftMeta}>
            Opened: {new Date(activeShift.openedAt || activeShift.startTime).toLocaleTimeString()}
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Opening Float</Text>
              <Text style={styles.statVal}>₹{activeShift.openingCash || activeShift.openingFloat || 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Cash Sales</Text>
              <Text style={styles.statVal}>₹{activeShift.totalCashSales || 0}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxHighlight]}>
              <Text style={styles.statLabelHighlight}>Expected in Drawer</Text>
              <Text style={styles.statValHighlight}>₹{activeShift.expectedCash || activeShift.openingCash || 0}</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Reconcile & Close Drawer</Text>
            <Text style={styles.label}>Actual Cash Counted (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={actualCash}
              onChangeText={setActualCash}
              placeholder="Counted cash in till..."
            />

            <Text style={styles.label}>Shift Handover Notes</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes for supervisor..."
            />

            <TouchableOpacity
              style={[styles.closeBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleCloseShift}
              disabled={isSubmitting}
            >
              <Text style={styles.closeBtnText}>
                {isSubmitting ? 'Reconciling Shift...' : 'Close & Reconcile Shift'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* OPEN NEW SHIFT FORM */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Open New Cashier Shift</Text>
          <Text style={styles.cardDesc}>Enter opening cash float before starting transactions.</Text>

          <View style={styles.formSection}>
            <Text style={styles.label}>Opening Cash Float (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={openingFloat}
              onChangeText={setOpeningFloat}
              placeholder="e.g. 2000"
            />

            <TouchableOpacity
              style={[styles.openBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleOpenShift}
              disabled={isSubmitting}
            >
              <Text style={styles.openBtnText}>
                {isSubmitting ? 'Opening Shift...' : 'Open Cashier Shift'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46'
  },
  shiftNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A'
  },
  shiftMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statBoxHighlight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE'
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B'
  },
  statVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2
  },
  statLabelHighlight: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  statValHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
    marginTop: 2
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A'
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16
  },
  formSection: {
    marginTop: 10
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14
  },
  openBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  closeBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  btnDisabled: {
    opacity: 0.6
  }
});
