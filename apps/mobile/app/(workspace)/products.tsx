import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { getLocalDatabase } from '../../src/database/sqlite';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { useMobileAuth } from '../../src/auth/authContext';
import { syncInitialCatalog } from '../../src/sync/syncEngine';

export default function MobileProductsScreen() {
  const { organization, activeBranch } = useMobileAuth();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLocalCatalog = async (query = '') => {
    try {
      const db = await getLocalDatabase();
      let rows: any[] = [];
      if (query.trim()) {
        rows = await db.getAllAsync<any>(
          `SELECT * FROM local_products WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?`,
          [`%${query}%`, `%${query}%`, `%${query}%`]
        );
      } else {
        rows = await db.getAllAsync<any>(`SELECT * FROM local_products ORDER BY name ASC`);
      }

      if ((!rows || rows.length === 0) && !query.trim() && organization?.id && activeBranch?.id) {
        const onlineProducts = await MobileApiClient.get<any[]>('/products').catch(() => []);
        if (onlineProducts && onlineProducts.length > 0) {
          await syncInitialCatalog(organization.id, activeBranch.id);
          rows = onlineProducts;
        }
      }

      setProducts(rows || []);
    } catch (err) {
      console.warn('Failed to load local catalog:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (organization && activeBranch) {
      await syncInitialCatalog(organization.id, activeBranch.id);
    }
    await loadLocalCatalog(search);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadLocalCatalog(search);
  }, [search]);

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search items, SKU or category..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemMain}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category || 'General'} • HSN: {item.hsn || 'N/A'}</Text>
              {item.batchNumber && (
                <Text style={styles.itemBatch}>Batch: {item.batchNumber} {item.expiryDate ? `(Exp: ${item.expiryDate.split('T')[0]})` : ''}</Text>
              )}
            </View>
            <View style={styles.itemPriceSection}>
              <Text style={styles.itemPrice}>₹{item.sellingPrice}</Text>
              <Text style={styles.itemTax}>+{item.taxRate}% GST</Text>
              <View style={[styles.stockPill, (item.currentStock || 0) <= 5 ? styles.stockLow : styles.stockOk]}>
                <Text style={styles.stockText}>Qty: {item.currentStock || 0}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No items found in local offline storage.</Text>
            <TouchableOpacity style={styles.syncBtn} onPress={handleRefresh}>
              <Text style={styles.syncBtnText}>Pull Latest from Cloud</Text>
            </TouchableOpacity>
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
  searchHeader: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600'
  },
  listContent: {
    padding: 12,
    paddingBottom: 30
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemMain: {
    flex: 1,
    marginRight: 10
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  itemCategory: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  itemBatch: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2
  },
  itemPriceSection: {
    alignItems: 'flex-end'
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB'
  },
  itemTax: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600'
  },
  stockPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  stockOk: {
    backgroundColor: '#ECFDF5'
  },
  stockLow: {
    backgroundColor: '#FEF2F2'
  },
  stockText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E293B'
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 50,
    padding: 20
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600'
  },
  syncBtn: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});
