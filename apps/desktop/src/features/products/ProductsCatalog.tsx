import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, AlertTriangle, CheckCircle2, Barcode, X } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const ProductsCatalog: React.FC = () => {
  const { activeBranch } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'General',
    unit: 'PCS',
    costPrice: 0,
    sellingPrice: 0,
    taxRate: 5,
    hsn: '1905',
    initialStock: 20
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>(`/products?search=${search}`);
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, activeBranch?.id]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/products', newProduct);
      setIsAddModalOpen(false);
      setNewProduct({
        name: '',
        sku: '',
        barcode: '',
        category: 'General',
        unit: 'PCS',
        costPrice: 0,
        sellingPrice: 0,
        taxRate: 5,
        hsn: '1905',
        initialStock: 20
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Package className="w-5 h-5 text-[#2563EB]" />
            <span>Products & Stock Master</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage item pricing, barcodes, HSN, and inventory balances.</p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-3.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-hidden w-64 transition"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Item Name</th>
              <th className="py-3 px-4">SKU / Barcode</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Cost Price</th>
              <th className="py-3 px-4">Selling Price</th>
              <th className="py-3 px-4">GST Rate</th>
              <th className="py-3 px-4">Current Stock</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  Loading catalog items...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLowStock = p.currentStock > 0 && p.currentStock <= 10;
                const isOutOfStock = p.currentStock <= 0;

                return (
                  <tr key={p.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{p.name}</td>
                    <td className="py-3 px-4 text-[#64748B] font-mono">{p.sku || p.barcode || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] rounded text-[10px] font-medium">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{formatCurrencyINR(p.costPrice || 0)}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(p.sellingPrice)}</td>
                    <td className="py-3 px-4 text-[#64748B]">{p.taxRate}%</td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{p.currentStock} {p.unit || 'PCS'}</td>
                    <td className="py-3 px-4">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] rounded text-[10px] font-semibold">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded text-[10px] font-semibold">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded text-[10px] font-semibold">
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Add Catalog Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aashirvaad Whole Wheat Atta 5kg"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. AAS-5KG"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 8901030383838"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">GST Tax Rate (%)</label>
                  <select
                    value={newProduct.taxRate}
                    onChange={(e) => setNewProduct({ ...newProduct, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-medium"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={newProduct.hsn}
                    onChange={(e) => setNewProduct({ ...newProduct, hsn: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.initialStock}
                    onChange={(e) => setNewProduct({ ...newProduct, initialStock: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
