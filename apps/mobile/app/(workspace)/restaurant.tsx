import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { defaultPrinter } from '../../src/hardware/printerAdapter';

export default function MobileRestaurantScreen() {
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.get<any[]>('/restaurant/tables');
      setTables(data || []);
    } catch (err: any) {
      console.warn('Failed to fetch restaurant tables:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleSendKOT = async (table: any) => {
    try {
      const kotData = {
        tableId: table.id,
        items: [
          { name: 'Veg Supreme Burger', quantity: 2, specialNotes: 'Extra spicy' },
          { name: 'Cold Coffee Frappe', quantity: 1 }
        ]
      };

      const res = await MobileApiClient.post<any>('/restaurant/kots', kotData);

      // Print KOT via PrinterAdapter
      defaultPrinter.printKOT({
        kotNumber: res.kotNumber || `KOT-${Date.now().toString().slice(-4)}`,
        tableNumber: table.name || `Table ${table.tableNumber}`,
        floorSection: table.section || 'Ground Floor',
        timestamp: new Date().toLocaleTimeString(),
        isDelta: false,
        items: kotData.items
      });

      Alert.alert('🍳 KOT Sent to Kitchen', `Dispatched order for Table ${table.name || table.tableNumber}`);
      await fetchTables();
    } catch (err: any) {
      Alert.alert('KOT Error', err.message || 'Failed to dispatch KOT.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Restaurant Floor Plan & KOT</Text>
        <TouchableOpacity onPress={fetchTables} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tables}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOccupied = item.status === 'OCCUPIED' || item.status === 'KOT_SENT';
          return (
            <View style={[styles.tableCard, isOccupied ? styles.tableOccupied : styles.tableAvailable]}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableName}>{item.name || `Table ${item.tableNumber}`}</Text>
                <View style={[styles.badge, isOccupied ? styles.badgeOccupied : styles.badgeAvailable]}>
                  <Text style={styles.badgeText}>{item.status || 'AVAILABLE'}</Text>
                </View>
              </View>

              <Text style={styles.tableSeats}>{item.capacity || 4} Seats • {item.section || 'Main Hall'}</Text>

              <TouchableOpacity
                style={styles.kotActionBtn}
                onPress={() => handleSendKOT(item)}
              >
                <Text style={styles.kotActionText}>🍳 Send KOT</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No tables configured for this branch.</Text>
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
    padding: 8
  },
  tableCard: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5
  },
  tableAvailable: {
    borderColor: '#E2E8F0'
  },
  tableOccupied: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB'
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  tableName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeAvailable: {
    backgroundColor: '#ECFDF5'
  },
  badgeOccupied: {
    backgroundColor: '#FEF3C7'
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0F172A'
  },
  tableSeats: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 12
  },
  kotActionBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center'
  },
  kotActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
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
