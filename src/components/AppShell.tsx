"use client";

import { ReactNode } from "react";
import BottomNav from "./BottomNav";
// v0.4.0 — 弹窗广告位改用 PartnerSlot type="special-offer" variant="modal"
import PartnerSlot from "./PartnerSlot";
import { HelpButton } from "./HelpButton";
import { ConfirmDialog } from "./useConfirm";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex-1 w-full max-w-[480px] mx-auto pb-24 pt-2 px-4">
        {children}
      </main>
      <BottomNav />
      <HelpButton />
      <ConfirmDialog />
      <PartnerSlot type="special-offer" variant="modal" />
    </>
  );
}
