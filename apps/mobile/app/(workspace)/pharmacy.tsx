import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';

export default function MobilePharmacyScreen() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.get<any[]>('/pharmacy/medicines');
      setMedicines(data || []);
    } catch (err: any) {
      console.warn('Failed to fetch medicines:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pharmacy Batch Safety & Expiry</Text>
        <TouchableOpacity onPress={fetchMedicines} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
          return (
            <View style={[styles.medCard, isExpired && styles.medCardExpired]}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>{item.name}</Text>
                <View style={[styles.statusBadge, isExpired ? styles.badgeExpired : styles.badgeValid]}>
                  <Text style={styles.statusText}>{isExpired ? 'BLOCKED / EXPIRED' : 'VALID BATCH'}</Text>
                </View>
              </View>

              <Text style={styles.medMeta}>
                Generic: {item.genericName || 'N/A'} • Mfg: {item.manufacturer || 'Pharma Corp'}
              </Text>
              <Text style={styles.batchInfo}>
                Batch: {item.batchNumber || 'B-001'} | Exp: {item.expiryDate ? item.expiryDate.split('T')[0] : 'N/A'}
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceText}>MRP: ₹{item.mrp || item.sellingPrice}</Text>
                <Text style={styles.stockText}>Available Units: {item.currentStock || 0}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No pharmaceutical batches registered.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A'
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB'
  },
  listContent: {
    padding: 12
  },
  medCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  medCardExpired: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2'
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  medName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeValid: {
    backgroundColor: '#ECFDF5'
  },
  badgeExpired: {
    backgroundColor: '#FEE2E2'
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1E293B'
  },
  medMeta: {
    fontSize: 11,
    color: '#64748B'
  },
  batchInfo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB'
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981'
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  }
});
