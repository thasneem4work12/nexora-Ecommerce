"use client";

import { useEffect } from "react";
import { useStoreTenant, type TenantBusinessInfo } from "@/context/StoreTenantContext";
import type { StoreAppearanceConfig } from "@/types/theme";

interface StoreTenantBridgeProps {
  business: TenantBusinessInfo;
  appearance: StoreAppearanceConfig;
  basePath: string;
}

export function StoreTenantBridge({
  business,
  appearance,
  basePath,
}: StoreTenantBridgeProps) {
  const { setTenant } = useStoreTenant();

  useEffect(() => {
    setTenant({
      business,
      appearance,
      basePath,
    });
  }, [business, appearance, basePath, setTenant]);

  return null;
}
