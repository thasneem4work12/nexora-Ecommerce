"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import type { StoreAppearanceConfig } from "@/types/theme";

export interface TenantBusinessInfo {
  id: string;
  slug: string;
  name: string;
  type?: string;
  defaultCurrency?: string;
  contactEmail?: string | null;
}

export interface StoreTenantContextType {
  business: TenantBusinessInfo | null;
  appearance: StoreAppearanceConfig | null;
  basePath: string; // e.g. "/store/lumina-tech" or "" for root store
  setTenant: (tenant: {
    business: TenantBusinessInfo | null;
    appearance: StoreAppearanceConfig | null;
    basePath: string;
  }) => void;
}

const StoreTenantContext = createContext<StoreTenantContextType>({
  business: null,
  appearance: null,
  basePath: "",
  setTenant: () => {},
});

export function StoreTenantProvider({
  children,
  initialBusiness = null,
  initialAppearance = null,
  initialBasePath = "",
}: {
  children: React.ReactNode;
  initialBusiness?: TenantBusinessInfo | null;
  initialAppearance?: StoreAppearanceConfig | null;
  initialBasePath?: string;
}) {
  const [state, setState] = useState({
    business: initialBusiness,
    appearance: initialAppearance,
    basePath: initialBasePath,
  });

  const value = useMemo(
    () => ({
      business: state.business,
      appearance: state.appearance,
      basePath: state.basePath,
      setTenant: (tenant: {
        business: TenantBusinessInfo | null;
        appearance: StoreAppearanceConfig | null;
        basePath: string;
      }) => {
        setState(tenant);
      },
    }),
    [state]
  );

  return (
    <StoreTenantContext.Provider value={value}>
      {children}
    </StoreTenantContext.Provider>
  );
}

export function useStoreTenant() {
  return useContext(StoreTenantContext);
}
