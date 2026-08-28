import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Zap,
  Store,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
  Wrench,
  Pill,
  ShieldCheck,
  Smartphone,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronRight,
  UserPlus
} from 'lucide-react-native';

export const MobileLandingScreen: React.FC = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Top Announcement Bar */}
      <View style={styles.announcementBar}>
        <View style={styles.versionBadge}>
          <Text style={styles.versionBadgeText}>v2.0</Text>
        </View>
        <Text style={styles.announcementText} numberOfLines={1}>
          Enterprise Mobile POS & 6 Industry Feature Packs
        </Text>
        <TouchableOpacity onPress={handleGetStarted} style={styles.announcementLink}>
          <Text style={styles.announcementLinkText}>Start Free</Text>
          <ChevronRight size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Top Header Navigation */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <View>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitleBold}>AESCION</Text>
              <Text style={styles.brandTitleAccent}>Commerce</Text>
            </View>
            <Text style={styles.brandTagline}>ENTERPRISE BUSINESS OS</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerSignInBtn} onPress={handleSignIn}>
          <Text style={styles.headerSignInText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Sparkles size={13} color="#2563EB" />
            <Text style={styles.heroBadgeText}>Multi-Tenant • 6 Business Types</Text>
          </View>

          <Text style={styles.heroTitle}>
            Run Your Business Faster with{' '}
            <Text style={styles.heroTitleHighlight}>AESCION Commerce</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Billing, inventory, customers, purchases, employees, and industry-specific operations across counter desktop and mobile POS terminals.
          </Text>

          {/* Hero CTAs */}
          <View style={styles.heroCtaContainer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGetStarted} activeOpacity={0.85}>
              <UserPlus size={16} color="#FFFFFF" style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Get Started / Register Owner</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignIn} activeOpacity={0.85}>
              <Lock size={15} color="#334155" style={styles.btnIcon} />
              <Text style={styles.secondaryBtnText}>Sign In to Existing Workspace</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Live Workspace Status Pill */}
        <View style={styles.liveStatusCard}>
          <View style={styles.liveStatusLeft}>
            <View style={styles.liveIndicatorDot} />
            <View>
              <Text style={styles.liveStatusTitle}>Enterprise POS Engine</Text>
              <Text style={styles.liveStatusDesc}>Real-time Socket.IO sync & SQLite outbox</Text>
            </View>
          </View>
          <View style={styles.liveStatusBadge}>
            <Text style={styles.liveStatusBadgeText}>Live</Text>
          </View>
        </View>

        {/* 5. Core POS & Platform Pillars */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionOverline}>BUILT FOR SPEED & RELIABILITY</Text>
          <Text style={styles.sectionTitle}>Enterprise POS Core</Text>
        </View>

        <View style={styles.featuresList}>
          {/* Feature 1 */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconBox}>
              <Zap size={20} color="#2563EB" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>High-Speed POS Billing</Text>
              <Text style={styles.featureDesc}>
                Instant barcode scan, quantity adjust, multi-tender payment (Cash, UPI with dynamic QR, Card, Split, Credit), and 58mm/80mm thermal receipts.
              </Text>
            </View>
          </View>

          {/* Feature 2 */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconBox}>
              <Database size={20} color="#2563EB" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Authoritative Stock Ledger</Text>
              <Text style={styles.featureDesc}>
                Every sale, purchase GRN, return, adjustment, damage, or transfer writes an immutable stock audit event. Never rely on mutable counters.
              </Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconBox}>
              <ShieldCheck size={20} color="#2563EB" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Multi-Tenant Isolation & RBAC</Text>
              <Text style={styles.featureDesc}>
                Complete backend data separation by organization and branch. Strict roles (Owner, Manager, Cashier, Technician) with full audit history.
              </Text>
            </View>
          </View>
        </View>

        {/* 6. The 6 Industry Feature Packs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionOverline}>TAILORED INDUSTRY WORKFLOWS</Text>
          <Text style={styles.sectionTitle}>6 Industry Feature Packs</Text>
        </View>

        <View style={styles.industryGrid}>
          {/* Industry 1: Retail */}
          <View style={styles.industryCard}>
            <View style={[styles.industryIconBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Store size={18} color="#2563EB" />
            </View>
            <Text style={styles.industryTitle}>Retail POS</Text>
            <Text style={styles.industryDesc}>Barcode billing, customer credit, quotations, sales returns & payments.</Text>
          </View>

          {/* Industry 2: Supermarket */}
          <View style={styles.industryCard}>
            <View style={[styles.industryIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <ShoppingCart size={18} color="#047857" />
            </View>
            <Text style={styles.industryTitle}>Supermarket</Text>
            <Text style={styles.industryDesc}>Cashier shifts, opening floats, cash reconciliation & multi-counter registers.</Text>
          </View>

          {/* Industry 3: Wholesale */}
          <View style={styles.industryCard}>
            <View style={[styles.industryIconBox, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <Truck size={18} color="#7C3AED" />
            </View>
            <Text style={styles.industryTitle}>Wholesale B2B</Text>
            <Text style={styles.industryDesc}>Bulk pricing, credit limits, sales orders & official delivery challans.</Text>
          </View>

          {/* Industry 4: Restaurant */}
          <View style={styles.industryCard}>
            <View style={[styles.industryIconBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <UtensilsCrossed size={18} color="#EA580C" />
            </View>
            <Text style={styles.industryTitle}>Restaurant</Text>
            <Text style={styles.industryDesc}>Table floor plan, order management, multi-stage kitchen KOTs & KDS.</Text>
          </View>

          {/* Industry 5: Service */}
          <View style={styles.industryCard}>
            <View style={[styles.industryIconBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Wrench size={18} color="#16A34A" />
            </View>
            <Text style={styles.industryTitle}>Service / Repair</Text>
            <Text style={styles.industryDesc}>Asset intake, serial tracking, technician job cards & repair estimates.</Text>
          </View>

          {/* Industry 6: Pharmacy */}
          <View style={styles.industryCard}>
            <View style={[styles.industryIconBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Pill size={18} color="#DC2626" />
            </View>
            <Text style={styles.industryTitle}>Pharmacy</Text>
            <Text style={styles.industryDesc}>Batch numbers, expiry alerts & backend block preventing expired sales.</Text>
          </View>
        </View>

        {/* 7. Offline Reliability Dark Card */}
        <View style={styles.offlineCard}>
          <View style={styles.offlineHeader}>
            <Smartphone size={16} color="#60A5FA" />
            <Text style={styles.offlineTagline}>OFFLINE RELIABILITY</Text>
          </View>
          <Text style={styles.offlineTitle}>Internet Down? Business Continues.</Text>
          <Text style={styles.offlineDesc}>
            When connectivity drops, mobile POS operates smoothly using SQLite cached products and queues offline invoices. Official sequence numbers sync safely upon reconnect.
          </Text>

          <View style={styles.offlineStatsRow}>
            <View style={styles.offlineStatBox}>
              <Text style={styles.offlineStatVal}>3 Days</Text>
              <Text style={styles.offlineStatLabel}>Authorized Offline</Text>
            </View>
            <View style={styles.offlineStatBox}>
              <Text style={[styles.offlineStatVal, { color: '#60A5FA' }]}>Zero Duplicates</Text>
              <Text style={styles.offlineStatLabel}>Idempotent Sync</Text>
            </View>
          </View>

          <View style={styles.offlineFeatureList}>
            <View style={styles.offlineFeatureItem}>
              <CheckCircle2 size={15} color="#10B981" style={styles.checkIcon} />
              <Text style={styles.offlineFeatureText}>Local SQLite outbox queue with auto-retry</Text>
            </View>
            <View style={styles.offlineFeatureItem}>
              <CheckCircle2 size={15} color="#10B981" style={styles.checkIcon} />
              <Text style={styles.offlineFeatureText}>Hardware ESC/POS 58mm/80mm thermal printing</Text>
            </View>
          </View>
        </View>

        {/* 8. Bottom CTA Banner */}
        <View style={styles.bottomCtaCard}>
          <Text style={styles.bottomCtaTitle}>Ready to accelerate your business?</Text>
          <Text style={styles.bottomCtaSubtitle}>
            Launch your sales counter on mobile in seconds with AESCION Commerce.
          </Text>

          <TouchableOpacity style={styles.bottomCtaBtn} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={styles.bottomCtaBtnText}>Create Owner Account</Text>
            <ArrowRight size={16} color="#1E40AF" />
          </TouchableOpacity>
        </View>

        {/* 9. Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBrandRow}>
            <Zap size={14} color="#2563EB" fill="#2563EB" />
            <Text style={styles.footerBrandText}>AESCION Commerce</Text>
          </View>
          <Text style={styles.footerDesc}>
            Production-grade Business Operating System & Mobile POS
          </Text>
          <Text style={styles.footerCopyright}>
            © 2026 AESCION Systems. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  announcementBar: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1D4ED8'
  },
  versionBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6
  },
  versionBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  announcementText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    flex: 1
  },
  announcementLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6
  },
  announcementLinkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandTitleBold: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5
  },
  brandTitleAccent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563EB',
    marginLeft: 3
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: -2
  },
  headerSignInBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  headerSignInText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F7F9FC'
  },
  scrollContent: {
    paddingBottom: 40
  },
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    marginLeft: 6
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5
  },
  heroTitleHighlight: {
    color: '#2563EB'
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 6
  },
  heroCtaContainer: {
    width: '100%',
    marginTop: 20,
    gap: 10
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 6
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700'
  },
  btnIcon: {
    marginRight: 6
  },
  liveStatusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  liveStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  liveIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 10
  },
  liveStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  liveStatusDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  liveStatusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  liveStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857'
  },
  sectionHeader: {
    paddingHorizontal: 18,
    marginTop: 28,
    marginBottom: 12
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2
  },
  featuresList: {
    paddingHorizontal: 16,
    gap: 10
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row'
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  featureContent: {
    flex: 1
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  featureDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18
  },
  industryGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10
  },
  industryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  industryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  industryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  industryDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15
  },
  offlineCard: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  offlineTagline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 1,
    marginLeft: 6
  },
  offlineTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8
  },
  offlineDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16
  },
  offlineStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  offlineStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  offlineStatVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981'
  },
  offlineStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2
  },
  offlineFeatureList: {
    gap: 8
  },
  offlineFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkIcon: {
    marginRight: 8
  },
  offlineFeatureText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
    flex: 1
  },
  bottomCtaCard: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: '#1E40AF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center'
  },
  bottomCtaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  bottomCtaSubtitle: {
    fontSize: 12,
    color: '#DBEAFE',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18
  },
  bottomCtaBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  bottomCtaBtnText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8
  },
  footer: {
    marginTop: 36,
    paddingHorizontal: 18,
    alignItems: 'center'
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  footerBrandText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6
  },
  footerDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4
  },
  footerCopyright: {
    fontSize: 10,
    color: '#94A3B8'
  }
});
