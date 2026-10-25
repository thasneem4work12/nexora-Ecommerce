import React from "react";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Atelier Administration | NEXORA Haute Couture",
  description: "Secure management dashboard for NEXORA Commerce products, inventory, and categories.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side check against PostgreSQL
  const { user } = await requireAdminPageSession("VIEW_ADMIN");

  return (
    <div className="min-h-screen bg-canvas-secondary/40 text-charcoal-900 flex flex-col lg:flex-row antialiased">
      {/* Sidebar */}
      <AdminSidebar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
