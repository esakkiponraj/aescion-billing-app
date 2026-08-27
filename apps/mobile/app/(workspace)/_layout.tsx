import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useMobileAuth } from '../../src/auth/authContext';

export default function WorkspaceLayout() {
  const { organization, activeBranch, activeRole } = useMobileAuth();

  const companyName = organization?.name || 'My Business';
  const branchName = activeBranch?.name || 'Main Branch';
  const roleName = activeRole?.name || 'Staff';

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 1,
          shadowOpacity: 0.05,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          height: 60
        },
        headerTitle: () => (
          <View style={styles.headerContainer}>
            <View style={styles.companyBadge}>
              <Text style={styles.companyBadgeText}>
                {companyName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {companyName}
              </Text>
              <Text style={styles.branchName} numberOfLines={1}>
                {branchName} • <Text style={styles.roleName}>{roleName}</Text>
              </Text>
            </View>
          </View>
        ),
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📊</Text>
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Fast POS',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚡</Text>
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📦</Text>
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🧾</Text>
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: 'Shift',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⏱️</Text>
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔄</Text>
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Outlet',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>
        }}
      />
      {/* Hidden Industry Screens available via navigation */}
      <Tabs.Screen name="restaurant" options={{ href: null, title: 'Tables & KOT' }} />
      <Tabs.Screen name="service" options={{ href: null, title: 'Job Cards' }} />
      <Tabs.Screen name="pharmacy" options={{ href: null, title: 'Batch Safety' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  companyBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  companyBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12
  },
  headerInfo: {
    justifyContent: 'center'
  },
  companyName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: 200
  },
  branchName: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  roleName: {
    color: '#2563EB',
    fontWeight: '700'
  }
});
