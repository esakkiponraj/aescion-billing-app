import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMobileAuth } from '../../src/auth/authContext';
import { AppDrawer } from '../../src/components/navigation/AppDrawer';

export default function WorkspaceLayout() {
  const { organization, activeBranch, activeRole } = useMobileAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const companyName = organization?.name || 'My Business';
  const branchName = activeBranch?.name || 'Main Branch';
  const roleName = activeRole?.name || 'Staff';

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            height: 60
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={styles.menuButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          ),
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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={styles.industryTag}
              activeOpacity={0.8}
            >
              <Text style={styles.industryTagText}>
                {organization?.businessType || 'RETAIL'}
              </Text>
            </TouchableOpacity>
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
          name="settings"
          options={{
            title: 'Hub / More',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>
          }}
        />

        {/* Hidden Screens accessible via Sidebar Drawer */}
        <Tabs.Screen name="branches" options={{ href: null, title: 'Branch Outlets' }} />
        <Tabs.Screen name="customers" options={{ href: null, title: 'Customers & Credit' }} />
        <Tabs.Screen name="quotations" options={{ href: null, title: 'Quotations & Estimates' }} />
        <Tabs.Screen name="receipts" options={{ href: null, title: 'Payment Receipts' }} />
        <Tabs.Screen name="suppliers" options={{ href: null, title: 'Suppliers & GRN' }} />
        <Tabs.Screen name="reports" options={{ href: null, title: 'Business Reports' }} />
        <Tabs.Screen name="team" options={{ href: null, title: 'Team & Staff' }} />
        <Tabs.Screen name="shifts" options={{ href: null, title: 'Cashier Shift' }} />
        <Tabs.Screen name="sync" options={{ href: null, title: 'Sync Center' }} />
        <Tabs.Screen name="wholesale" options={{ href: null, title: 'Wholesale B2B' }} />
        <Tabs.Screen name="restaurant" options={{ href: null, title: 'Tables & KOT' }} />
        <Tabs.Screen name="service" options={{ href: null, title: 'Job Cards' }} />
        <Tabs.Screen name="pharmacy" options={{ href: null, title: 'Batch Safety' }} />
        <Tabs.Screen name="super-admin" options={{ href: null, title: 'Super Admin OS' }} />
      </Tabs>

      {/* Slide-in Mobile Drawer */}
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    marginLeft: 12,
    marginRight: 6,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuIcon: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800'
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  companyBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  companyBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  headerInfo: {
    flexShrink: 1
  },
  companyName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  branchName: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1
  },
  roleName: {
    fontWeight: '700',
    color: '#2563EB'
  },
  industryTag: {
    marginRight: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  industryTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5
  }
});
