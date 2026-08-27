import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { useMobileAuth } from '../../src/auth/authContext';
import { defaultPrinter } from '../../src/hardware/printerAdapter';

export default function MobileBillingScreen() {
  const { organization, activeBranch } = useMobileAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.get<any[]>('/invoices');
      setInvoices(data || []);
    } catch (err: any) {
      console.warn('Failed to fetch invoices:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleReprint = (inv: any) => {
    defaultPrinter.printReceipt({
      companyName: organization?.name || 'AESCION Commerce',
      branchName: activeBranch?.name || 'Main Branch',
      invoiceNumber: inv.invoiceNumber,
      date: new Date(inv.createdAt).toLocaleString(),
      customerName: inv.customer?.name || 'Walk-in Customer',
      items: (inv.items || []).map((i: any) => ({
        name: i.product?.name || i.name || 'Item',
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
        total: Number(i.total)
      })),
      subtotal: Number(inv.subtotal),
      taxTotal: Number(inv.taxTotal),
      grandTotal: Number(inv.grandTotal),
      paymentMethod: inv.paymentMethod || 'CASH',
      cashierName: inv.cashierName || 'Staff'
    });
    Alert.alert('🖨️ Receipt Dispatched', `Sent invoice ${inv.invoiceNumber} to thermal printer.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Authoritative Invoices</Text>
        <TouchableOpacity onPress={fetchInvoices} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceMain}>
                <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                <Text style={styles.invoiceCustomer}>
                  {item.customer?.name || 'Walk-in Customer'} • {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
                <View style={[styles.statusTag, item.paymentStatus === 'PAID' ? styles.statusPaid : styles.statusPending]}>
                  <Text style={styles.statusTagText}>{item.paymentStatus}</Text>
                </View>
              </View>

              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>₹{Number(item.grandTotal).toLocaleString('en-IN')}</Text>
                <TouchableOpacity style={styles.printBtn} onPress={() => handleReprint(item)}>
                  <Text style={styles.printBtnText}>🖨️ Reprint</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No invoices recorded yet.</Text>
            </View>
          }
        />
      )}
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
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  },
  listContent: {
    padding: 12,
    paddingBottom: 30
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  invoiceMain: {
    flex: 1
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  invoiceCustomer: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6
  },
  statusPaid: {
    backgroundColor: '#ECFDF5'
  },
  statusPending: {
    backgroundColor: '#FFFBEB'
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  invoiceRight: {
    alignItems: 'flex-end',
    marginLeft: 12
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563EB'
  },
  printBtn: {
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  printBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569'
  }
});
