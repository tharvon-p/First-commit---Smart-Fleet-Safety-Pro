// src/app/page.tsx
// หน้าจอแดชบอร์ดศูนย์ควบคุมความปลอดภัยรถบัส (VIEW 2: Desktop-First Dashboard)
// ดึงข้อมูลการตรวจทั้งหมดมาวิเคราะห์ สรุปผลเป็นตัวเลข KPI, ตารางกรองค้นหา และโมดัลแก้ไขสถานะสำหรับช่าง

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Bus, 
  AlertOctagon, 
  Wrench, 
  CheckCircle2, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  Eye, 
  Camera,
  FileText
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  Button, 
  Badge, 
  Dialog 
} from '@/components/ui';
import { CHECKLIST_ITEMS, cn } from '@/lib/utils';
import { InspectionRecord } from '@/lib/db';

export default function DashboardPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ฟิลเตอร์การแสดงผล
  const [searchQuery, setSearchQuery] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('ทั้งหมด');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ฟังก์ชันดึงข้อมูลจาก API
  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (factoryFilter && factoryFilter !== 'ทั้งหมด') params.append('factory', factoryFilter);
      if (statusFilter && statusFilter !== 'ทั้งหมด') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/inspections?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setInspections(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch inspections:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, factoryFilter, statusFilter, startDate, endDate]);

  // โหลดข้อมูลเมื่อเปิดหน้าและเมื่อมีการเปลี่ยนฟิลเตอร์
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInspections();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchInspections]);

  // ฟังก์ชันสุ่มสร้างข้อมูลตัวอย่างสำหรับการทดสอบระบบ
  const handleSeedData = async () => {
    if (window.confirm('คุณต้องการสุ่มสร้างข้อมูลตรวจรถจำลองจำนวน 15-20 รายการ เพื่อทดสอบรายงานความปลอดภัยบนแดชบอร์ดหรือไม่?')) {
      setLoading(true);
      try {
        const res = await fetch('/api/seed');
        const data = await res.json();
        if (data.success) {
          window.alert(data.message);
          fetchInspections();
        } else {
          window.alert('เกิดข้อผิดพลาด: ' + data.message);
        }
      } catch (err) {
        console.error(err);
        window.alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setLoading(false);
      }
    }
  };

  // คำนวณข้อมูลสถิติ (KPIs)
  const totalCount = inspections.length;
  const normalCount = inspections.filter(i => i.status === 'ปกติ' || i.status === 'ซ่อมเสร็จสิ้น').length;
  const pendingRepairCount = inspections.filter(i => i.status === 'รอคิวซ่อม').length;
  const suspendedCount = inspections.filter(i => i.status === 'ระงับการวิ่ง').length;

  // เปิดดูรายละเอียดและฟอร์มแก้ไขของช่าง
  const handleOpenMechanicModal = (record: InspectionRecord) => {
    setSelectedInspection(record);
    setMechanicNotes(record.mechanicNotes || '');
    setIsModalOpen(true);
  };

  // ช่างบันทึกการซ่อมบำรุง
  const handleSaveRepair = async () => {
    if (!selectedInspection) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/inspections/${selectedInspection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ซ่อมเสร็จสิ้น',
          mechanicNotes: mechanicNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchInspections(); // รีเฟรชตารางหลังเซฟ
      } else {
        alert(data.message || 'ไม่สามารถอัปเดตข้อมูลได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setSubmitting(false);
    }
  };

  // ตรวจเช็กรายการชำรุดในใบตรวจสอบเพื่อสรุปข้อมูลย่อ
  const getDefectedItems = (items: Record<string, boolean>) => {
    const defectedList: string[] = [];
    CHECKLIST_ITEMS.forEach(item => {
      if (items[item.key] === false) {
        defectedList.push(item.label);
      }
    });
    return defectedList;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ==========================================
          KPI CARDS SECTION (บล็อกแสดงตัวเลขสถิติ)
          ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* การตรวจทั้งหมด */}
        <Card className="relative overflow-hidden group hover:translate-y-[-2px]">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 scale-150">
            <BarChart3 className="h-24 w-24 text-blue-900" />
          </div>
          <CardContent className="p-5 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-slate-400">ตรวจสภาพรวม</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-blue-950">{totalCount}</h3>
              <p className="text-[10px] text-slate-400">รายการใบงานสะสม</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl text-blue-900">
              <BarChart3 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* ปลอดภัย / ปกติ */}
        <Card className="relative overflow-hidden group hover:translate-y-[-2px] border-l-4 border-emerald-500">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 scale-150">
            <CheckCircle2 className="h-24 w-24 text-emerald-600" />
          </div>
          <CardContent className="p-5 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-emerald-600">พร้อมใช้งาน (ปกติ)</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-800">{normalCount}</h3>
              <p className="text-[10px] text-emerald-600/70">ผ่านเกณฑ์ความปลอดภัย</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* รอซ่อมบำรุง */}
        <Card className="relative overflow-hidden group hover:translate-y-[-2px] border-l-4 border-amber-500">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 scale-150">
            <Wrench className="h-24 w-24 text-amber-500" />
          </div>
          <CardContent className="p-5 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-amber-600">รอคิวซ่อม</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-800">{pendingRepairCount}</h3>
              <p className="text-[10px] text-amber-600/70">พบชำรุดย่อย (วิ่งต่อได้)</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-2xl text-amber-600">
              <Wrench className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* ระงับการวิ่ง (อันตราย) */}
        <Card className="relative overflow-hidden group hover:translate-y-[-2px] border-l-4 border-rose-600">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 scale-150">
            <AlertOctagon className="h-24 w-24 text-rose-600" />
          </div>
          <CardContent className="p-5 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-rose-600">ระงับการวิ่ง</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-800">{suspendedCount}</h3>
              <p className="text-[10px] text-rose-600/70">พบชำรุดจุดวิกฤต (งดใช้รถ)</p>
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl text-rose-600">
              <AlertOctagon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ==========================================
          FILTER BAR (แถบตัวกรองและกล่องสืบค้นข้อมูล)
          ========================================== */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Filter className="h-4.5 w-4.5 text-blue-900" />
            <h4 className="font-bold text-sm text-slate-800">เครื่องมือกรองและสืบค้นข้อมูล</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* ค้นหาคำค้นหลัก */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาทะเบียนรถ / พนักงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-700 bg-white"
              />
            </div>

            {/* กรองสังกัดโรงงาน */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400 whitespace-nowrap hidden lg:inline">โรงงาน:</label>
              <select
                value={factoryFilter}
                onChange={(e) => setFactoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-700 bg-white cursor-pointer"
              >
                <option value="ทั้งหมด">สังกัดโรงงานทั้งหมด</option>
                <option value="KCE">KCE (นิคมลาดกระบัง)</option>
                <option value="สุริยัน">สุริยัน (ลานจอดลาดกระบัง)</option>
                <option value="อมตะซิตี้">อมตะซิตี้ (ชลบุรี)</option>
                <option value="บางปู">บางปู (สมุทรปราการ)</option>
              </select>
            </div>

            {/* กรองสถานะความปลอดภัย */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400 whitespace-nowrap hidden lg:inline">สถานะ:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-700 bg-white cursor-pointer"
              >
                <option value="ทั้งหมด">สถานะทั้งหมด</option>
                <option value="ปกติ">ปกติ (พร้อมรันงาน)</option>
                <option value="รอคิวซ่อม">รอคิวซ่อม</option>
                <option value="ระงับการวิ่ง">ระงับการวิ่ง</option>
                <option value="ซ่อมเสร็จสิ้น">ซ่อมเสร็จสิ้น</option>
              </select>
            </div>

            {/* ตัวเลือกวันเริ่มและวันสิ้นสุด */}
            <div className="flex items-center gap-1.5 border border-slate-200 px-3 py-2 rounded-xl bg-white col-span-1 lg:col-span-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs text-slate-600 focus:outline-none bg-transparent cursor-pointer"
              />
              <span className="text-slate-300 px-1 text-xs">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs text-slate-600 focus:outline-none bg-transparent cursor-pointer"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-500 font-bold hover:underline ml-2 cursor-pointer"
                >
                  เคลียร์
                </button>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ==========================================
          DATA TABLE SECTION (ตารางแสดงผลเรียลไทม์)
          ========================================== */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-blue-900" />
            <h3 className="text-base font-extrabold text-slate-800">ตารางข้อมูลสภาพบัส</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedData}
              className="flex items-center gap-1.5 rounded-lg text-xs text-blue-900 border-blue-900/30 hover:bg-blue-50"
              disabled={loading}
            >
              <FileText className="h-3.5 w-3.5" />
              สร้างข้อมูลจำลอง
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchInspections}
              className="flex items-center gap-2 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {loading ? 'กำลังดึง...' : 'รีเฟรช'}
            </Button>
          </div>
        </div>

        {/* ส่วนครอบตารางเพื่อความลื่นไหลในจอมือถือ (Responsive wrapper) */}
        <div className="overflow-x-auto">
          {loading && inspections.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-900 mb-4" />
              กำลังโหลดรายงานการตรวจสภาพ...
            </div>
          ) : inspections.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">
              📭 ไม่พบข้อมูลใบตรวจสภาพรถบัสตรงตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">วัน-เวลาตรวจ</th>
                  <th className="px-6 py-4">ทะเบียนรถบัส</th>
                  <th className="px-6 py-4">สังกัดโรงงาน</th>
                  <th className="px-6 py-4">พนักงานขับรถ</th>
                  <th className="px-6 py-4">เลขไมล์สะสม</th>
                  <th className="px-6 py-4">สภาพจุดชำรุด</th>
                  <th className="px-6 py-4">ผลลัพธ์</th>
                  <th className="px-6 py-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {inspections.map((row) => {
                  const defected = getDefectedItems(row.items as Record<string, boolean>);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4.5 whitespace-nowrap text-slate-500 font-medium">
                        {new Date(row.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}{' '}
                        {new Date(row.createdAt).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} น.
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap font-bold text-slate-800">
                        {row.plateNumber}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-slate-600">
                        {row.factory}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">{row.driverName}</div>
                        <div className="text-[11px] text-slate-400">{row.driverPhone}</div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-slate-600 font-semibold">
                        {row.mileage.toLocaleString()} กม.
                      </td>
                      <td className="px-6 py-4.5 max-w-xs truncate">
                        {defected.length === 0 ? (
                          <span className="text-emerald-600 font-bold text-xs">✓ ปกติทุกจุด</span>
                        ) : (
                          <span className="text-rose-600 text-xs font-semibold leading-snug">
                            ⚠ ชำรุด {defected.length} จุด: {defected.slice(0, 2).join(', ')}
                            {defected.length > 2 && '...'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <Badge status={row.status} />
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenMechanicModal(row)}
                            className="flex items-center gap-1.5 text-xs py-1 rounded-lg"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            จัดการ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ==========================================
          MECHANIC DIALOG / MODAL (ป๊อปอัปจัดการข้อมูลช่าง)
          ========================================== */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`ใบตรวจสภาพรถ: ${selectedInspection?.plateNumber}`}
      >
        {selectedInspection && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* ข้อมูลประวัติและคนขับย่อ */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-100">
              <div>
                <p className="text-slate-400">พนักงานขับรถ:</p>
                <p className="font-bold text-slate-700 mt-0.5">{selectedInspection.driverName}</p>
                <p className="text-slate-400 mt-1">เบอร์โทรศัพท์:</p>
                <p className="font-semibold text-slate-600">{selectedInspection.driverPhone}</p>
              </div>
              <div>
                <p className="text-slate-400">สังกัดโรงงาน:</p>
                <p className="font-bold text-slate-700 mt-0.5">{selectedInspection.factory}</p>
                <p className="text-slate-400 mt-1">กะงาน / เลขไมล์:</p>
                <p className="font-semibold text-slate-600 mt-0.5">
                  {selectedInspection.shift.split(' ')[0]} / {selectedInspection.mileage.toLocaleString()} กม.
                </p>
              </div>
            </div>

            {/* รายการที่มีจุดชำรุด */}
            <div>
              <h4 className="font-bold text-sm text-slate-800 mb-2.5 flex items-center gap-2">
                🔎 ผลการตรวจเช็ก 21 จุด
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHECKLIST_ITEMS.map((item) => {
                  const isNormal = (selectedInspection.items as Record<string, boolean>)[item.key] ?? true;
                  return (
                    <div 
                      key={item.key} 
                      className={`p-2 rounded-lg flex items-center justify-between text-xs border ${
                        isNormal 
                          ? 'bg-slate-50/50 border-slate-100 text-slate-500' 
                          : item.isCritical 
                            ? 'bg-rose-50 border-rose-100 text-rose-800 font-semibold' 
                            : 'bg-amber-50 border-amber-100 text-amber-800 font-semibold'
                      }`}
                    >
                      <span className="truncate pr-1">{item.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        isNormal ? 'bg-slate-200/50 text-slate-600' : 'bg-white text-rose-700 shadow-sm border border-rose-100'
                      }`}>
                        {isNormal ? 'ปกติ' : 'ชำรุด'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* รูปภาพหลักฐาน (พรีวิว Carousel ย่อ) */}
            {(selectedInspection.images as string[]).length > 0 && (
              <div>
                <h4 className="font-bold text-sm text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-blue-900" />
                  รูปถ่ายแนบประกอบ ({ (selectedInspection.images as string[]).length } ภาพ)
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {(selectedInspection.images as string[]).map((img, idx) => (
                    <div key={idx} className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 hover:scale-105 transition-transform duration-200 cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={img} 
                        alt={`Evidence ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        onClick={() => {
                          // เปิดรูปในแท็บใหม่เพื่อขยายภาพ
                          const newTab = window.open();
                          if (newTab) newTab.document.write(`<img src="${img}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ฟอร์มการแก้สถานะของช่าง */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                ⚙️ การจัดการบำรุงรักษาโดยช่าง
              </h4>

              {/* แสดงรายละเอียดการซ่อมหากซ่อมเสร็จแล้ว */}
              {selectedInspection.status === 'ซ่อมเสร็จสิ้น' ? (
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl text-xs text-sky-800 space-y-2">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-600" />
                    คิวซ่อมแซมเสร็จสมบูรณ์เรียบร้อยแล้ว
                  </p>
                  {selectedInspection.repairedAt && (
                    <p className="text-[10px] text-sky-700/80">
                      เวลาซ่อมบำรุง: {new Date(selectedInspection.repairedAt).toLocaleString('th-TH')} น.
                    </p>
                  )}
                  {selectedInspection.mechanicNotes && (
                    <div className="mt-1 bg-white p-2 rounded-lg border border-sky-100 font-medium">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">บันทึกช่าง:</p>
                      <p className="text-slate-700 text-xs mt-0.5">{selectedInspection.mechanicNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* ช่องกรอกหมายเหตุของช่าง */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500">หมายเหตุการซ่อมบำรุง / รายละเอียดการเปลี่ยนอะไหล่</label>
                    <textarea
                      placeholder="กรอกรายละเอียดอะไหล่ที่เปลี่ยน งานซ่อม หรือเหตุผลการอนุมัติวิ่ง..."
                      value={mechanicNotes}
                      onChange={(e) => setMechanicNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-800 bg-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* ปุ่มคำสั่งของช่าง */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 text-xs rounded-xl"
                      disabled={submitting}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveRepair}
                      className="flex-1 text-xs rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/10 border-none"
                      disabled={submitting}
                    >
                      {submitting ? 'กำลังบันทึก...' : 'ซ่อมเสร็จสิ้น & อนุมัติวิ่ง'}
                    </Button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </Dialog>

    </div>
  );
}
