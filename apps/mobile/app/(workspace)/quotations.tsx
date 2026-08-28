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
import { useRouter } from 'expo-router';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { subscribeToRealtimeEvent } from '../../src/realtime/socket';

export default function QuotationsScreen() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    try {
      const data = await MobileApiClient.get<any[]>('/quotations');
      setQuotations(data || []);
    } catch (err) {
      console.warn('Failed to fetch quotations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
    const unsub = subscribeToRealtimeEvent('quotation_updated', () => fetchQuotations());
    return unsub;
  }, [fetchQuotations]);

  const handleConvertToInvoice = async (quote: any) => {
    Alert.alert(
      'Convert Quotation',
      `Convert Estimate ${quote.quotationNumber} (₹${quote.grandTotal.toLocaleString('en-IN')}) into a final Tax Invoice?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert & Bill',
          onPress: async () => {
            setConvertingId(quote.id);
            try {
              await MobileApiClient.post(`/quotations/${quote.id}/convert`, {});
              Alert.alert('Success', `Invoice generated from ${quote.quotationNumber}!`);
              fetchQuotations();
            } catch (err: any) {
              Alert.alert('Conversion Failed', err.message || 'Failed to convert quotation.');
            } finally {
              setConvertingId(null);
            }
          }
        }
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return { bg: '#ECFDF5', text: '#059669', label: 'Converted' };
      case 'ACCEPTED':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Accepted' };
      case 'SENT':
        return { bg: '#FFFBEB', text: '#D97706', label: 'Sent' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: 'Draft' };
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading quotations...</Text>
        </View>
      ) : (
        <FlatList
          data={quotations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchQuotations(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📄</Text>
              <Text style={styles.emptyTitle}>No Quotations Created</Text>
              <Text style={styles.emptyDesc}>Quotations generated from Desktop or POS will appear here for 1-tap conversion to invoice.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusInfo = getStatusStyle(item.status);
            const isConverting = convertingId === item.id;

            return (
              <View style={styles.quoteCard}>
                <View style={styles.quoteHeader}>
                  <View>
                    <Text style={styles.quoteNumber}>{item.quotationNumber}</Text>
                    <Text style={styles.customerName}>{item.customerName || 'Walk-in Customer'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.quoteBody}>
                  <Text style={styles.dateMeta}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
                  <Text style={styles.grandTotal}>₹{(item.grandTotal || 0).toLocaleString('en-IN')}</Text>
                </View>

                {item.status !== 'CONVERTED' && (
                  <TouchableOpacity
                    style={[styles.convertBtn, isConverting && styles.btnDisabled]}
                    onPress={() => handleConvertToInvoice(item)}
                    disabled={isConverting}
                  >
                    {isConverting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.convertBtnText}>⚡ Convert to Invoice</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
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
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  quoteNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  customerName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  quoteBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  dateMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A'
  },
  convertBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  btnDisabled: {
    opacity: 0.6
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});
