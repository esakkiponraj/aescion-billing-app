import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  subscribeSyncStatus,
  processSyncQueue,
  OfflineSyncStatus
} from '../../src/sync/syncEngine';
import { getLocalDatabase } from '../../src/database/sqlite';

export default function MobileSyncScreen() {
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus | null>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const loadQueue = async () => {
    try {
      const db = await getLocalDatabase();
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM sync_queue ORDER BY createdAt DESC LIMIT 50`
      );
      setQueueItems(rows || []);
    } catch (err) {
      console.warn('Failed to load sync queue:', err);
    }
  };

  useEffect(() => {
    const unsub = subscribeSyncStatus(setSyncStatus);
    loadQueue();
    return unsub;
  }, []);

  const handleSyncNow = async () => {
    setIsManualSyncing(true);
    try {
      const res = await processSyncQueue();
      Alert.alert(
        '🔄 Sync Completed',
        `Synced: ${res.synced}\nConflicts: ${res.conflicts}\nFailed: ${res.failed}`
      );
      await loadQueue();
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Sync failed.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, syncStatus?.pendingCount === 0 ? styles.dotGreen : styles.dotAmber]} />
          <Text style={styles.statusTitle}>
            {syncStatus?.isOnline ? 'Online Engine Connected' : 'Offline Mode Active'}
          </Text>
        </View>
        <Text style={styles.statusSubtitle}>
          Last Synced: {syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString() : 'Never'}
        </Text>

        <View style={styles.counterGrid}>
          <View style={styles.counterBox}>
            <Text style={styles.counterNum}>{syncStatus?.pendingCount || 0}</Text>
            <Text style={styles.counterLabel}>Pending</Text>
          </View>
          <View style={styles.counterBox}>
            <Text style={styles.counterNum}>{syncStatus?.conflictCount || 0}</Text>
            <Text style={styles.counterLabel}>Conflicts</Text>
          </View>
          <View style={styles.counterBox}>
            <Text style={styles.counterNum}>{syncStatus?.failedCount || 0}</Text>
            <Text style={styles.counterLabel}>Failed</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncBtn, isManualSyncing && styles.btnDisabled]}
          onPress={handleSyncNow}
          disabled={isManualSyncing}
        >
          {isManualSyncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.syncBtnText}>⚡ Force Sync Queue Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Queue Items List */}
      <View style={styles.queueSection}>
        <Text style={styles.sectionTitle}>Local Mutation Outbox (SQLite)</Text>
        <FlatList
          data={queueItems}
          keyExtractor={(item) => item.clientTransactionId}
          renderItem={({ item }) => (
            <View style={styles.queueItem}>
              <View style={styles.queueMain}>
                <Text style={styles.queueTxId}>{item.clientTransactionId}</Text>
                <Text style={styles.queueMeta}>
                  {item.entityType} • {item.operationType} • {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
                {item.lastError && (
                  <Text style={styles.queueError} numberOfLines={1}>
                    Err: {item.lastError}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === 'SYNCED'
                    ? styles.badgeSynced
                    : item.status === 'PENDING'
                    ? styles.badgePending
                    : styles.badgeFailed
                ]}
              >
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No pending mutations in local outbox.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  dotGreen: {
    backgroundColor: '#10B981'
  },
  dotAmber: {
    backgroundColor: '#F59E0B'
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A'
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12
  },
  counterGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  counterBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  counterNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A'
  },
  counterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2
  },
  syncBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  btnDisabled: {
    opacity: 0.6
  },
  queueSection: {
    flex: 1,
    padding: 14
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10
  },
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  queueMain: {
    flex: 1,
    marginRight: 10
  },
  queueTxId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace'
  },
  queueMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  queueError: {
    fontSize: 9,
    color: '#DC2626',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  badgeSynced: {
    backgroundColor: '#ECFDF5'
  },
  badgePending: {
    backgroundColor: '#FFFBEB'
  },
  badgeFailed: {
    backgroundColor: '#FEF2F2'
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E293B'
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 40
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600'
  }
});
