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
  Database,
  Lock,
  User,
  LogOut,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // สเตตสำหรับการล็อกอินและการรักษาความปลอดภัย
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    username: string;
    name: string;
    role: string;
  } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ดึงสถานะการใช้ฐานข้อมูลจำลองจาก API และตรวจสอบเซสชันตอนโหลดแอปครั้งแรก
  useEffect(() => {
    async function initApp() {
      // 1. ตรวจสอบการเชื่อมต่อฐานข้อมูล
      try {
        const res = await fetch('/api/inspections?query=test-conn');
        const data = await res.json();
        if (data.isFallback) {
          setIsFallback(true);
        }
      } catch {
        setIsFallback(true);
      }

      // 2. ตรวจสอบเซสชันการล็อกอินจาก localStorage
      const token = localStorage.getItem('thailux_session_token');
      const userStr = localStorage.getItem('thailux_session_user');
      if (token === 'session_thailux_safety_token_approved' && userStr) {
        setIsAuthenticated(true);
        try {
          setUserProfile(JSON.parse(userStr));
        } catch {
          // ignore parsing error
        }
      }
      setIsCheckingAuth(false);
    }
    initApp();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('thailux_session_token', data.token);
        localStorage.setItem('thailux_session_user', JSON.stringify(data.user));
        setUserProfile(data.user);
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError(data.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('thailux_session_token');
    localStorage.removeItem('thailux_session_user');
    setIsAuthenticated(false);
    setUserProfile(null);
    setUsername('');
    setPassword('');
  };

  // ดึงรายการเมนูที่กรองตามสิทธิ์ของผู้ใช้
  const getFilteredMenuItems = () => {
    const role = userProfile?.role;
    
    const allItems = [
      {
        name: '📊 แดชบอร์ดภาพรวม',
        path: '/',
        icon: LayoutDashboard,
        desc: 'สถิติและสถานะรถบัสเรียลไทม์',
        allowedRoles: ['ADMIN', 'MECHANIC', 'OFFICE']
      },
      {
        name: '📋 ตรวจสภาพรถประจำวัน',
        path: '/inspection',
        icon: ClipboardCheck,
        desc: 'ฟอร์มเช็ก 21 จุด (สำหรับคนขับ)',
        allowedRoles: ['ADMIN', 'MECHANIC', 'OFFICE']
      },
      {
        name: '🛠️ ประวัติการซ่อมบำรุง',
        path: '/maintenance',
        icon: Wrench,
        desc: 'ประวัติและข้อมูลจากช่างซ่อม',
        allowedRoles: ['ADMIN', 'MECHANIC', 'OFFICE']
      },
      {
        name: '📑 ออกรายงาน PDF',
        path: '/reports',
        icon: FileText,
        desc: 'รายงาน Matrix 31 วันมาตรฐาน',
        allowedRoles: ['ADMIN', 'OFFICE']
      },
      {
        name: '👥 จัดการผู้ใช้งาน',
        path: '/users',
        icon: Users,
        allowedRoles: ['ADMIN'],
        desc: 'จัดการบัญชีและกำหนดสิทธิ์พนักงาน'
      }
    ];

    if (!role) return allItems.filter(item => item.path === '/inspection');
    return allItems.filter(item => item.allowedRoles.includes(role));
  };

  // ตรวจสอบความถูกต้องของสิทธิ์การเข้าถึงเส้นทางปัจจุบัน (Route Authorization Guard)
  const isRouteAllowed = () => {
    if (pathname === '/inspection') return true;
    
    const role = userProfile?.role;
    if (!role) return false;
    
    if (role === 'ADMIN') return true;
    
    if (role === 'MECHANIC') {
      return ['/', '/maintenance'].includes(pathname);
    }
    
    if (role === 'OFFICE') {
      return ['/', '/reports', '/maintenance'].includes(pathname);
    }
    
    return false;
  };

  const isDriverView = pathname === '/inspection';
  const hasAccess = isRouteAllowed();

  if (isDriverView) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        {/* แถบหัวเว็บบนมือถือสำหรับคนขับแบบเดี่ยวๆ ไม่เปิดช่องให้กดเข้าเมนูควบคุมอื่น */}
        <header className="bg-blue-950 text-white px-4 py-4 flex items-center justify-between shadow-md border-b border-blue-900/30 sticky top-0 z-40">
          <div className="flex items-center gap-2.5 mx-auto">
            <div className="bg-red-700 p-2.5 rounded-xl text-white shadow-sm shadow-red-700/20">
              <Bus className="h-5 w-5" />
            </div>
            <div className="text-center">
              <h1 className="font-extrabold text-sm leading-tight tracking-tight">Smart Fleet Safety Pro</h1>
              <p className="text-[10px] text-slate-300">ระบบส่งรายงานตรวจสภาพรถบัสประจำวัน - Thailux</p>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
          {/* ลิงก์เล็กๆ ท้ายหน้าสำหรับเจ้าหน้าที่ในออฟฟิศกดกลับหน้าควบคุม */}
          <div className="text-center py-6 mt-4 border-t border-slate-100 no-print">
            <Link href="/" className="text-xs text-slate-400 hover:text-blue-900 font-semibold transition-colors">
              📊 สำหรับเจ้าหน้าที่: เข้าสู่ระบบแดชบอร์ดศูนย์ควบคุม
            </Link>
          </div>
        </main>
      </div>
    );
  }
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-red-700 p-4 rounded-2xl animate-bounce shadow-lg shadow-red-700/30">
            <Bus className="h-10 w-10 text-white" />
          </div>
          <div className="text-center animate-pulse">
            <h2 className="text-xl font-bold tracking-wider">Smart Fleet Safety Pro</h2>
            <p className="text-xs text-blue-300 mt-1">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
        {/* Decorative ambient blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-700/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-700/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative z-10">
          {/* Header */}
          <div className="bg-blue-950 text-white px-8 py-8 relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ShieldCheck className="h-28 w-28 text-white" />
            </div>
            <div className="flex items-center gap-3.5 mb-2">
              <div className="bg-red-700 p-3 rounded-2xl text-white shadow-md shadow-red-700/30">
                <Bus className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg leading-tight tracking-tight">Smart Fleet Safety Pro</h1>
                <p className="text-xs text-slate-300">ฝ่ายปฏิบัติการขนส่ง • Thailux</p>
              </div>
            </div>
            <p className="text-xs text-blue-200 mt-4 font-medium">เข้าสู่ระบบควบคุมแดชบอร์ดและส่วนจัดการความปลอดภัย</p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-slate-800 transition-all font-medium placeholder-slate-400"
                    placeholder="กรอกชื่อผู้ใช้งาน"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-slate-800 transition-all font-medium placeholder-slate-400"
                    placeholder="กรอกรหัสผ่าน"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-950 hover:bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังตรวจสอบสิทธิ์...
                </>
              ) : (
                'เข้าสู่ระบบแดชบอร์ด'
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/inspection" className="text-xs text-blue-900 hover:underline font-bold transition-all">
                📋 ไปยังหน้าฟอร์มตรวจสภาพรถ (สำหรับคนขับ)
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !hasAccess) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <header className="bg-blue-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-blue-900/30 sticky top-0 z-40">
          <div className="flex items-center gap-2.5 mx-auto">
            <div className="bg-red-700 p-2 rounded-xl text-white shadow-sm shadow-red-700/20">
              <Bus className="h-5 w-5" />
            </div>
            <div className="text-center">
              <h1 className="font-bold text-sm leading-tight tracking-tight">Smart Fleet Safety Pro</h1>
              <p className="text-[10px] text-slate-300">ระบบตรวจสภาพรถบัสประจำวัน - Thailux</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">ไม่มีสิทธิ์เข้าถึงหน้าจอนี้</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                บัญชีผู้ใช้งานของคุณ ({userProfile?.name}) ไม่มีระดับสิทธิ์การเข้าใช้งานที่อนุญาตสำหรับหน้าจอ `{pathname}` หากต้องการข้อมูลสิทธิ์การเข้าใช้งานเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all cursor-pointer"
              >
                ออกจากระบบ
              </button>
              <Link
                href={userProfile?.role === 'MECHANIC' ? '/maintenance' : '/'}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs transition-all flex items-center justify-center cursor-pointer"
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
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

          {/* แผงข้อมูลผู้ใช้ในระบบ Sidebar */}
          {userProfile && (
            <div className="px-6 py-4 border-b border-blue-900/30 lg:border-slate-100 bg-blue-900/10 lg:bg-slate-50/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-900 lg:bg-blue-50 flex items-center justify-center font-bold text-sm text-white lg:text-blue-900 shadow-inner shrink-0">
                {userProfile.name.charAt(0)}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold text-white lg:text-slate-800 truncate">{userProfile.name}</p>
                <span className={cn(
                  "inline-block text-[9px] font-extrabold px-2 py-0.5 rounded mt-1 uppercase tracking-wider text-white",
                  userProfile.role === 'ADMIN' && "bg-rose-600",
                  userProfile.role === 'MECHANIC' && "bg-amber-600",
                  userProfile.role === 'OFFICE' && "bg-sky-600"
                )}>
                  {userProfile.role === 'ADMIN' && 'ผู้ดูแลระบบ'}
                  {userProfile.role === 'MECHANIC' && 'ช่างซ่อมบำรุง'}
                  {userProfile.role === 'OFFICE' && 'เจ้าหน้าที่ออฟฟิศ'}
                </span>
              </div>
            </div>
          )}

          {/* รายการลิงก์เมนูนำทาง */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {getFilteredMenuItems().map((item) => {
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
            {/* ปุ่มออกจากระบบ */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-700 bg-red-700/10 hover:bg-red-700 text-red-500 hover:text-white transition-all font-bold text-xs lg:border-red-200 lg:bg-red-50 lg:hover:bg-red-600 lg:text-red-700 lg:hover:text-white mb-2"
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </button>
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
