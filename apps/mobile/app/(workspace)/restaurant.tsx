import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MobileApiClient } from '../../src/api/mobileApiClient';
import { defaultPrinter } from '../../src/hardware/printerAdapter';
import { useMobileAuth } from '../../src/auth/authContext';
import { KitchenStatus, RestaurantTableStatus, PaymentMethod } from '@aescion/shared-types';

export default function MobileRestaurantScreen() {
  const { activeRole, isSuperAdmin } = useMobileAuth();
  const isKitchen = activeRole?.roleType === 'KITCHEN';
  const isWaiter = activeRole?.roleType === 'WAITER';
  const canSettle = activeRole?.roleType === 'OWNER' || activeRole?.roleType === 'MANAGER' || activeRole?.roleType === 'CASHIER' || isSuperAdmin;
  const canManageTables = activeRole?.roleType === 'OWNER' || activeRole?.roleType === 'MANAGER' || isSuperAdmin;

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'FLOOR' | 'KDS' | 'TAKEAWAY'>(isKitchen ? 'KDS' : 'FLOOR');
  const [kdsStatusFilter, setKdsStatusFilter] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Data
  const [tables, setTables] = useState<any[]>([]);
  const [kots, setKots] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);

  // Dine-In Order State
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('ALL');

  // Settlement State
  const [billSummary, setBillSummary] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isSettling, setIsSettling] = useState(false);

  // New Table State
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableSection, setNewTableSection] = useState('Ground Floor');

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [tablesData, kotsData, productsData, resData] = await Promise.all([
        MobileApiClient.get<any[]>('/restaurant/tables').catch(() => []),
        MobileApiClient.get<any[]>('/restaurant/kots').catch(() => []),
        MobileApiClient.get<any[]>('/products').catch(() => []),
        MobileApiClient.get<any[]>('/restaurant/reservations').catch(() => [])
      ]);

      setTables(tablesData || []);
      setKots(kotsData || []);
      setMenuItems(productsData || []);
      setReservations(resData || []);
    } catch (err: any) {
      console.warn('Failed to fetch restaurant data:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ------------------------------------------
  // ORDER & KOT ACTIONS
  // ------------------------------------------

  const handleOpenTableOrder = (table: any) => {
    setSelectedTable(table);
    setOrderItems([]);
    setMenuSearchQuery('');
    setSelectedMenuCategory('ALL');
    setIsOrderModalOpen(true);
  };

  const handleAddItemToCart = (item: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => (i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice: Number(item.sellingPrice) || 0,
          quantity: 1,
          notes: ''
        }
      ];
    });
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleDispatchKOT = async () => {
    if (orderItems.length === 0) return;
    try {
      const kotPayload = {
        tableId: selectedTable?.id,
        tableNumber: selectedTable ? selectedTable.tableNumber : 'TAKEAWAY',
        orderType: selectedTable ? 'DINE_IN' : 'TAKEAWAY',
        items: orderItems
      };

      const res = await MobileApiClient.post<any>('/restaurant/kots', kotPayload);

      // Print KOT via ESC/POS adapter
      defaultPrinter.printKOT({
        kotNumber: res.kotNumber || `KOT-${Date.now().toString().slice(-4)}`,
        tableNumber: selectedTable ? `Table ${selectedTable.tableNumber}` : 'Takeaway',
        floorSection: selectedTable?.section || 'Ground Floor',
        timestamp: new Date().toLocaleTimeString(),
        isDelta: false,
        items: orderItems.map((i) => ({ name: i.name, quantity: i.quantity }))
      });

      Alert.alert('✅ KOT Dispatched', `Ticket #${res.kotNumber || ''} sent to Kitchen`);
      setIsOrderModalOpen(false);
      setOrderItems([]);
      fetchAllData();
    } catch (err: any) {
      Alert.alert('KOT Error', err.message || 'Failed to dispatch KOT.');
    }
  };

  // ------------------------------------------
  // KITCHEN KDS ACTIONS
  // ------------------------------------------

  const handleUpdateKOTStatus = async (kotId: string, status: KitchenStatus) => {
    try {
      await MobileApiClient.put(`/restaurant/kots/${kotId}/status`, { status });
      fetchAllData();
    } catch (err: any) {
      Alert.alert('KDS Error', err.message || 'Failed to update ticket status.');
    }
  };

  // ------------------------------------------
  // TABLE SETTLEMENT ACTIONS
  // ------------------------------------------

  const handleOpenSettleModal = async (table: any) => {
    setSelectedTable(table);
    try {
      const summary = await MobileApiClient.get<any>(`/restaurant/tables/${table.id}/bill-summary`);
      setBillSummary(summary);
      setIsSettleModalOpen(true);
    } catch (err: any) {
      Alert.alert('Bill Error', err.message || 'Failed to fetch table bill summary.');
    }
  };

  const handleSettleTable = async () => {
    if (!selectedTable || !billSummary) return;
    setIsSettling(true);
    try {
      const res = await MobileApiClient.post<any>(`/restaurant/tables/${selectedTable.id}/settle`, {
        paymentMethod
      });

      // Print official customer receipt
      defaultPrinter.printReceipt({
        companyName: 'AESCION Restaurant',
        branchName: selectedTable?.section || 'Main Outlet',
        invoiceNumber: res.invoice?.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
        date: new Date().toLocaleDateString(),
        customerName: `Table ${selectedTable.tableNumber} Guest`,
        items: billSummary.items?.map((it: any) => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: 5,
          total: it.quantity * it.unitPrice
        })) || [],
        subtotal: billSummary.subtotal,
        taxTotal: billSummary.taxAmount,
        grandTotal: billSummary.grandTotal,
        paymentMethod,
        cashierName: 'Staff'
      });

      Alert.alert('🎉 Table Settled', `Bill ₹${billSummary.grandTotal} settled. Table is now Available.`);
      setIsSettleModalOpen(false);
      setBillSummary(null);
      fetchAllData();
    } catch (err: any) {
      Alert.alert('Settlement Error', err.message || 'Failed to settle table.');
    } finally {
      setIsSettling(false);
    }
  };

  // ------------------------------------------
  // CREATE TABLE
  // ------------------------------------------

  const handleCreateTable = async () => {
    if (!newTableNumber.trim()) {
      Alert.alert('Validation', 'Table number is required.');
      return;
    }
    try {
      await MobileApiClient.post('/restaurant/tables', {
        tableNumber: newTableNumber.trim(),
        capacity: Number(newTableCapacity) || 4,
        section: newTableSection.trim() || 'Ground Floor'
      });
      setIsAddTableModalOpen(false);
      setNewTableNumber('');
      Alert.alert('Success', `Table ${newTableNumber} created.`);
      fetchAllData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create table.');
    }
  };

  // ------------------------------------------
  // FILTERS
  // ------------------------------------------

  const sections = ['ALL', ...Array.from(new Set(tables.map((t) => t.section || 'Ground Floor')))];
  const menuCategories = ['ALL', ...Array.from(new Set(menuItems.map((m) => m.category || 'General')))];

  const filteredTables = tables.filter((t) => {
    if (selectedSection === 'ALL') return true;
    return t.section === selectedSection;
  });

  const activeKots = kots.filter((k) => k.status !== KitchenStatus.SERVED && k.status !== KitchenStatus.CANCELLED);
  const filteredKots = kdsStatusFilter === 'ALL' ? activeKots : activeKots.filter((k) => k.status === kdsStatusFilter);

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedMenuCategory === 'ALL' || item.category === selectedMenuCategory;
    const matchesSearch = item.name?.toLowerCase().includes(menuSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = orderItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Restaurant & Cafe Operations</Text>
          <Text style={styles.headerSubtitle}>Floor Plan • Kitchen KDS • Takeaway</Text>
        </View>
        <TouchableOpacity onPress={fetchAllData} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Top Segmented Navigation */}
      {!isKitchen && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('FLOOR')}
            style={[styles.tabBtn, activeTab === 'FLOOR' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'FLOOR' && styles.tabBtnTextActive]}>
              🍽️ Floor ({tables.length})
            </Text>
          </TouchableOpacity>

          {!isWaiter && (
            <TouchableOpacity
              onPress={() => setActiveTab('KDS')}
              style={[styles.tabBtn, activeTab === 'KDS' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'KDS' && styles.tabBtnTextActive]}>
                👨‍🍳 Kitchen KDS ({activeKots.length})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setActiveTab('TAKEAWAY')}
            style={[styles.tabBtn, activeTab === 'TAKEAWAY' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'TAKEAWAY' && styles.tabBtnTextActive]}>
              🥡 Takeaway
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: FLOOR & TABLES */}
      {/* ========================================================================= */}
      {activeTab === 'FLOOR' && (
        <View style={{ flex: 1 }}>
          {/* Section filter chips */}
          <View style={styles.chipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
              {sections.map((sec) => (
                <TouchableOpacity
                  key={sec}
                  onPress={() => setSelectedSection(sec)}
                  style={[styles.chip, selectedSection === sec && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedSection === sec && styles.chipTextActive]}>
                    {sec}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setIsAddTableModalOpen(true)}
                style={[styles.chip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
              >
                <Text style={[styles.chipText, { color: '#2563EB', fontWeight: '800' }]}>+ Add Table</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Tables Grid */}
          <FlatList
            data={filteredTables}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isAvail = item.status === RestaurantTableStatus.AVAILABLE;
              const isReady = item.status === RestaurantTableStatus.READY;
              const isOccupied = !isAvail;

              return (
                <View
                  style={[
                    styles.tableCard,
                    isAvail
                      ? styles.tableAvailable
                      : isReady
                      ? styles.tableReady
                      : styles.tableOccupied
                  ]}
                >
                  <View style={styles.tableHeader}>
                    <View>
                      <Text style={styles.tableName}>{item.tableNumber}</Text>
                      <Text style={styles.tableSection}>{item.section || 'Ground Floor'}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        isAvail
                          ? styles.badgeAvailable
                          : isReady
                          ? styles.badgeReady
                          : styles.badgeOccupied
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: isAvail ? '#047857' : isReady ? '#1D4ED8' : '#C2410C'
                          }
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.tableSeats}>Capacity: {item.capacity || 4} Pax</Text>

                  {isAvail ? (
                    <TouchableOpacity
                      style={styles.startOrderBtn}
                      onPress={() => handleOpenTableOrder(item)}
                    >
                      <Text style={styles.startOrderBtnText}>+ Start Order</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.occupiedActionsRow}>
                      <TouchableOpacity
                        style={styles.addKotBtn}
                        onPress={() => handleOpenTableOrder(item)}
                      >
                        <Text style={styles.addKotBtnText}>+ KOT</Text>
                      </TouchableOpacity>

                      {canSettle && (
                        <TouchableOpacity
                          style={styles.billBtn}
                          onPress={() => handleOpenSettleModal(item)}
                        >
                          <Text style={styles.billBtnText}>🧾 Bill</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No tables found in this section.</Text>
                <TouchableOpacity
                  onPress={() => setIsAddTableModalOpen(true)}
                  style={styles.emptyAddBtn}
                >
                  <Text style={styles.emptyAddBtnText}>+ Configure New Table</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KITCHEN KDS */}
      {/* ========================================================================= */}
      {activeTab === 'KDS' && (
        <View style={{ flex: 1 }}>
          {/* Status filter tabs */}
          <View style={styles.kdsFilterRow}>
            {['ALL', KitchenStatus.NEW, KitchenStatus.PREPARING, KitchenStatus.READY].map((st) => (
              <TouchableOpacity
                key={st}
                onPress={() => setKdsStatusFilter(st)}
                style={[styles.kdsFilterBtn, kdsStatusFilter === st && styles.kdsFilterBtnActive]}
              >
                <Text
                  style={[
                    styles.kdsFilterBtnText,
                    kdsStatusFilter === st && styles.kdsFilterBtnTextActive
                  ]}
                >
                  {st === 'ALL' ? 'All Active' : st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* KOT Tickets List */}
          <FlatList
            data={filteredKots}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isNew = item.status === KitchenStatus.NEW;
              const isPrep = item.status === KitchenStatus.PREPARING;
              const isReady = item.status === KitchenStatus.READY;
              const isTakeaway = item.tableNumber?.toUpperCase().includes('TKW') || item.tableNumber === 'TAKEAWAY';

              return (
                <View style={[styles.kotCard, isNew ? styles.kotNew : isPrep ? styles.kotPrep : styles.kotReady]}>
                  <View style={styles.kotHeader}>
                    <View>
                      <Text style={styles.kotTableText}>
                        {isTakeaway ? '🥡 Takeaway' : `Table ${item.tableNumber}`}
                      </Text>
                      <Text style={styles.kotNumberText}>#{item.kotNumber} • Server: {item.waiterName || 'Staff'}</Text>
                    </View>
                    <View style={styles.kotBadge}>
                      <Text style={styles.kotBadgeText}>{item.status}</Text>
                    </View>
                  </View>

                  {/* Items */}
                  <View style={styles.kotItemsBox}>
                    {item.items?.map((it: any, idx: number) => (
                      <View key={idx} style={styles.kotItemRow}>
                        <Text style={styles.kotItemName}>{it.name}</Text>
                        <Text style={styles.kotItemQty}>× {it.quantity}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action */}
                  <View style={styles.kotActionRow}>
                    {isNew && (
                      <TouchableOpacity
                        style={[styles.kdsActionBtn, { backgroundColor: '#EA580C' }]}
                        onPress={() => handleUpdateKOTStatus(item.id, KitchenStatus.PREPARING)}
                      >
                        <Text style={styles.kdsActionBtnText}>▶ Start Preparing</Text>
                      </TouchableOpacity>
                    )}
                    {isPrep && (
                      <TouchableOpacity
                        style={[styles.kdsActionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleUpdateKOTStatus(item.id, KitchenStatus.READY)}
                      >
                        <Text style={styles.kdsActionBtnText}>✓ Mark Ready to Serve</Text>
                      </TouchableOpacity>
                    )}
                    {isReady && (
                      <TouchableOpacity
                        style={[styles.kdsActionBtn, { backgroundColor: '#2563EB' }]}
                        onPress={() => handleUpdateKOTStatus(item.id, KitchenStatus.SERVED)}
                      >
                        <Text style={styles.kdsActionBtnText}>✓ Dispatched / Served</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No pending kitchen tickets.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TAKEAWAY & BOOKINGS */}
      {/* ========================================================================= */}
      {activeTab === 'TAKEAWAY' && (
        <View style={{ flex: 1, padding: 14 }}>
          <View style={styles.takeawayHeaderCard}>
            <Text style={styles.takeawayCardTitle}>🥡 Express Takeaway Order</Text>
            <Text style={styles.takeawayCardSub}>
              Direct kitchen dispatch & billing without assigning a dining table.
            </Text>
            <TouchableOpacity
              style={styles.takeawayOrderBtn}
              onPress={() => {
                setSelectedTable(null);
                setOrderItems([]);
                setIsOrderModalOpen(true);
              }}
            >
              <Text style={styles.takeawayOrderBtnText}>+ New Takeaway Order</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Upcoming Table Reservations</Text>
          <FlatList
            data={reservations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.resCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resName}>{item.customerName}</Text>
                  <Text style={styles.resSub}>
                    {item.guestCount} Guests • {item.reservationTime} • Table {item.tableNumber || 'Unassigned'}
                  </Text>
                </View>
                <View style={[styles.badge, styles.badgeReady]}>
                  <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>{item.status}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No upcoming table reservations.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DINE-IN / TAKEAWAY MENU ORDERING & KOT */}
      {/* ========================================================================= */}
      <Modal visible={isOrderModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedTable ? `Dine-In • Table ${selectedTable.tableNumber}` : '🥡 Takeaway Order'}
                </Text>
                <Text style={styles.modalSubtitle}>Select Menu Items to dispatch KOT</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOrderModalOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Menu Search & Category Chips */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu items..."
              value={menuSearchQuery}
              onChangeText={setMenuSearchQuery}
            />

            <View style={{ height: 36, marginBottom: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {menuCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedMenuCategory(cat)}
                    style={[styles.menuCatChip, selectedMenuCategory === cat && styles.menuCatChipActive]}
                  >
                    <Text
                      style={[
                        styles.menuCatChipText,
                        selectedMenuCategory === cat && styles.menuCatChipTextActive
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Menu Catalog List */}
            <View style={{ flex: 1 }}>
              <FlatList
                data={filteredMenuItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.menuItemCard}
                    onPress={() => handleAddItemToCart(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemCat}>{item.category || 'Food'}</Text>
                    </View>
                    <Text style={styles.menuItemPrice}>₹{item.sellingPrice}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Cart Preview & Send KOT */}
            <View style={styles.cartFooter}>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartItemsCount}>{orderItems.length} items selected</Text>
                <Text style={styles.cartTotalAmount}>Total: ₹{cartTotal}</Text>
              </View>

              <TouchableOpacity
                style={[styles.dispatchKotBtn, orderItems.length === 0 && { opacity: 0.5 }]}
                disabled={orderItems.length === 0}
                onPress={handleDispatchKOT}
              >
                <Text style={styles.dispatchKotBtnText}>👨‍🍳 Dispatch KOT to Kitchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: BILL & SETTLE TABLE */}
      {/* ========================================================================= */}
      <Modal visible={isSettleModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Bill & Settle • Table {selectedTable?.tableNumber}
                </Text>
                <Text style={styles.modalSubtitle}>Order: {billSummary?.activeOrderId}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSettleModalOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {billSummary && (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.billItemsBox}>
                  <Text style={styles.billSectionTitle}>Active KOT Line Items</Text>
                  {billSummary.items?.map((it: any, idx: number) => (
                    <View key={idx} style={styles.billItemRow}>
                      <Text style={styles.billItemName}>
                        {it.name} × <Text style={{ fontWeight: '800' }}>{it.quantity}</Text>
                      </Text>
                      <Text style={styles.billItemTotal}>₹{it.quantity * it.unitPrice}</Text>
                    </View>
                  ))}

                  <View style={styles.billTotalsDivider} />

                  <View style={styles.billTotalRow}>
                    <Text style={styles.billTotalLabel}>Subtotal</Text>
                    <Text style={styles.billTotalValue}>₹{billSummary.subtotal}</Text>
                  </View>
                  <View style={styles.billTotalRow}>
                    <Text style={styles.billTotalLabel}>GST (5%)</Text>
                    <Text style={styles.billTotalValue}>₹{billSummary.taxAmount}</Text>
                  </View>
                  <View style={[styles.billTotalRow, { marginTop: 6 }]}>
                    <Text style={[styles.billTotalLabel, { fontSize: 15, fontWeight: '900', color: '#0F172A' }]}>
                      Grand Total
                    </Text>
                    <Text style={[styles.billTotalValue, { fontSize: 16, fontWeight: '900', color: '#10B981' }]}>
                      ₹{billSummary.grandTotal}
                    </Text>
                  </View>
                </View>

                {/* Tender Selector */}
                <Text style={[styles.billSectionTitle, { marginTop: 16 }]}>Select Payment Mode</Text>
                <View style={styles.paymentModesRow}>
                  {[PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD].map((method) => (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setPaymentMethod(method)}
                      style={[
                        styles.paymentModeBtn,
                        paymentMethod === method && styles.paymentModeBtnActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentModeBtnText,
                          paymentMethod === method && styles.paymentModeBtnTextActive
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.settleConfirmBtn}
                  disabled={isSettling}
                  onPress={handleSettleTable}
                >
                  {isSettling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.settleConfirmBtnText}>
                      ✓ Collect ₹{billSummary.grandTotal} & Free Table
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD TABLE */}
      {/* ========================================================================= */}
      <Modal visible={isAddTableModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 380 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure New Dining Table</Text>
              <TouchableOpacity onPress={() => setIsAddTableModalOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <Text style={styles.inputLabel}>Table Number / Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. T1, T2, Outdoor-A"
                value={newTableNumber}
                onChangeText={setNewTableNumber}
              />

              <Text style={styles.inputLabel}>Capacity (Pax)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="4"
                keyboardType="numeric"
                value={newTableCapacity}
                onChangeText={setNewTableCapacity}
              />

              <Text style={styles.inputLabel}>Section / Floor</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ground Floor, AC Hall, Rooftop"
                value={newTableSection}
                onChangeText={setNewTableSection}
              />

              <TouchableOpacity style={styles.createTableBtn} onPress={handleCreateTable}>
                <Text style={styles.createTableBtnText}>Create Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC'
  },
  tabBtnActive: {
    backgroundColor: '#2563EB'
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B'
  },
  tabBtnTextActive: {
    color: '#FFFFFF'
  },
  chipsRow: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A'
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  chipTextActive: {
    color: '#FFFFFF'
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
    borderWidth: 1.5,
    justifyContent: 'space-between',
    minHeight: 145
  },
  tableAvailable: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5'
  },
  tableOccupied: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED'
  },
  tableReady: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF'
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  tableName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A'
  },
  tableSection: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  badgeAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  badgeOccupied: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA'
  },
  badgeReady: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE'
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  tableSeats: {
    fontSize: 10,
    color: '#64748B',
    marginVertical: 4
  },
  startOrderBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  startOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  occupiedActionsRow: {
    flexDirection: 'row',
    gap: 6
  },
  addKotBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center'
  },
  addKotBtnText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800'
  },
  billBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center'
  },
  billBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  // KDS Styles
  kdsFilterRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6
  },
  kdsFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  kdsFilterBtnActive: {
    backgroundColor: '#0F172A'
  },
  kdsFilterBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569'
  },
  kdsFilterBtnTextActive: {
    color: '#FFFFFF'
  },
  kotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5
  },
  kotNew: {
    borderColor: '#FED7AA'
  },
  kotPrep: {
    borderColor: '#FDE68A'
  },
  kotReady: {
    borderColor: '#A7F3D0'
  },
  kotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  kotTableText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  kotNumberText: {
    fontSize: 10,
    color: '#64748B'
  },
  kotBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  kotBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A'
  },
  kotItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10
  },
  kotItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  kotItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  kotItemQty: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB'
  },
  kotActionRow: {
    marginTop: 4
  },
  kdsActionBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  kdsActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  // Takeaway Card
  takeawayHeaderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  takeawayCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A'
  },
  takeawayCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12
  },
  takeawayOrderBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  takeawayOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8
  },
  resCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  resName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  resSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A'
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B'
  },
  closeBtn: {
    padding: 6
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8'
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8
  },
  menuCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 6
  },
  menuCatChipActive: {
    backgroundColor: '#2563EB'
  },
  menuCatChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569'
  },
  menuCatChipTextActive: {
    color: '#FFFFFF'
  },
  menuItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  menuItemCat: {
    fontSize: 10,
    color: '#94A3B8'
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A'
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 8
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  cartItemsCount: {
    fontSize: 12,
    color: '#64748B'
  },
  cartTotalAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A'
  },
  dispatchKotBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  dispatchKotBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900'
  },
  // Bill Summary
  billItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  billSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  billItemName: {
    fontSize: 12,
    color: '#0F172A'
  },
  billItemTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A'
  },
  billTotalsDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  billTotalLabel: {
    fontSize: 11,
    color: '#64748B'
  },
  billTotalValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A'
  },
  paymentModesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  paymentModeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center'
  },
  paymentModeBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB'
  },
  paymentModeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B'
  },
  paymentModeBtnTextActive: {
    color: '#2563EB'
  },
  settleConfirmBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20
  },
  settleConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900'
  },
  // Add Table Inputs
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12
  },
  createTableBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16
  },
  createTableBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
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
  },
  emptyAddBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  emptyAddBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB'
  }
});
