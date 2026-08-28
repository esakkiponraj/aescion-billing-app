import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Zap,
  ArrowLeft,
  ArrowRight,
  User,
  Building,
  Store,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
  Wrench,
  Pill,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Phone,
  Mail,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { BusinessType, TaxMode } from '@aescion/shared-types';
import { useMobileAuth } from '../src/auth/authContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { registerOwner } = useMobileAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State matching OnboardingInput schema
  const [formData, setFormData] = useState({
    owner: {
      firstName: '',
      lastName: '',
      mobileNumber: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    },
    businessType: BusinessType.SUPERMARKET as BusinessType,
    business: {
      name: '',
      legalName: '',
      phone: '',
      email: '',
      address: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: false,
      gstin: ''
    },
    branches: [
      {
        name: 'Main Branch Outlet',
        code: 'MAIN',
        address: '',
        city: 'Chennai',
        state: 'Tamil Nadu',
        phone: '',
        isMain: true
      }
    ],
    teamSetupMode: 'JUST_ME' as const,
    taxSettings: {
      taxMode: TaxMode.EXCLUSIVE,
      defaultRates: [0, 5, 12, 18, 28],
      enableCess: false,
      defaultCessRate: 0
    },
    billingSettings: {
      invoicePrefix: 'INV',
      quotationPrefix: 'QTN',
      receiptPrefix: 'RCP',
      enableRoundOff: true,
      defaultReceiptFormat: '80MM' as const,
      defaultTerms: 'Thank you for your business!'
    },
    industrySettings: {}
  });

  const validateStep = (step: number): boolean => {
    setErrorMessage(null);

    if (step === 1) {
      const { firstName, lastName, mobileNumber, email, username, password, confirmPassword } = formData.owner;
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMessage('First and last names are required.');
        return false;
      }
      if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
        setErrorMessage('Valid 10-digit mobile number is required.');
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Valid email address is required.');
        return false;
      }
      if (!username.trim() || username.trim().length < 3) {
        setErrorMessage('Username must be at least 3 characters.');
        return false;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.business.name.trim()) {
        setErrorMessage('Business / Company name is required.');
        return false;
      }
      if (!formData.business.city.trim() || !formData.business.state.trim()) {
        setErrorMessage('City and State are required.');
        return false;
      }
      if (formData.business.gstStatus && (!formData.business.gstin || formData.business.gstin.trim().length < 15)) {
        setErrorMessage('Please enter a valid 15-character GSTIN or disable GST status.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        // Auto-sync business contact details from owner if empty
        setFormData((prev) => ({
          ...prev,
          business: {
            ...prev.business,
            phone: prev.business.phone || prev.owner.mobileNumber,
            email: prev.business.email || prev.owner.email
          },
          branches: [
            {
              ...prev.branches[0],
              phone: prev.branches[0].phone || prev.owner.mobileNumber,
              city: prev.business.city,
              state: prev.business.state
            }
          ]
        }));
      }
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.replace('/login');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        ...formData,
        owner: {
          ...formData.owner,
          email: formData.owner.email.trim().toLowerCase(),
          username: formData.owner.username.trim().toLowerCase()
        },
        business: {
          ...formData.business,
          name: formData.business.name.trim(),
          legalName: formData.business.legalName?.trim() || formData.business.name.trim(),
          phone: formData.business.phone.trim() || formData.owner.mobileNumber.trim(),
          email: formData.business.email?.trim() || formData.owner.email.trim().toLowerCase()
        }
      };

      await registerOwner(payload);
      router.replace('/(workspace)/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create business account. Please verify details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Owner Account Details';
      case 2:
        return 'Business & Outlets';
      case 3:
        return 'Industry Feature Pack';
      case 4:
        return 'Review & Launch';
      default:
        return 'Owner Registration';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Navigation & Step Progress Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#2563EB" />
            <Text style={styles.backBtnText}>
              {currentStep === 1 ? 'Back to Login' : 'Previous Step'}
            </Text>
          </TouchableOpacity>

          <View style={styles.stepIndicatorBadge}>
            <Text style={styles.stepIndicatorText}>Step {currentStep} of 4</Text>
          </View>
        </View>

        {/* Step Progress Dots */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.progressBarSegment,
                step <= currentStep ? styles.progressBarActive : styles.progressBarInactive
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section Header */}
          <View style={styles.header}>
            <View style={styles.brandBadge}>
              <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.brandBadgeText}>AESCION ONBOARDING</Text>
            </View>
            <Text style={styles.headerTitle}>{getStepTitle()}</Text>
            <Text style={styles.headerSubtitle}>
              {currentStep === 1 && 'Create your master Owner profile with secure credentials.'}
              {currentStep === 2 && 'Enter company details, primary branch, and tax status.'}
              {currentStep === 3 && 'Tailor POS workflows, stock models, and billing features.'}
              {currentStep === 4 && 'Review your business settings and launch your workspace.'}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* =================================================== */}
          {/* STEP 1: OWNER DETAILS */}
          {/* =================================================== */}
          {currentStep === 1 && (
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rahul"
                    placeholderTextColor="#94A3B8"
                    value={formData.owner.firstName}
                    onChangeText={(val) =>
                      setFormData({ ...formData, owner: { ...formData.owner, firstName: val } })
                    }
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Sharma"
                    placeholderTextColor="#94A3B8"
                    value={formData.owner.lastName}
                    onChangeText={(val) =>
                      setFormData({ ...formData, owner: { ...formData.owner, lastName: val } })
                    }
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Phone size={13} color="#475569" style={styles.labelIcon} />
                  <Text style={styles.label}>Mobile Number *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={formData.owner.mobileNumber}
                  onChangeText={(val) =>
                    setFormData({ ...formData, owner: { ...formData.owner, mobileNumber: val } })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Mail size={13} color="#475569" style={styles.labelIcon} />
                  <Text style={styles.label}>Email Address *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="owner@mybusiness.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formData.owner.email}
                  onChangeText={(val) =>
                    setFormData({ ...formData, owner: { ...formData.owner, email: val } })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <User size={13} color="#475569" style={styles.labelIcon} />
                  <Text style={styles.label}>Username *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. rahul_sharma"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formData.owner.username}
                  onChangeText={(val) =>
                    setFormData({ ...formData, owner: { ...formData.owner, username: val } })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Lock size={13} color="#475569" style={styles.labelIcon} />
                  <Text style={styles.label}>Password (min 6 characters) *</Text>
                </View>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={formData.owner.password}
                    onChangeText={(val) =>
                      setFormData({ ...formData, owner: { ...formData.owner, password: val } })
                    }
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#64748B" />
                    ) : (
                      <Eye size={18} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={formData.owner.confirmPassword}
                  onChangeText={(val) =>
                    setFormData({ ...formData, owner: { ...formData.owner, confirmPassword: val } })
                  }
                />
              </View>
            </View>
          )}

          {/* =================================================== */}
          {/* STEP 2: BUSINESS & OUTLETS */}
          {/* =================================================== */}
          {currentStep === 2 && (
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Building size={13} color="#475569" style={styles.labelIcon} />
                  <Text style={styles.label}>Company / Trade Name *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Seth Mega Supermarket"
                  placeholderTextColor="#94A3B8"
                  value={formData.business.name}
                  onChangeText={(val) =>
                    setFormData({
                      ...formData,
                      business: { ...formData.business, name: val, legalName: val },
                      branches: [{ ...formData.branches[0], name: `${val} (Main)` }]
                    })
                  }
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Chennai"
                    placeholderTextColor="#94A3B8"
                    value={formData.business.city}
                    onChangeText={(val) =>
                      setFormData({
                        ...formData,
                        business: { ...formData.business, city: val },
                        branches: [{ ...formData.branches[0], city: val }]
                      })
                    }
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Tamil Nadu"
                    placeholderTextColor="#94A3B8"
                    value={formData.business.state}
                    onChangeText={(val) =>
                      setFormData({
                        ...formData,
                        business: { ...formData.business, state: val },
                        branches: [{ ...formData.branches[0], state: val }]
                      })
                    }
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <MapPin size={13} color="#475569" style={styles.labelIcon} />
                  <Text style={styles.label}>Address / Location</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="123 Business Street, Landmark"
                  placeholderTextColor="#94A3B8"
                  value={formData.business.address}
                  onChangeText={(val) =>
                    setFormData({
                      ...formData,
                      business: { ...formData.business, address: val },
                      branches: [{ ...formData.branches[0], address: val }]
                    })
                  }
                />
              </View>

              {/* GST Registered Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleTitle}>GST Registered Business</Text>
                  <Text style={styles.toggleSubtitle}>Enable CGST / SGST / IGST tax calculation</Text>
                </View>
                <Switch
                  value={formData.business.gstStatus}
                  onValueChange={(val) =>
                    setFormData({ ...formData, business: { ...formData.business, gstStatus: val } })
                  }
                  trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                />
              </View>

              {formData.business.gstStatus && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GSTIN (15 characters) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="33AAAAA0000A1Z5"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={formData.business.gstin}
                    onChangeText={(val) =>
                      setFormData({
                        ...formData,
                        business: { ...formData.business, gstin: val.toUpperCase() }
                      })
                    }
                  />
                </View>
              )}
            </View>
          )}

          {/* =================================================== */}
          {/* STEP 3: INDUSTRY DOMAIN SELECTION */}
          {/* =================================================== */}
          {currentStep === 3 && (
            <View style={styles.industryContainer}>
              {[
                {
                  type: BusinessType.SUPERMARKET,
                  title: 'Supermarket & Grocery',
                  desc: 'Fast POS counter, cashier shifts, float tracking, weighted items & multi-counter registers.',
                  icon: ShoppingCart,
                  color: '#047857',
                  bgColor: '#ECFDF5',
                  borderColor: '#A7F3D0'
                },
                {
                  type: BusinessType.RETAIL,
                  title: 'Retail & General POS',
                  desc: 'Barcode scanning, customer credit accounts, quotations, invoices & thermal receipts.',
                  icon: Store,
                  color: '#2563EB',
                  bgColor: '#EFF6FF',
                  borderColor: '#BFDBFE'
                },
                {
                  type: BusinessType.WHOLESALE,
                  title: 'Wholesale & Distribution',
                  desc: 'Bulk order pricing, credit limits, sales orders & official delivery challans.',
                  icon: Truck,
                  color: '#7C3AED',
                  bgColor: '#F5F3FF',
                  borderColor: '#DDD6FE'
                },
                {
                  type: BusinessType.RESTAURANT,
                  title: 'Restaurant & Dining',
                  desc: 'Table floor plan, order taking, multi-stage kitchen KOTs & Kitchen Display System.',
                  icon: UtensilsCrossed,
                  color: '#EA580C',
                  bgColor: '#FFF7ED',
                  borderColor: '#FED7AA'
                },
                {
                  type: BusinessType.SERVICE,
                  title: 'Service & Repair Center',
                  desc: 'Customer asset intake, serial numbers, technician job cards & repair estimates.',
                  icon: Wrench,
                  color: '#16A34A',
                  bgColor: '#F0FDF4',
                  borderColor: '#BBF7D0'
                },
                {
                  type: BusinessType.PHARMACY,
                  title: 'Pharmacy & Healthcare',
                  desc: 'Batch tracking, expiry alerts & backend block strictly preventing expired sales.',
                  icon: Pill,
                  color: '#DC2626',
                  bgColor: '#FEF2F2',
                  borderColor: '#FECACA'
                }
              ].map((ind) => {
                const isSelected = formData.businessType === ind.type;
                const IconComponent = ind.icon;
                return (
                  <TouchableOpacity
                    key={ind.type}
                    style={[
                      styles.industrySelectCard,
                      isSelected && styles.industrySelectCardActive
                    ]}
                    onPress={() => setFormData({ ...formData, businessType: ind.type })}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.industryIconBox,
                        { backgroundColor: ind.bgColor, borderColor: ind.borderColor }
                      ]}
                    >
                      <IconComponent size={20} color={ind.color} />
                    </View>
                    <View style={styles.industryInfo}>
                      <Text style={styles.industryCardTitle}>{ind.title}</Text>
                      <Text style={styles.industryCardDesc}>{ind.desc}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <CheckCircle2 size={16} color="#2563EB" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* =================================================== */}
          {/* STEP 4: REVIEW & LAUNCH */}
          {/* =================================================== */}
          {currentStep === 4 && (
            <View style={styles.card}>
              <View style={styles.reviewHeader}>
                <Sparkles size={20} color="#2563EB" />
                <Text style={styles.reviewTitle}>Ready to Create Business</Text>
              </View>
              <Text style={styles.reviewSubtitle}>
                Review your configuration below. An authorized workspace will be provisioned atomically.
              </Text>

              <View style={styles.reviewSummaryBox}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Business Owner</Text>
                  <Text style={styles.reviewValue}>
                    {formData.owner.firstName} {formData.owner.lastName}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Owner Email</Text>
                  <Text style={styles.reviewValue}>{formData.owner.email}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Company Name</Text>
                  <Text style={styles.reviewValue}>{formData.business.name}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Industry Pack</Text>
                  <View style={styles.industryBadge}>
                    <Text style={styles.industryBadgeText}>{formData.businessType}</Text>
                  </View>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Main Branch</Text>
                  <Text style={styles.reviewValue}>
                    {formData.branches[0].name} ({formData.business.city})
                  </Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.reviewLabel}>Tax Mode</Text>
                  <Text style={styles.reviewValue}>
                    {formData.business.gstStatus ? 'GST Enabled' : 'Non-GST'}
                  </Text>
                </View>
              </View>

              <View style={styles.starterInfoBox}>
                <CheckCircle2 size={16} color="#047857" style={styles.starterIcon} />
                <Text style={styles.starterText}>
                  Initial starter products, categories, stock ledger entries, and registers will be seeded automatically so you can start billing immediately.
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Controls */}
          <View style={styles.navControls}>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft size={16} color="#475569" />
              <Text style={styles.navBackBtnText}>
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </Text>
            </TouchableOpacity>

            {currentStep < 4 ? (
              <TouchableOpacity style={styles.navNextBtn} onPress={handleNext}>
                <Text style={styles.navNextBtnText}>Continue</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.launchBtn, isSubmitting && styles.launchBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.launchBtnText}>Creating Workspace...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Text style={styles.launchBtnText}>Create Business Account</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC'
  },
  container: {
    flex: 1
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6
  },
  stepIndicatorBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  stepIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  progressRow: {
    flexDirection: 'row',
    height: 3,
    backgroundColor: '#E2E8F0'
  },
  progressBarSegment: {
    flex: 1,
    height: '100%'
  },
  progressBarActive: {
    backgroundColor: '#2563EB'
  },
  progressBarInactive: {
    backgroundColor: '#E2E8F0'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 16
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14
  },
  errorIcon: {
    marginRight: 8
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  inputRow: {
    flexDirection: 'row'
  },
  inputGroup: {
    marginBottom: 14
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  labelIcon: {
    marginRight: 6
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600'
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600'
  },
  eyeBtn: {
    paddingHorizontal: 12
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
    marginBottom: 10
  },
  toggleTextGroup: {
    flex: 1,
    marginRight: 10
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  industryContainer: {
    gap: 10
  },
  industrySelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  industrySelectCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF'
  },
  industryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  industryInfo: {
    flex: 1
  },
  industryCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  industryCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16
  },
  selectedBadge: {
    marginLeft: 8
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginLeft: 6
  },
  reviewSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14
  },
  reviewSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F5'
  },
  reviewLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  reviewValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800'
  },
  industryBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  industryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  starterInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 14
  },
  starterIcon: {
    marginRight: 8,
    marginTop: 2
  },
  starterText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    lineHeight: 16,
    flex: 1
  },
  navControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  navBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 6
  },
  navNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  navNextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6
  },
  launchBtn: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  launchBtnDisabled: {
    opacity: 0.6
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  launchBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginRight: 6
  }
});
