// src/app/users/page.tsx
// หน้าจอสำหรับจัดการบัญชีผู้ใช้งานและบทบาทหน้าที่ พร้อมการตั้งค่าสิทธิ์แบบไดนามิก (User Management & Permission Grid - ADMIN Only)

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  User,
  Key
} from 'lucide-react';
import { 
  Card, 
  Button, 
  Dialog 
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');

  // ฟอร์มจัดการผู้ใช้
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('OFFICE');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // สเตตระบบสิทธิ์แบบไดนามิก
  const [permissions, setPermissions] = useState<{ role: string; allowedPages: string }[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permErrorMsg, setPermErrorMsg] = useState('');
  const [permSuccessMsg, setPermSuccessMsg] = useState('');

  const systemPages = [
    { label: '📊 แดชบอร์ดภาพรวม', path: '/' },
    { label: '📋 ตรวจสภาพรถประจำวัน (สำหรับคนขับ)', path: '/inspection' },
    { label: '🛠️ ประวัติการซ่อมบำรุง', path: '/maintenance' },
    { label: '📑 ออกรายงาน PDF', path: '/reports' },
    { label: '👥 จัดการผู้ใช้งาน (ADMIN)', path: '/users' },
  ];

  // ดึงข้อมูลผู้ใช้ปัจจุบันที่ล็อกอิน
  useEffect(() => {
    const userStr = localStorage.getItem('thailux_session_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setTimeout(() => {
          setCurrentAdminId(u.id || '');
        }, 0);
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    }
  }, []);

  // โหลดรายชื่อผู้ใช้งานทั้งหมด
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดข้อมูลสิทธิ์หน้าจอทั้งหมด
  const fetchPermissions = useCallback(async () => {
    setLoadingPermissions(true);
    setPermErrorMsg('');
    try {
      const res = await fetch('/api/permissions');
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data);
      } else {
        setPermErrorMsg(data.message || 'ไม่สามารถดึงข้อมูลสิทธิ์ได้');
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setPermErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === 'permissions') {
      const timer = setTimeout(() => {
        fetchPermissions();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchPermissions]);

  // เปิดฟอร์มเพิ่มผู้ใช้
  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setRole('OFFICE');
    setPassword('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // เปิดฟอร์มแก้ไขผู้ใช้
  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setUsername(u.username);
    setName(u.name);
    setRole(u.role);
    setPassword('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // บันทึกฟอร์ม (เพิ่ม/แก้ไข)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim() || !role) {
      setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (!editingUser && !password) {
      setErrorMsg('กรุณากรอกรหัสผ่านสำหรับบัญชีใหม่');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const payload = {
      username,
      name,
      role,
      password: password || undefined
    };

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        fetchUsers();
      } else {
        setErrorMsg(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  // ลบบัญชีผู้ใช้
  const handleDeleteUser = async (u: UserItem) => {
    if (u.id === currentAdminId) {
      alert('ไม่สามารถลบบัญชีที่คุณกำลังใช้งานเข้าสู่ระบบอยู่ได้');
      return;
    }

    if (!confirm(`คุณต้องการลบบัญชีผู้ใช้งาน "${u.name}" (${u.username}) ใช่หรือไม่?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'ลบบัญชีผู้ใช้ไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // ตรวจเช็กว่าหน้าจอนี้เปิดรับสิทธิ์อยู่หรือไม่
  const isPageAllowed = (roleKey: string, path: string) => {
    const perm = permissions.find(p => p.role === roleKey);
    if (!perm) return false;
    const paths = perm.allowedPages.split(',').map(s => s.trim()).filter(Boolean);
    return paths.includes(path);
  };

  // สลับการเช็กบ็อกซ์เปิดสิทธิ์การเข้าชมหน้าจอ
  const handleTogglePage = (roleKey: string, path: string) => {
    if (roleKey === 'ADMIN' && (path === '/users' || path === '/')) {
      alert('ไม่สามารถปิดสิทธิ์แดชบอร์ดหลักและระบบจัดการผู้ใช้งานของ ADMIN ได้ เพื่อป้องกันระบบปิดกั้นการทำงาน');
      return;
    }

    setPermissions(prev => {
      return prev.map(p => {
        if (p.role !== roleKey) return p;
        
        let paths = p.allowedPages.split(',').map(s => s.trim()).filter(Boolean);
        if (paths.includes(path)) {
          paths = paths.filter(x => x !== path);
        } else {
          paths.push(path);
        }
        
        return {
          ...p,
          allowedPages: paths.join(',')
        };
      });
    });
  };

  // บันทึกสิทธิ์ความสัมพันธ์ลง API และ localStorage cache
  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    setPermErrorMsg('');
    setPermSuccessMsg('');
    
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissions)
      });
      
      const data = await res.json();
      if (data.success) {
        setPermSuccessMsg('บันทึกค่าสิทธิ์การเข้าใช้งานเสร็จสมบูรณ์ ระบบจะบังคับอัปเดตสิทธิ์ของพนักงานทันที!');
        
        // บันทึกลง LocalStorage Cache สำหรับอัปเดต UI ฝั่ง Layout แบบเรียลไทม์
        const permMap: Record<string, string[]> = {};
        permissions.forEach(p => {
          permMap[p.role] = p.allowedPages.split(',').map(s => s.trim()).filter(Boolean);
        });
        localStorage.setItem('thailux_role_permissions', JSON.stringify(permMap));
        
        setTimeout(() => setPermSuccessMsg(''), 4000);
      } else {
        setPermErrorMsg(data.message || 'ไม่สามารถบันทึกข้อมูลสิทธิ์ได้');
      }
    } catch (err) {
      console.error(err);
      setPermErrorMsg('เกิดข้อผิดพลาดทางเทคนิคในการเชื่องต่อเซิร์ฟเวอร์');
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header หน้าจอ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Users className="text-blue-900 h-6.5 w-6.5" />
            จัดการบัญชีและกำหนดสิทธิ์ผู้ใช้งาน
          </h2>
          <p className="text-xs text-slate-500 mt-1">เพิ่ม แก้ไข หรือลบบัญชีผู้ใช้พร้อมกำหนดสิทธิ์เข้าดูหน้าจอแต่ละส่วนของออฟฟิศ</p>
        </div>

        {activeTab === 'users' ? (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchUsers}
              className="flex items-center gap-2 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              รีเฟรชข้อมูล
            </Button>

            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white shadow-sm border-none"
            >
              <UserPlus className="h-4 w-4" />
              เพิ่มผู้ใช้งานใหม่
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPermissions}
              className="flex items-center gap-2 rounded-lg hover:bg-slate-100"
              disabled={loadingPermissions || savingPermissions}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingPermissions && "animate-spin")} />
              รีเฟรชสิทธิ์
            </Button>

            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSavePermissions}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none"
              disabled={loadingPermissions || savingPermissions}
            >
              <ShieldCheck className="h-4 w-4" />
              {savingPermissions ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์การเข้าใช้งาน'}
            </Button>
          </div>
        )}
      </div>

      {/* แถบ Tabs ด้านบนสำหรับการนำทางภายใน */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'users'
              ? "border-blue-900 text-blue-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          👤 บัญชีผู้ใช้งาน ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={cn(
            "px-6 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'permissions'
              ? "border-blue-900 text-blue-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          🔐 กำหนดสิทธิ์เข้าถึงหน้าจอ (RBAC Matrix Grid)
        </button>
      </div>

      {/* Tab 1: ตารางรายชื่อและข้อมูลผู้ใช้งาน */}
      {activeTab === 'users' && (
        <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            {loading && users.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-900 mb-4" />
                กำลังโหลดข้อมูลผู้ใช้งาน...
              </div>
            ) : users.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-medium">
                📭 ไม่พบรายชื่อผู้ใช้งานในระบบ
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">รายชื่อพนักงาน</th>
                    <th className="px-6 py-4">ชื่อผู้ใช้งาน (Username)</th>
                    <th className="px-6 py-4">ระดับสิทธิ์ (Role)</th>
                    <th className="px-6 py-4">วันที่ลงทะเบียน</th>
                    <th className="px-6 py-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4.5 whitespace-nowrap font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shadow-inner">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{u.name}</p>
                            {u.id === currentAdminId && (
                              <span className="text-[10px] text-blue-600 font-bold block">(บัญชีของคุณ)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap font-mono text-slate-600">
                        {u.username}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm",
                          u.role === 'ADMIN' && "bg-rose-50 border-rose-200 text-rose-700",
                          u.role === 'MECHANIC' && "bg-amber-50 border-amber-200 text-amber-700",
                          u.role === 'OFFICE' && "bg-sky-50 border-sky-200 text-sky-700"
                        )}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {u.role === 'ADMIN' && 'ADMIN (ผู้ดูแลระบบ)'}
                          {u.role === 'MECHANIC' && 'MECHANIC (ช่างซ่อม)'}
                          {u.role === 'OFFICE' && 'OFFICE (สำนักงาน)'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-slate-500 font-medium">
                        {new Date(u.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            className="flex items-center gap-1.5 text-xs py-1 rounded-lg hover:bg-slate-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(u)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs py-1 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700",
                              u.id === currentAdminId && "opacity-50 pointer-events-none"
                            )}
                            disabled={u.id === currentAdminId}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            ลบ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Tab 2: ตารางความสัมพันธ์สิทธิ์เข้าใช้งานหน้าจอแบบไดนามิก */}
      {activeTab === 'permissions' && (
        <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-3xl bg-white p-6 space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">แผงควบคุมตารางสิทธิ์การใช้งาน (Permissions Matrix Editor)</h3>
            <p className="text-xs text-slate-400 mt-1">
              ทำเครื่องหมายเช็กบ็อกซ์เพื่ออนุญาตให้แต่ละระดับสิทธิ์เข้าถึงหน้าจอต่างๆ ของระบบตรวจเช็กสภาพความปลอดภัย
            </p>
          </div>

          {permErrorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
              ⚠️ {permErrorMsg}
            </div>
          )}

          {permSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold">
              ✅ {permSuccessMsg}
            </div>
          )}

          {loadingPermissions ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-900 mb-4" />
              กำลังดึงข้อมูลการตั้งค่าสิทธิ์...
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-150 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">หน้าจอของระบบ (Page / Route Path)</th>
                    <th className="px-6 py-4 text-center w-28">ADMIN (แอดมิน)</th>
                    <th className="px-6 py-4 text-center w-28">MECHANIC (ช่าง)</th>
                    <th className="px-6 py-4 text-center w-28">OFFICE (ออฟฟิศ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs sm:text-sm">
                  {systemPages.map((page) => (
                    <tr key={page.path} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4.5 font-bold text-slate-700">
                        <div>
                          <p className="text-slate-800 font-semibold">{page.label}</p>
                          <span className="font-mono text-[10px] text-slate-400 font-normal">{page.path}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <input
                          type="checkbox"
                          checked={isPageAllowed('ADMIN', page.path)}
                          onChange={() => handleTogglePage('ADMIN', page.path)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900/20 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <input
                          type="checkbox"
                          checked={isPageAllowed('MECHANIC', page.path)}
                          onChange={() => handleTogglePage('MECHANIC', page.path)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900/20 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <input
                          type="checkbox"
                          checked={isPageAllowed('OFFICE', page.path)}
                          onChange={() => handleTogglePage('OFFICE', page.path)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900/20 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-sky-50/50 border border-sky-100 p-4.5 rounded-2xl text-sky-800 text-xs leading-relaxed space-y-1.5">
            <p className="font-bold flex items-center gap-1">
              <Key className="h-4 w-4 text-sky-700" />
              ข้อกำหนดและสิทธิ์พิเศษของระบบ:
            </p>
            <p>1. หน้าฟอร์มตรวจสภาพบัส (`/inspection`) จะถูกเปิดสิทธิ์เป็นสาธารณะเพื่อให้ พขร. รายงานสภาพความปลอดภัยได้โดยไม่ต้องมีเซสชันล็อกอิน</p>
            <p>2. หน้าจอบริหารจัดการผู้ใช้และสิทธิ์นี้ (`/users`) แนะนำให้สงวนไว้เฉพาะบทบาท `ADMIN` เพื่อป้องกันบัญชีทั่วไปแก้ไขสิทธิ์และขโมยไอดีในระบบ</p>
            <p>3. สิทธิ์การทำงานเฉพาะบทบาท (Action-level permissions) จะยังถูกตรวจสอบความปลอดภัยเช่นเดิม เช่น กลุ่ม `OFFICE` จะไม่ปรากฏปุ่มกดแก้ไขซ่อมบำรุงในหน้าประวัติซ่อมแซมแม้จะเปิดสิทธิ์เข้าชมหน้าจอก็ตาม</p>
          </div>
        </Card>
      )}

      {/* ==========================================
          DIALOG / MODAL FOR ADD/EDIT USER (ป๊อปอัปเพิ่ม/แก้ไขบัญชี)
          ========================================== */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? `แก้ไขบัญชีผู้ใช้: ${editingUser.username}` : 'เพิ่มผู้ใช้งานในระบบรายใหม่'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4 font-sans text-left">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

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
                disabled={!!editingUser}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-slate-800 transition-all font-medium placeholder-slate-400 disabled:opacity-50"
                placeholder="ภาษาอังกฤษ (เช่น somchai.r)"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              ชื่อ-นามสกุลพนักงาน
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-slate-800 transition-all font-medium placeholder-slate-400"
              placeholder="กรอกชื่อและนามสกุลจริงภาษาไทย"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              ระดับสิทธิ์การเข้าถึง (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-slate-800 transition-all font-medium"
            >
              <option value="OFFICE">OFFICE (เจ้าหน้าที่สำนักงาน - ดูบอร์ด/รายงาน)</option>
              <option value="MECHANIC">MECHANIC (ช่างซ่อมบำรุง - ดูบอร์ด/บันทึกซ่อม)</option>
              <option value="ADMIN">ADMIN (ผู้ดูแลระบบสูงสุด - เข้าได้ทุกส่วน/จัดการผู้ใช้)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              รหัสผ่าน (Password)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-slate-800 transition-all font-medium placeholder-slate-400"
              placeholder={editingUser ? "เว้นว่างหากไม่ต้องการเปลี่ยนรหัสผ่าน" : "กำหนดรหัสผ่าน (อย่างน้อย 4 ตัว)"}
              required={!editingUser}
            />
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="flex-1 text-xs rounded-xl"
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 text-xs rounded-xl bg-blue-950 hover:bg-blue-900 text-white shadow-sm border-none"
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
          </div>

        </form>
      </Dialog>

    </div>
  );
}
