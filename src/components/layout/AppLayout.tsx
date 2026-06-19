// src/components/layout/AppLayout.tsx
// คอมโพเนนต์จัดวางหน้าตาเว็บหลัก (App Layout) พร้อม Sidebar สำหรับ Desktop และ Hamburger Navbar สำหรับ Mobile
// รองรับการทำงานแบบ Interactive (Client Component) และการเปลี่ยนลิงก์ใน Next.js

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Wrench,
  FileText,
  Menu,
  X,
  Bus,
  ShieldCheck,
  AlertTriangle,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // ดึงสถานะการใช้ฐานข้อมูลจำลองจาก API ตอนโหลดแอปครั้งแรก
  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/inspections?query=test-conn');
        const data = await res.json();
        if (data.isFallback) {
          setIsFallback(true);
        }
      } catch {
        setIsFallback(true);
      }
    }
    checkDb();
  }, []);

  // รายการเมนูหลักตามข้อกำหนด
  const menuItems = [
    {
      name: '📊 แดชบอร์ดภาพรวม',
      path: '/',
      icon: LayoutDashboard,
      desc: 'สถิติและสถานะรถบัสเรียลไทม์'
    },
    {
      name: '📋 ตรวจสภาพรถประจำวัน',
      path: '/inspection',
      icon: ClipboardCheck,
      desc: 'ฟอร์มเช็ก 21 จุด (สำหรับคนขับ)'
    },
    {
      name: '🛠️ ประวัติการซ่อมบำรุง',
      path: '/maintenance',
      icon: Wrench,
      desc: 'ประวัติและข้อมูลจากช่างซ่อม'
    },
    {
      name: '📑 ออกรายงาน PDF',
      path: '/reports',
      icon: FileText,
      desc: 'รายงาน Matrix 31 วันมาตรฐาน'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* ==========================================
          HEADER NAVBAR FOR MOBILE (แถบหัวเว็บบนมือถือ)
          ========================================== */}
      <header className="bg-blue-950 text-white lg:hidden px-4 py-3 flex items-center justify-between shadow-md border-b border-blue-900/30 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="bg-red-700 p-2 rounded-xl text-white shadow-sm shadow-red-700/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight tracking-tight">Smart Fleet Safety Pro</h1>
            <p className="text-[10px] text-slate-300">ระบบตรวจรถบัสประจำวัน • Thailux</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* สถานะฐานข้อมูลบนมือถือ */}
          {isFallback ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="h-3 w-3" />
              Local JSON
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Database className="h-3 w-3" />
              Postgres
            </span>
          )}

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* ==========================================
            DESKTOP SIDEBAR & MOBILE DRAWER (แถบข้างและลิ้นชักเมนู)
            ========================================== */}
        {/* Backdrop สำหรับ Mobile Drawer */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-72 bg-blue-950 text-white flex flex-col border-l border-blue-900/30 shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64 lg:border-l-0 lg:border-r lg:border-slate-100 lg:bg-white lg:text-slate-800 lg:shadow-none",
            // การสลับ Drawer บนมือถือ
            isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          {/* หัวข้อ Sidebar */}
          <div className="p-6 border-b border-blue-900/30 lg:border-slate-100 flex items-center justify-between bg-blue-900/20 lg:bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="bg-red-700 p-2.5 rounded-xl text-white shadow-sm shadow-red-700/20">
                <Bus className="h-5.5 w-5.5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base leading-tight tracking-tight lg:text-slate-800">
                  Fleet Safety
                </h2>
                <p className="text-[11px] text-blue-300 lg:text-slate-500 font-medium">
                  ระบบตรวจสภาพรถบัส
                </p>
              </div>
            </div>

            {/* ปุ่มปิด Sidebar บน Mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg bg-blue-900/50 hover:bg-blue-900 text-white transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* รายการลิงก์เมนูนำทาง */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group relative",
                    isActive
                      ? "bg-blue-900 text-white font-bold lg:bg-blue-50 lg:text-blue-900 lg:shadow-sm"
                      : "text-slate-300 hover:bg-blue-900/50 hover:text-white lg:text-slate-600 lg:hover:bg-slate-50 lg:hover:text-slate-900"
                  )}
                >
                  {/* แถบสีเน้นด้านข้างเมื่อ Active */}
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-red-600 rounded-r-full" />
                  )}
                  
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-105",
                    isActive ? "text-red-500 lg:text-blue-900" : "text-slate-400 group-hover:text-slate-200 lg:group-hover:text-slate-800"
                  )} />
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className={cn(
                      "text-[10px] mt-0.5",
                      isActive ? "text-blue-200 lg:text-blue-700/70" : "text-slate-400 lg:text-slate-400"
                    )}>
                      {item.desc}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* แผงควบคุมด้านล่าง (Footer panel ของ Sidebar) */}
          <div className="p-4 border-t border-blue-900/30 lg:border-slate-100 bg-blue-900/10 lg:bg-slate-50/50 space-y-3">
            {/* กล่องระบุสถานะฐานข้อมูล */}
            <div className={cn(
              "p-3 rounded-xl border flex items-center gap-3 transition-colors",
              isFallback 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300 lg:bg-amber-50 lg:border-amber-200 lg:text-amber-800"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 lg:bg-emerald-50 lg:border-emerald-200 lg:text-emerald-800"
            )}>
              {isFallback ? (
                <>
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="text-xs">
                    <p className="font-bold">โหมดทดลองใช้งาน</p>
                    <p className="opacity-80 text-[10px] mt-0.5 leading-tight">เซฟข้อมูลลง Local JSON ในเครื่อง</p>
                  </div>
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="text-xs">
                    <p className="font-bold">เชื่อมต่อดาต้าเบสแล้ว</p>
                    <p className="opacity-80 text-[10px] mt-0.5 leading-tight">เซฟข้อมูลลง PostgreSQL (Supabase)</p>
                  </div>
                </>
              )}
            </div>

            {/* แบรนด์และลิขสิทธิ์ */}
            <div className="text-center text-[10px] text-slate-400 lg:text-slate-400">
              <p className="font-semibold">Smart Fleet Safety Pro v1.0</p>
              <p className="mt-0.5">ระบบบริการตรวจสภาพ Thailux</p>
            </div>
          </div>
        </aside>

        {/* ==========================================
            MAIN CONTENT WINDOW (หน้าต่างแสดงผลหลัก)
            ========================================== */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* แถบ Topbar บนหน้าจอ Desktop เท่านั้น */}
          <div className="hidden lg:flex items-center justify-between px-8 py-5 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-blue-900" />
              <div>
                <h2 className="font-extrabold text-lg text-slate-800 tracking-tight">Smart Fleet Safety Pro</h2>
                <p className="text-xs text-slate-500">ระบบตรวจสอบสภาพรถบัสประจำวัน (Thailux Daily Bus Safety Checklist)</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">สังกัดความปลอดภัย</p>
                <p className="text-sm font-bold text-slate-700">ฝ่ายปฏิบัติการขนส่ง Thailux</p>
              </div>
              <div className="h-9 w-px bg-slate-200" />
              <div className="bg-blue-900 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl tracking-wider shadow-sm">
                THAI LUXURY BUS
              </div>
            </div>
          </div>

          {/* เนื้อหาภายในของแต่ละหน้า (Dynamic view injected) */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
