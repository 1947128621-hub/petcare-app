// ===== /admin 路由 layout(实施员 2 负责)=====
//
// 作用:把 /admin/* 全部 sub-route 都包到 AdminAuthGate 里
// - /admin              (主页·概览)
// - /admin/challenge    (challenge 入口页)
// - /admin/emergency    (应急入口页)
// - /admin/versions     (版本矩阵编辑器)
//
// 注:
// - MUST-02 拍板:用 /admin/* 4 个 sub-route,**不**用任何隐藏手势入口
// - AdminAuthGate 自身根据 AdminAuth.isAuthenticated() 判断:
//   - 已登录:渲染 children
//   - 未登录:渲染 challenge 弹窗(不跳转 /admin/login,与 plan §2.7 一致)
//
// 注意:因为 admin 路由不挂 (main) layout,这层 layout 还需要自带 ToastContainer

import { ReactNode } from "react";
import AdminAuthGate from "@/components/AdminAuthGate";
import ToastContainer from "@/components/Toast";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthGate>
      {children}
      <ToastContainer />
    </AdminAuthGate>
  );
}
