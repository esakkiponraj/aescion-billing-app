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

export default function MobileServiceScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.get<any[]>('/service-jobs');
      setJobs(data || []);
    } catch (err: any) {
      console.warn('Failed to fetch service jobs:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleUpdateStatus = async (jobId: string, nextStatus: string) => {
    try {
      await MobileApiClient.put(`/service-jobs/${jobId}/status`, { status: nextStatus });
      Alert.alert('✅ Status Updated', `Job marked as ${nextStatus}`);
      await fetchJobs();
    } catch (err: any) {
      Alert.alert('Update Error', err.message || 'Failed to update job status.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Job Cards</Text>
        <TouchableOpacity onPress={fetchJobs} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobNumber}>{item.jobCardNumber || item.jobNumber || 'JOB-001'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status || 'RECEIVED'}</Text>
              </View>
            </View>

            <Text style={styles.deviceInfo}>
              📱 {item.assetType || 'Device'}: {item.brand} {item.model} (S/N: {item.serialNumber || 'N/A'})
            </Text>
            <Text style={styles.complaintText}>Issue: {item.complaint || 'Diagnostic inspection requested'}</Text>

            <View style={styles.actionRow}>
              {item.status !== 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
                >
                  <Text style={styles.actionBtnText}>Start Repair</Text>
                </TouchableOpacity>
              )}
              {item.status === 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnGreen]}
                  onPress={() => handleUpdateStatus(item.id, 'READY')}
                >
                  <Text style={styles.actionBtnText}>Mark Ready</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No repair job cards registered.</Text>
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
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  jobNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB'
  },
  deviceInfo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2
  },
  complaintText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 10
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionBtnGreen: {
    backgroundColor: '#10B981'
  },
  actionBtnText: {
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
