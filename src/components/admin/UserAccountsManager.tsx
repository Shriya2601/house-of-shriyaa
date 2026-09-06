import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldCheck,
  Crown,
  ShoppingBag,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Check,
  Ban,
  RefreshCw,
} from "lucide-react";
import { UserAccount, UserRole, UserAccountStatus, Order } from "../../types";
import {
  subscribeUserAccounts,
  saveUserAccount,
  updateUserStatus,
  deleteUserAccount,
  sendUserPasswordReset,
  subscribeOrders,
} from "../../services/storeService";

export const UserAccountsManager: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals & form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserAccount | null>(null);
  const [resetPassUser, setResetPassUser] = useState<UserAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications / toasts
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to real-time users and orders
  useEffect(() => {
    const unsubUsers = subscribeUserAccounts((userList) => {
      setUsers(userList);
      setIsLoading(false);
    });

    const unsubOrders = subscribeOrders((orderList) => {
      setOrders(orderList);
    });

    return () => {
      unsubUsers();
      unsubOrders();
    };
  }, []);

  // Compute live order metrics per user based on email
  const usersWithLiveMetrics = useMemo(() => {
    return users.map((u) => {
      const userOrders = orders.filter(
        (o) => o.customer?.email?.toLowerCase().trim() === u.email.toLowerCase().trim()
      );
      const liveOrderCount = userOrders.length > 0 ? userOrders.length : u.totalOrders || 0;
      const liveSpent =
        userOrders.length > 0
          ? userOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          : u.totalSpent || 0;

      return {
        ...u,
        totalOrders: liveOrderCount,
        totalSpent: liveSpent,
      };
    });
  }, [users, orders]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersWithLiveMetrics.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.state && u.state.toLowerCase().includes(q));

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersWithLiveMetrics, searchQuery, roleFilter, statusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const vips = users.filter((u) => u.role === "vip").length;
    const totalSpentSum = usersWithLiveMetrics.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
    return { total, active, vips, totalSpentSum };
  }, [users, usersWithLiveMetrics]);

  // Handle Save (Add / Edit)
  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const role = formData.get("role") as UserRole;
    const status = formData.get("status") as UserAccountStatus;
    const city = (formData.get("city") as string)?.trim();
    const state = (formData.get("state") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();

    if (!fullName || !email) {
      showToast("error", "Full Name and Email are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      await saveUserAccount({
        id: editingUser ? editingUser.id : undefined,
        fullName,
        email,
        phone,
        role,
        status,
        city,
        state,
        notes,
        totalOrders: editingUser ? editingUser.totalOrders : 0,
        totalSpent: editingUser ? editingUser.totalSpent : 0,
        createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
      });

      showToast(
        "success",
        editingUser
          ? `User account "${fullName}" updated successfully.`
          : `New user account "${fullName}" created successfully.`
      );
      setIsAddModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save user account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle status between active and suspended
  const handleToggleStatus = async (user: UserAccount) => {
    const newStatus: UserAccountStatus = user.status === "active" ? "suspended" : "active";
    try {
      await updateUserStatus(user.id, newStatus);
      showToast(
        "success",
        `Account status for ${user.fullName} updated to ${newStatus === "active" ? "Active" : "Suspended"}.`
      );
    } catch {
      showToast("error", "Failed to update account status.");
    }
  };

  // Confirm delete user
  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    setIsSubmitting(true);
    try {
      await deleteUserAccount(deleteTargetUser.id);
      showToast("success", `User account ${deleteTargetUser.fullName} has been removed.`);
      setDeleteTargetUser(null);
    } catch {
      showToast("error", "Failed to delete user account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send password reset
  const handleSendReset = async () => {
    if (!resetPassUser) return;
    setIsSubmitting(true);
    try {
      await sendUserPasswordReset(resetPassUser.email);
      showToast("success", `Password reset instruction sent to ${resetPassUser.email}.`);
      setResetPassUser(null);
    } catch {
      showToast("error", "Failed to dispatch password reset request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["User ID", "Full Name", "Email", "Phone", "Role", "Status", "Total Orders", "Total Spent (INR)", "City", "State", "Registered Date"];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.fullName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.phone || ""}"`,
      u.role,
      u.status,
      u.totalOrders || 0,
      u.totalSpent || 0,
      `"${u.city || ""}"`,
      `"${u.state || ""}"`,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HouseOfShriya_Users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "User accounts directory exported to CSV.");
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40"><ShieldCheck size={12} /> Master Admin</span>;
      case "editor":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"><Shield size={12} /> Atelier Stylist</span>;
      case "vip":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Crown size={12} /> VIP Patron</span>;
      case "wholesale":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Wholesale</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1e332a] text-[#cfc8bc]">Customer</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-4 ${
            toastMessage.type === "success"
              ? "bg-[#0d4f3c] text-emerald-100 border-[#d4af37]/50"
              : "bg-red-950 text-red-200 border-red-700/50"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 size={18} className="text-[#d4af37]" /> : <AlertCircle size={18} className="text-red-400" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/60 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Total Accounts</span>
            <Users size={16} className="text-[#d4af37]" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">{stats.total}</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Live Firestore accounts</div>
        </div>

        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Active Patrons</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-300 tracking-tight">{stats.active}</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Verified &amp; active status</div>
        </div>

        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>VIP Royal Patrons</span>
            <Crown size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-300 tracking-tight">{stats.vips}</div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Loyalty tier members</div>
        </div>

        <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8fa398] mb-2 font-medium">
            <span>Lifetime Patron Value</span>
            <ShoppingBag size={16} className="text-[#d4af37]" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#d4af37] tracking-tight">
            ₹{stats.totalSpentSum.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-[#7a8c83] mt-1">Across all orders placed</div>
        </div>
      </div>

      {/* Controls: Search, Filters, Add Button */}
      <div className="bg-[#121c18] border border-[#22332c] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8c83]" />
            <input
              type="text"
              placeholder="Search by patron name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#7a8c83] focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-xs font-semibold text-[#cfc8bc] focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="vip">VIP Patrons</option>
              <option value="wholesale">Wholesale</option>
              <option value="editor">Atelier Stylist / Editor</option>
              <option value="admin">Store Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-xs font-semibold text-[#cfc8bc] focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#17241f] border border-[#2b3e36] text-[#d1cbbf] hover:text-white rounded-xl text-xs font-semibold transition"
              title="Export patron list to CSV"
            >
              <Download size={14} className="text-[#d4af37]" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Add User Button */}
            <button
              onClick={() => {
                setEditingUser(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0d4f3c] hover:bg-[#12634d] text-white border border-[#d4af37]/40 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <UserPlus size={15} className="text-[#d4af37]" />
              <span>Add User Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#121c18] border border-[#22332c] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#cfc8bc]">
            <thead className="bg-[#0e1714] text-[#8fa398] uppercase tracking-wider font-semibold border-b border-[#22332c]">
              <tr>
                <th className="py-3.5 px-4">Patron &amp; Contact</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Orders &amp; Spent</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d27]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7a8c83]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#d4af37]" />
                      <span>Loading user accounts from Firestore database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7a8c83]">
                    <Users size={32} className="mx-auto mb-2 text-[#465a51] opacity-50" />
                    <p className="text-sm font-medium text-white">No user accounts found</p>
                    <p className="text-xs text-[#7a8c83] mt-0.5">Try adjusting your search query or role filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#16231e] transition-colors">
                    {/* Patron Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1e332a] border border-[#2c473a] flex items-center justify-center font-bold text-[#d4af37] text-xs flex-shrink-0">
                          {user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{user.fullName}</span>
                            {user.notes && (
                              <span className="text-[10px] bg-[#1e332a] text-[#8fa398] px-1.5 py-0.2 rounded" title={user.notes}>
                                Note
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8fa398] flex items-center gap-1 mt-0.5">
                            <Mail size={11} />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="text-[10px] text-[#7a8c83] flex items-center gap-1 mt-0.5">
                              <Phone size={10} />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                          user.status === "active"
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900"
                            : "bg-red-950/60 text-red-300 border border-red-700/50 hover:bg-red-900"
                        }`}
                        title="Click to toggle status"
                      >
                        {user.status === "active" ? <Check size={11} /> : <Ban size={11} />}
                        <span className="capitalize">{user.status}</span>
                      </button>
                    </td>

                    {/* Orders & Spent */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">
                        {user.totalOrders || 0} order{(user.totalOrders || 0) === 1 ? "" : "s"}
                      </div>
                      <div className="text-[11px] text-[#d4af37] font-semibold">
                        ₹{(user.totalSpent || 0).toLocaleString("en-IN")}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      {user.city || user.state ? (
                        <div className="flex items-center gap-1 text-[#8fa398]">
                          <MapPin size={12} className="text-[#d4af37]" />
                          <span>{[user.city, user.state].filter(Boolean).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-[#566b60]">—</span>
                      )}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-4 text-[#8fa398]">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—"}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#1a2923] hover:bg-[#23382f] text-[#cfc8bc] hover:text-white transition"
                          title="Edit User Details"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => setResetPassUser(user)}
                          className="p-1.5 rounded-lg bg-[#1a2923] hover:bg-[#23382f] text-[#d4af37] hover:text-amber-200 transition"
                          title="Send Password Reset"
                        >
                          <KeyRound size={13} />
                        </button>

                        <button
                          onClick={() => setDeleteTargetUser(user)}
                          className="p-1.5 rounded-lg bg-[#1a2923] hover:bg-red-950/80 text-red-400 hover:text-red-200 transition"
                          title="Delete Account"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c18] border border-[#22332c] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#22332c] flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#d4af37]" />
                <span>{editingUser ? "Edit Patron Account" : "Create New User Account"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-[#7a8c83] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa398] mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    defaultValue={editingUser?.fullName || ""}
                    placeholder="e.g. Radhika Mehra"
                    className="w-full px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#5d7367] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa398] mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingUser?.email || ""}
                    placeholder="radhika@example.com"
                    className="w-full px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#5d7367] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa398] mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingUser?.phone || ""}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#5d7367] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa398] mb-1">Role / Tier</label>
                  <select
                    name="role"
                    defaultValue={editingUser?.role || "customer"}
                    className="w-full px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="customer">Customer (Storefront Patron)</option>
                    <option value="vip">VIP Royal Patron (Exclusive Perks)</option>
                    <option value="wholesale">Wholesale Buyer</option>
                    <option value="editor">Atelier Stylist / Editor</option>
                    <option value="admin">Store Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa398] mb-1">Account Status</label>
                  <select
                    name="status"
                    defaultValue={editingUser?.status || "active"}
                    className="w-full px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa398] mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={editingUser?.city || ""}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3.5 py-2.5 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#5d7367] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa398] mb-1">Internal Atelier Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingUser?.notes || ""}
                  placeholder="Special style preferences, fabric notes, wedding orders..."
                  className="w-full px-3.5 py-2 bg-[#0d1613] border border-[#22332c] rounded-xl text-sm text-white placeholder-[#5d7367] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#8fa398] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0d4f3c] hover:bg-[#12634d] text-white border border-[#d4af37]/40 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingUser ? "Save Changes" : "Create Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c18] border border-red-900/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User Account?</h3>
                <p className="text-xs text-[#8fa398]">This action will permanently remove this user account from Firestore.</p>
              </div>
            </div>

            <div className="bg-[#0d1613] p-3 rounded-xl border border-[#22332c] text-xs space-y-1">
              <div className="font-semibold text-white">{deleteTargetUser.fullName}</div>
              <div className="text-[#8fa398]">{deleteTargetUser.email}</div>
              <div className="text-[#d4af37] font-medium">Role: {deleteTargetUser.role}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-[#8fa398] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c18] border border-[#22332c] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#d4af37]">
              <div className="w-10 h-10 rounded-xl bg-[#1e332a] border border-[#d4af37]/40 flex items-center justify-center flex-shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Send Password Reset Link</h3>
                <p className="text-xs text-[#8fa398]">A secure password reset link will be sent to the patron&apos;s email address.</p>
              </div>
            </div>

            <div className="bg-[#0d1613] p-3 rounded-xl border border-[#22332c] text-xs">
              <span className="text-[#8fa398]">Recipient: </span>
              <span className="font-semibold text-white">{resetPassUser.email}</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setResetPassUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-[#8fa398] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReset}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#0d4f3c] hover:bg-[#12634d] text-white border border-[#d4af37]/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                <span>Send Reset Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
