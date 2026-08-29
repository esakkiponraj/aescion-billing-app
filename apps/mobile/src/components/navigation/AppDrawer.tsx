import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useMobileAuth } from '../../auth/authContext';
import { RoleType, BusinessType } from '@aescion/shared-types';

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const AppDrawer: React.FC<AppDrawerProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, activeBranch, activeRole, logout, isSuperAdmin } = useMobileAuth();

  const businessType = organization?.businessType || 'RETAIL';
  const roleType = activeRole?.roleType || 'CASHIER';
  const isOwner = roleType === RoleType.OWNER || isSuperAdmin;
  const isManager = roleType === RoleType.MANAGER;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/login');
  };

  // Build industry and role-aware menu groups matching Desktop Information Architecture
  const getMenuGroups = () => {
    const groups: {
      title: string;
      items: { label: string; icon: string; path: string; highlightPaths: string[] }[];
    }[] = [];

    if (businessType === 'WHOLESALE') {
      groups.push({
        title: 'WHOLESALE & DISTRIBUTION',
        items: [
          { label: 'Distribution Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
          { label: 'Sales Orders', icon: '📋', path: '/(workspace)/wholesale', highlightPaths: ['/wholesale'] },
          { label: 'Dispatch & Challans', icon: '🚚', path: '/(workspace)/wholesale', highlightPaths: ['/wholesale'] },
          { label: 'Products & Stock', icon: '📦', path: '/(workspace)/products', highlightPaths: ['/products'] }
        ]
      });

      groups.push({
        title: 'BILLING & DOCUMENTS',
        items: [
          { label: 'Quotations / Estimates', icon: '📑', path: '/(workspace)/quotations', highlightPaths: ['/quotations'] },
          { label: 'Invoices & Bills', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
          { label: 'Payments & Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] }
        ]
      });

      const managementItems: { label: string; icon: string; path: string; highlightPaths: string[] }[] = [
        { label: 'Customers & Credit', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] },
        { label: 'Suppliers & Purchases', icon: '🏭', path: '/(workspace)/suppliers', highlightPaths: ['/suppliers'] }
      ];

      if (isOwner || isManager) {
        managementItems.push(
          { label: 'Branch Outlets', icon: '🏢', path: '/(workspace)/branches', highlightPaths: ['/branches'] },
          { label: 'Team & Access', icon: '🛡️', path: '/(workspace)/team', highlightPaths: ['/team'] },
          { label: 'Reports & Audits', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] },
          { label: 'Settings & Tax', icon: '⚙️', path: '/(workspace)/settings', highlightPaths: ['/settings'] }
        );
      }

      groups.push({
        title: 'MANAGEMENT',
        items: managementItems
      });
    } else if (businessType === 'RESTAURANT') {
      if (roleType === RoleType.KITCHEN) {
        // Kitchen Minimal Menu
        groups.push({
          title: 'KITCHEN DISPLAY (KDS)',
          items: [
            { label: 'Kitchen KOT Screen', icon: '👨‍🍳', path: '/(workspace)/restaurant', highlightPaths: ['/restaurant'] }
          ]
        });
      } else if (roleType === RoleType.WAITER) {
        // Waiter Operational Menu
        groups.push({
          title: 'RESTAURANT OPERATIONS',
          items: [
            { label: 'Waiter Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
            { label: 'Tables & Dining', icon: '🍽️', path: '/(workspace)/restaurant', highlightPaths: ['/restaurant'] },
            { label: 'Menu & Recipes', icon: '🥘', path: '/(workspace)/products', highlightPaths: ['/products'] }
          ]
        });
      } else if (roleType === RoleType.ACCOUNTANT) {
        // Accountant Financial Menu
        groups.push({
          title: 'FINANCE OPERATIONS',
          items: [
            { label: 'Finance Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
            { label: 'Menu Catalog', icon: '🥘', path: '/(workspace)/products', highlightPaths: ['/products'] }
          ]
        });
        groups.push({
          title: 'BILLING & GUESTS',
          items: [
            { label: 'Bills & Invoices', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
            { label: 'Payments & Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] },
            { label: 'Quotations', icon: '📑', path: '/(workspace)/quotations', highlightPaths: ['/quotations'] }
          ]
        });
        groups.push({
          title: 'MANAGEMENT',
          items: [
            { label: 'Guest Roster', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] },
            { label: 'Suppliers & Purchases', icon: '🏭', path: '/(workspace)/suppliers', highlightPaths: ['/suppliers'] },
            { label: 'Reports & Audits', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] }
          ]
        });
      } else if (roleType === RoleType.INVENTORY_STAFF) {
        // Inventory Staff Menu
        groups.push({
          title: 'INVENTORY OPERATIONS',
          items: [
            { label: 'Inventory Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
            { label: 'Menu & Stock', icon: '🥘', path: '/(workspace)/products', highlightPaths: ['/products'] }
          ]
        });
        groups.push({
          title: 'MANAGEMENT',
          items: [
            { label: 'Suppliers & Purchases', icon: '🏭', path: '/(workspace)/suppliers', highlightPaths: ['/suppliers'] },
            { label: 'Stock Reports', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] }
          ]
        });
      } else if (roleType === RoleType.CASHIER) {
        // Cashier Operational Menu
        groups.push({
          title: 'RESTAURANT OPERATIONS',
          items: [
            { label: 'Cashier Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
            { label: 'Tables & Dining', icon: '🍽️', path: '/(workspace)/restaurant', highlightPaths: ['/restaurant'] },
            { label: 'Fast Billing POS', icon: '⚡', path: '/(workspace)/pos', highlightPaths: ['/pos'] },
            { label: 'Menu & Recipes', icon: '🥘', path: '/(workspace)/products', highlightPaths: ['/products'] }
          ]
        });
        groups.push({
          title: 'BILLING & GUESTS',
          items: [
            { label: 'Bills & Invoices', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
            { label: 'Payments & Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] },
            { label: 'Guest Roster', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] }
          ]
        });
      } else {
        // Owner and Manager
        const isOwnerRole = roleType === RoleType.OWNER || isSuperAdmin;
        groups.push({
          title: 'RESTAURANT / CAFE OPERATIONS',
          items: [
            { label: 'Restaurant Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
            { label: 'Floor & Tables', icon: '🍽️', path: '/(workspace)/restaurant', highlightPaths: ['/restaurant'] },
            { label: 'Kitchen KOT Screen', icon: '👨‍🍳', path: '/(workspace)/restaurant', highlightPaths: ['/restaurant'] },
            { label: 'Fast Billing (POS)', icon: '⚡', path: '/(workspace)/pos', highlightPaths: ['/pos'] }
          ]
        });
        groups.push({
          title: 'BILLING & DOCUMENTS',
          items: [
            { label: 'Invoices & Bills', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
            { label: 'Payments & Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] }
          ]
        });
        const mgmtItems = [
          { label: 'Customers & Credit', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] },
          { label: 'Suppliers & Purchases', icon: '🏭', path: '/(workspace)/suppliers', highlightPaths: ['/suppliers'] },
          { label: 'Team & Access', icon: '🛡️', path: '/(workspace)/team', highlightPaths: ['/team'] },
          { label: 'Outlets & Branches', icon: '🏢', path: '/(workspace)/branches', highlightPaths: ['/branches'] },
          { label: 'Reports & Audits', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] }
        ];
        if (isOwnerRole) {
          mgmtItems.push({ label: 'Settings & Tax', icon: '⚙️', path: '/(workspace)/settings', highlightPaths: ['/settings'] });
        }
        groups.push({
          title: 'MANAGEMENT',
          items: mgmtItems
        });
      }
    } else if (businessType === 'SERVICE') {
      groups.push({
        title: 'SERVICE CENTER OPERATIONS',
        items: [
          { label: 'Service Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
          { label: 'Job Cards & Repairs', icon: '🔧', path: '/(workspace)/service', highlightPaths: ['/service'] },
          { label: 'Quick POS Checkout', icon: '⚡', path: '/(workspace)/pos', highlightPaths: ['/pos'] },
          { label: 'Spares & Labor Catalog', icon: '📦', path: '/(workspace)/products', highlightPaths: ['/products'] }
        ]
      });

      groups.push({
        title: 'BILLING & CLIENTS',
        items: [
          { label: 'Repair Invoices', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
          { label: 'Estimates / Quotes', icon: '📑', path: '/(workspace)/quotations', highlightPaths: ['/quotations'] },
          { label: 'Payment Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] },
          { label: 'Clients & Devices', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] }
        ]
      });

      if (isOwner || isManager) {
        groups.push({
          title: 'MANAGEMENT',
          items: [
            { label: 'Branch Outlets', icon: '🏢', path: '/(workspace)/branches', highlightPaths: ['/branches'] },
            { label: 'Technicians & Team', icon: '🛡️', path: '/(workspace)/team', highlightPaths: ['/team'] },
            { label: 'Reports & Audits', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] },
            { label: 'Settings & Tax', icon: '⚙️', path: '/(workspace)/settings', highlightPaths: ['/settings'] }
          ]
        });
      }
    } else if (businessType === 'PHARMACY') {
      groups.push({
        title: 'PHARMACY & HEALTHCARE',
        items: [
          { label: 'Pharmacy Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
          { label: 'Medicines & Batches', icon: '💊', path: '/(workspace)/pharmacy', highlightPaths: ['/pharmacy'] },
          { label: 'Counter POS', icon: '⚡', path: '/(workspace)/pos', highlightPaths: ['/pos'] },
          { label: 'Products & Stock', icon: '📦', path: '/(workspace)/products', highlightPaths: ['/products'] }
        ]
      });

      groups.push({
        title: 'BILLING & PATIENTS',
        items: [
          { label: 'Prescription Invoices', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
          { label: 'Payments & Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] },
          { label: 'Quotations', icon: '📑', path: '/(workspace)/quotations', highlightPaths: ['/quotations'] },
          { label: 'Patients & Doctors', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] },
          { label: 'Pharma Suppliers', icon: '🏭', path: '/(workspace)/suppliers', highlightPaths: ['/suppliers'] }
        ]
      });

      if (isOwner || isManager) {
        groups.push({
          title: 'MANAGEMENT',
          items: [
            { label: 'Branch Outlets', icon: '🏢', path: '/(workspace)/branches', highlightPaths: ['/branches'] },
            { label: 'Team & Staff', icon: '🛡️', path: '/(workspace)/team', highlightPaths: ['/team'] },
            { label: 'Reports & Audits', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] },
            { label: 'Settings & Tax', icon: '⚙️', path: '/(workspace)/settings', highlightPaths: ['/settings'] }
          ]
        });
      }
    } else {
      // Retail / Supermarket / General
      groups.push({
        title: 'STORE & POS OPERATIONS',
        items: [
          { label: 'Store Pulse', icon: '📊', path: '/(workspace)/dashboard', highlightPaths: ['/dashboard'] },
          { label: 'Express POS Checkout', icon: '⚡', path: '/(workspace)/pos', highlightPaths: ['/pos'] },
          { label: 'Products & Inventory', icon: '📦', path: '/(workspace)/products', highlightPaths: ['/products'] },
          { label: 'Cashier Shift', icon: '⏱️', path: '/(workspace)/shifts', highlightPaths: ['/shifts'] }
        ]
      });

      groups.push({
        title: 'BILLING & DOCUMENTS',
        items: [
          { label: 'Invoices & Bills', icon: '🧾', path: '/(workspace)/billing', highlightPaths: ['/billing'] },
          { label: 'Quotations / Estimates', icon: '📑', path: '/(workspace)/quotations', highlightPaths: ['/quotations'] },
          { label: 'Payments & Receipts', icon: '💳', path: '/(workspace)/receipts', highlightPaths: ['/receipts'] }
        ]
      });

      const mgmt: { label: string; icon: string; path: string; highlightPaths: string[] }[] = [
        { label: 'Customers & Credit', icon: '👥', path: '/(workspace)/customers', highlightPaths: ['/customers'] },
        { label: 'Suppliers & Purchases', icon: '🏭', path: '/(workspace)/suppliers', highlightPaths: ['/suppliers'] }
      ];

      if (isOwner || isManager) {
        mgmt.push(
          { label: 'Branch Outlets', icon: '🏢', path: '/(workspace)/branches', highlightPaths: ['/branches'] },
          { label: 'Team & Staff', icon: '🛡️', path: '/(workspace)/team', highlightPaths: ['/team'] },
          { label: 'Reports & Audits', icon: '📈', path: '/(workspace)/reports', highlightPaths: ['/reports'] },
          { label: 'Settings & Tax', icon: '⚙️', path: '/(workspace)/settings', highlightPaths: ['/settings'] }
        );
      }

      groups.push({
        title: 'MANAGEMENT',
        items: mgmt
      });
    }

    return groups;
  };

  const menuGroups = getMenuGroups();
  const companyName = organization?.name || 'AESCION Business';
  const ownerName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || 'Owner');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Body */}
        <SafeAreaView style={styles.drawerContainer}>
          {/* Header matching Desktop Screenshot */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>
                  {companyName.substring(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={styles.businessMeta}>
                <Text style={styles.ownerNameText} numberOfLines={1}>
                  {ownerName}
                </Text>
                <Text style={styles.companyNameText} numberOfLines={1}>
                  {companyName}
                </Text>
                <View style={styles.industryBadge}>
                  <Text style={styles.industryBadgeText}>
                    {businessType.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.branchRoleRow}>
              <Text style={styles.branchText} numberOfLines={1}>
                📍 {activeBranch?.name || 'Main Branch'}
              </Text>
              <Text style={styles.roleBadge}>
                {roleType}
              </Text>
            </View>
          </View>

          {/* Grouped Feature Menus */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {menuGroups.map((group, groupIdx) => (
              <View key={groupIdx} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{group.title}</Text>

                <View style={styles.groupItems}>
                  {group.items.map((item, itemIdx) => {
                    const isActive = item.highlightPaths.some((p) => pathname.includes(p));

                    return (
                      <TouchableOpacity
                        key={itemIdx}
                        onPress={() => navigateTo(item.path)}
                        activeOpacity={0.7}
                        style={[styles.menuItem, isActive && styles.menuItemActive]}
                      >
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                          {item.label}
                        </Text>
                        {isActive && <View style={styles.activeIndicator} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Drawer Footer / Logout */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.8}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Sign Out of {organization?.name || 'Account'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const drawerWidth = Math.min(340, width * 0.84);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flexDirection: 'row'
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  drawerContainer: {
    width: drawerWidth,
    height: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0'
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  businessMeta: {
    flex: 1,
    marginLeft: 12
  },
  ownerNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  companyNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1
  },
  industryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 4
  },
  industryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.5
  },
  branchRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7'
  },
  branchText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    flex: 1
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  menuScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  menuScrollContent: {
    paddingVertical: 12
  },
  groupContainer: {
    marginBottom: 14
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    paddingHorizontal: 18,
    marginBottom: 6
  },
  groupItems: {
    paddingHorizontal: 10
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2
  },
  menuItemActive: {
    backgroundColor: '#EFF6FF'
  },
  menuIcon: {
    fontSize: 16,
    width: 28,
    textAlign: 'center'
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
    flex: 1
  },
  menuLabelActive: {
    color: '#2563EB',
    fontWeight: '700'
  },
  activeIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#2563EB'
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10
  },
  logoutIcon: {
    fontSize: 14,
    marginRight: 6
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626'
  }
});
