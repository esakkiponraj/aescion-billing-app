import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  QrCode,
  Printer,
  Pause,
  Play,
  User,
  Scale,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { ApiClient } from '../../services/api';
import { calculateLineTax, computeInvoiceTotals, formatCurrencyINR, generateIdempotencyKey } from '@aescion/shared-utils';
import { PaymentMethod, TaxMode } from '@aescion/shared-types';
import { BarcodeScannerAdapter, WeightScaleAdapter, CashDrawerAdapter, PrinterAdapter } from '../../services/hardware';
import confetti from 'canvas-confetti';

export const FastBillingPOS: React.FC = () => {
  const { user, organization, activeBranch } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [heldBills, setHeldBills] = useState<any[]>([]);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    BarcodeScannerAdapter.initialize();

    const unsubscribe = BarcodeScannerAdapter.onScan((barcode) => {
      handleBarcodeScan(barcode);
    });

    return () => unsubscribe();
  }, [activeBranch?.id]);

  const fetchProducts = async () => {
    try {
      const data = await ApiClient.get<any[]>('/products');
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await ApiClient.get<any[]>('/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode || p.sku === barcode);
    if (product) {
      addToCart(product);
    }
  };

  const addToCart = (product: any, qty: number = 1) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.productId === product.id);
      if (existingIdx >= 0) {
        const updated = [...prevCart];
        const newQty = updated[existingIdx].quantity + qty;
        const lineCalc = calculateLineTax({
          quantity: newQty,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate || 0,
          taxMode: TaxMode.EXCLUSIVE
        });
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          lineCalc
        };
        return updated;
      } else {
        const lineCalc = calculateLineTax({
          quantity: qty,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate || 0,
          taxMode: TaxMode.EXCLUSIVE
        });
        return [
          ...prevCart,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unitPrice: product.sellingPrice,
            taxRate: product.taxRate || 0,
            unit: product.unit || 'PCS',
            quantity: qty,
            lineCalc
          }
        ];
      }
    });
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const lineCalc = calculateLineTax({
        quantity: newQty,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxMode: TaxMode.EXCLUSIVE
      });
      updated[index] = { ...item, quantity: newQty, lineCalc };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    setHeldBills((prev) => [
      ...prev,
      {
        id: Date.now(),
        cart,
        selectedCustomerId,
        time: new Date().toLocaleTimeString()
      }
    ]);
    clearCart();
    setSelectedCustomerId('');
  };

  const handleRecallBill = (index: number) => {
    const held = heldBills[index];
    setCart(held.cart);
    setSelectedCustomerId(held.selectedCustomerId);
    setHeldBills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWeighScale = async (product: any) => {
    try {
      const { weight } = await WeightScaleAdapter.readWeight();
      addToCart(product, weight);
    } catch (err: any) {
      alert(err.message || 'Scale reading error');
    }
  };

  const totals = computeInvoiceTotals(cart.map((c) => c.lineCalc));

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setTenderAmount(totals.grandTotal.toString());
    setIsPaymentModalOpen(true);
  };

  const handleCompleteSale = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const payload = {
        branchId: activeBranch?.id,
        customerId: selectedCustomerId || undefined,
        customerName: customers.find((c) => c.id === selectedCustomerId)?.name || 'Walk-in Customer',
        lines: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          sku: c.sku,
          quantity: c.quantity,
          unit: c.unit,
          unitPrice: c.unitPrice,
          taxRate: c.taxRate,
          taxMode: TaxMode.EXCLUSIVE
        })),
        idempotencyKey: generateIdempotencyKey('pos'),
        payment: {
          method: paymentMethod,
          amount: parseFloat(tenderAmount) || totals.grandTotal,
          referenceNumber: paymentRef
        }
      };

      const response = await ApiClient.post<any>('/invoices', payload);
      CashDrawerAdapter.openDrawer();
      confetti({ particleCount: 40, spread: 50 });
      setCompletedInvoice(response);
      setIsPaymentModalOpen(false);
      clearCart();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-5.5rem)]">
      {/* LEFT: Catalog & Search Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        {/* Search & Category Filter Bar */}
        <div className="p-3.5 border-b border-[#E2E8F0] space-y-2.5 bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product by name, SKU, or scan barcode..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs font-medium bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-hidden transition"
              />
            </div>
            <div className="hidden sm:flex items-center space-x-1 text-xs text-[#64748B] font-semibold bg-white px-2.5 py-1.5 rounded-md border border-[#E2E8F0]">
              <Barcode className="w-4 h-4 text-[#2563EB] mr-1" />
              <span>Auto Scanner Ready</span>
            </div>
          </div>

          {/* Categories Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'bg-white text-[#475569] hover:bg-[#F8FAFC] border border-[#CBD5E1]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-3.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 bg-white">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => (product.isWeightBased ? handleWeighScale(product) : addToCart(product))}
              className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF]/20 cursor-pointer transition-all flex flex-col justify-between group bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-medium mb-1">
                  <span>{product.category || 'General'}</span>
                  {product.isWeightBased && (
                    <span className="bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] px-1 py-0.2 rounded flex items-center">
                      <Scale className="w-2.5 h-2.5 mr-0.5" /> Scale
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-[#0F172A] group-hover:text-[#2563EB] line-clamp-2">
                  {product.name}
                </h4>
              </div>
              <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-[#EDF1F5]">
                <span className="text-sm font-bold text-[#0F172A]">{formatCurrencyINR(product.sellingPrice)}</span>
                <span className="text-[10px] text-[#64748B] font-medium">{product.unit || 'PCS'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Live Checkout Cart & Actions */}
      <div className="w-full lg:w-[400px] bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex flex-col justify-between overflow-hidden">
        {/* Cart Header */}
        <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-3.5 h-3.5 text-[#2563EB]" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="text-xs font-semibold text-[#334155] bg-white border border-[#CBD5E1] rounded-md px-2 py-1 outline-hidden"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            {heldBills.length > 0 && (
              <button
                onClick={() => handleRecallBill(0)}
                title="Recall Held Bill"
                className="px-2 py-1 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded-md text-xs font-semibold flex items-center space-x-1"
              >
                <Play className="w-3 h-3" />
                <span>Recall ({heldBills.length})</span>
              </button>
            )}
            <button
              onClick={handleHoldBill}
              disabled={cart.length === 0}
              title="Hold Current Bill"
              className="p-1 text-[#64748B] hover:text-[#0F172A] bg-white border border-[#CBD5E1] rounded-md"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              title="Clear Cart"
              className="p-1 text-[#EF4444] hover:text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cart Lines List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] text-center p-6">
              <Zap className="w-8 h-8 text-[#CBD5E1] mb-2 stroke-1" />
              <div className="text-xs font-semibold text-[#64748B]">Cart is empty</div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Scan a barcode or select products to begin billing.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="p-2.5 bg-[#FAFBFC] rounded-md border border-[#EDF1F5] flex items-center justify-between text-xs">
                <div className="flex-1 pr-2 min-w-0">
                  <div className="font-semibold text-[#0F172A] truncate">{item.name}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {formatCurrencyINR(item.unitPrice)} × {item.quantity} {item.unit}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-white border border-[#CBD5E1] rounded p-0.5">
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="p-0.5 hover:bg-[#F8FAFC] rounded text-[#64748B]"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-1 text-xs font-semibold text-[#0F172A]">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="p-0.5 hover:bg-[#F8FAFC] rounded text-[#64748B]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-[#0F172A] w-14 text-right">
                    {formatCurrencyINR(item.lineCalc.lineTotal)}
                  </span>

                  <button onClick={() => removeFromCart(idx)} className="text-[#94A3B8] hover:text-[#EF4444] ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Action */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-2.5">
          <div className="space-y-1 text-xs text-[#64748B]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-[#0F172A]">{formatCurrencyINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (GST)</span>
              <span className="font-medium text-[#0F172A]">{formatCurrencyINR(totals.taxTotal)}</span>
            </div>
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-[11px] text-[#64748B]">
                <span>Round Off</span>
                <span>{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-[#0F172A] pt-1.5 border-t border-[#E2E8F0]">
              <span>Grand Total</span>
              <span className="text-[#2563EB]">{formatCurrencyINR(totals.grandTotal)}</span>
            </div>
          </div>

          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:opacity-40 text-white font-semibold text-xs rounded-md shadow-sm transition flex items-center justify-center space-x-1.5"
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-semibold text-[#0F172A] text-sm">Settle Invoice Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-3 rounded-md text-center">
                <span className="text-[11px] text-[#1D4ED8] font-medium block">Total Payable</span>
                <span className="text-2xl font-bold text-[#1D4ED8]">{formatCurrencyINR(totals.grandTotal)}</span>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#334155]">Payment Tender</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: PaymentMethod.CASH, label: 'Cash', icon: DollarSign },
                    { id: PaymentMethod.UPI, label: 'UPI / QR', icon: QrCode },
                    { id: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
                    { id: PaymentMethod.CUSTOMER_CREDIT, label: 'Credit', icon: User }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2 rounded-md border text-center font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition ${
                          isSelected
                            ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-2xs'
                            : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tender Amount */}
              <div className="space-y-1">
                <label className="font-semibold text-[#334155]">Received Tender (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  className="w-full aescion-input font-mono font-semibold text-sm"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-md flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={isProcessing}
                className="btn-primary"
              >
                {isProcessing ? 'Recording Sale...' : 'Complete & Print Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED INVOICE MODAL */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Sale Completed!</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Invoice #{completedInvoice.invoiceNumber}</p>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded-md border border-[#EDF1F5] text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[#64748B]">Paid Amount:</span>
                <span className="font-bold text-[#0F172A]">{formatCurrencyINR(completedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#64748B]">Payment Method:</span>
                <span className="font-semibold text-[#2563EB]">{completedInvoice.paymentMethod || 'CASH'}</span>
              </div>
            </div>
            <button
              onClick={() => setCompletedInvoice(null)}
              className="w-full btn-primary"
            >
              Start Next Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
