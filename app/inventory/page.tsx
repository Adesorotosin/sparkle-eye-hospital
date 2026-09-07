"use client";

import React, { useState, useRef, useEffect } from "react";
import { Package, Search, Plus, Filter, AlertTriangle, CheckCircle2, ArrowLeft, ChevronDown, X } from "lucide-react";

// Mock data for optical inventory (frames, lenses, contact lenses, solutions)
const initialInventory = [
  { id: "INV-001", name: "Titanium Flex Frame - Matte Black", category: "Frames", stock: 18, reorderLevel: 5, price: "₦45,000" },
  { id: "INV-002", name: "Anti-Reflective Blue Cut Lenses (Pair)", category: "Lenses", stock: 4, reorderLevel: 10, price: "₦25,000" },
  { id: "INV-003", name: "Designer Cat-Eye Frame - Tortoiseshell", category: "Frames", stock: 12, reorderLevel: 4, price: "₦38,000" },
  { id: "INV-004", name: "Daily Disposable Contact Lenses (-2.50)", category: "Contacts", stock: 30, reorderLevel: 15, price: "₦18,000" },
  { id: "INV-005", name: "Multi-Purpose Contact Lens Solution 360ml", category: "Accessories", stock: 2, reorderLevel: 8, price: "₦6,500" },
];

const categories = ["All Categories", "Frames", "Lenses", "Contacts", "Accessories"];

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [inventory, setInventory] = useState(initialInventory);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Frames");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");
  const [newItemReorder, setNewItemReorder] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle submitting a new inventory item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !newItemStock) return;

    const newId = `INV-00${inventory.length + 1}`;
    const formattedPrice = newItemPrice.startsWith("₦") ? newItemPrice : `₦${Number(newItemPrice).toLocaleString()}`;

    const newItem = {
      id: newId,
      name: newItemName,
      category: newItemCategory,
      stock: parseInt(newItemStock, 10),
      reorderLevel: newItemReorder ? parseInt(newItemReorder, 10) : 5,
      price: formattedPrice,
    };

    setInventory([newItem, ...inventory]);
    
    // Reset form and close modal
    setNewItemName("");
    setNewItemCategory("Frames");
    setNewItemPrice("");
    setNewItemStock("");
    setNewItemReorder("");
    setIsModalOpen(false);
  };

  // Filter logic combining search term and category selection
  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All Categories" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-800 font-sans antialiased">
      {/* Page Header */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button 
            onClick={() => window.history.back()} 
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center justify-center"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Optical Shop Inventory</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage frame stocks, prescription lenses, and retail accessories.</p>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Item
        </button>
      </header>

      <main className="p-8 space-y-6 max-w-7xl mx-auto w-full flex-1">
        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by product name or item code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition"
            />
          </div>

          {/* Filter Category Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategory !== "All Categories"
                  ? "bg-purple-50 border-purple-300 text-purple-700"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCategory}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-xs font-semibold text-slate-700">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 transition hover:bg-purple-50 hover:text-purple-700 cursor-pointer ${
                      selectedCategory === cat ? "bg-purple-50/80 text-purple-700 font-extrabold" : ""
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-6">Item Code & Name</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Unit Price</th>
                <th className="py-3 px-6">Stock Level</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isLowStock = item.stock <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">{item.category}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{item.price}</td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800">{item.stock}</span> units
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No inventory items match your current filter or search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ADD NEW ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-900">Add New Inventory Item</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name & Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Titanium Flex Frame - Silver"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600 transition cursor-pointer"
                  >
                    <option value="Frames">Frames</option>
                    <option value="Lenses">Lenses</option>
                    <option value="Contacts">Contacts</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Price (₦)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 35000"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Stock Level</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 15"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Low Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5 (Default)"
                    value={newItemReorder}
                    onChange={(e) => setNewItemReorder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}