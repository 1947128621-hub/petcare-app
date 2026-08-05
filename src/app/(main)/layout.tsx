import { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import ToastContainer from "@/components/Toast";
import ThemeProvider from "@/components/ThemeProvider";
import { PrivacyConsentModal } from "./onboarding/PrivacyConsentModal";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppShell>
        {children}
        <ToastContainer />
      </AppShell>
      {/* v0.4.0 F-SEC-04:首次启动 modal(已读 + 已勾选 + 已点"开始使用"才消失) */}
      <PrivacyConsentModal />
    </ThemeProvider>
  );
}
