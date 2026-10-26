"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  businessRole: "OWNER" | "MANAGER" | "STAFF";
  platformRole: string;
  joinedAt: string;
}

interface InvitationItem {
  id: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  token: string;
  status: string;
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MANAGER" | "STAFF">("STAFF");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to invite member.");
      }

      setInviteEmail("");
      setShowInviteModal(false);
      await loadData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to remove member.");
        return;
      }
      await loadData();
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      case "MANAGER":
        return "bg-blue-100 text-blue-900 border-blue-300 font-semibold";
      case "STAFF":
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 font-medium";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Access Control & Governance
          </span>
          <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
            Team & Permissions
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Authorized personnel for the active store. Privileges granted here never grant access to other stores.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowInviteModal(true)}
          className="flex items-center"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Invite Team Member
        </Button>
      </div>

      {/* Active Members Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif text-charcoal-900 flex items-center space-x-2">
          <Users className="w-5 h-5 text-bronze" />
          <span>Active Members ({members.length})</span>
        </h2>

        <div className="bg-canvas-surface border border-border-default rounded-card overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-canvas-secondary/60 border-b border-border-subtle uppercase tracking-wider text-[11px] text-charcoal-600">
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Business Role</th>
                <th className="py-3 px-4 font-semibold">Joined Atelier</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-charcoal-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-charcoal-500">
                    Loading personnel...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-charcoal-500">
                    No active members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-canvas-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-charcoal-900 text-sm">{m.name}</div>
                      <div className="text-[11px] text-charcoal-500">{m.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider border rounded ${getRoleBadge(
                          m.businessRole
                        )}`}
                      >
                        {m.businessRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-600">
                      {new Date(m.joinedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(m.id, m.name || m.email)}
                        className="p-1.5 text-charcoal-400 hover:text-rose-600 transition-colors"
                        title="Remove member"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      <div className="space-y-4 pt-4 border-t border-border-default">
        <h2 className="text-lg font-serif text-charcoal-900 flex items-center space-x-2">
          <Mail className="w-5 h-5 text-bronze" />
          <span>Pending Invitations ({invitations.length})</span>
        </h2>

        <div className="bg-canvas-surface border border-border-default rounded-card overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-canvas-secondary/60 border-b border-border-subtle uppercase tracking-wider text-[11px] text-charcoal-600">
                <th className="py-3 px-4 font-semibold">Invitee Email</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Invited By</th>
                <th className="py-3 px-4 font-semibold">Expires</th>
                <th className="py-3 px-4 font-semibold text-right">Invite Link / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-charcoal-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-charcoal-500">
                    Loading invites...
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-charcoal-500">
                    No pending invitations.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-canvas-secondary/20 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-charcoal-900">
                      {inv.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider border rounded ${getRoleBadge(
                          inv.role
                        )}`}
                      >
                        {inv.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-600">{inv.invitedBy}</td>
                    <td className="py-3.5 px-4 text-charcoal-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                        <span>
                          {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInviteLink(inv.token)}
                          className="text-[11px] py-1 px-2.5 h-7"
                        >
                          {copiedToken === inv.token ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" /> Copy Link
                            </>
                          )}
                        </Button>
                        <button
                          onClick={() => handleDelete(inv.id, inv.email)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 transition-colors"
                          title="Revoke invitation"
                          aria-label={`Revoke invitation for ${inv.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-border-default rounded-card max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-lg font-serif text-charcoal-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-bronze" />
                <span>Invite Team Member</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-charcoal-700 font-semibold uppercase tracking-wider mb-1">
                  Team Member Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@domain.com"
                  required
                  className="w-full px-3 py-2 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
                />
              </div>

              <div>
                <label className="block text-charcoal-700 font-semibold uppercase tracking-wider mb-1">
                  Privilege & Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "OWNER" | "MANAGER" | "STAFF")
                  }
                  className="w-full px-3 py-2 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
                >
                  <option value="STAFF">STAFF — View orders, fulfill shipments, concierge support</option>
                  <option value="MANAGER">MANAGER — Catalog management, inventory, orders & refunds</option>
                  <option value="OWNER">OWNER — Full administrative governance, themes, team invites</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border-subtle flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Generating Invite..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
