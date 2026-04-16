import type { ReactNode } from "react";

import { AppShell } from "@/shared/layout/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
