// src/app/maintenance/page.tsx
// หน้าจอประวัติการซ่อมบำรุง (Maintenance Log View)
// ออกแบบสำหรับทีมช่างแยกงานซ่อมออกเป็นคิวงานที่ค้างอยู่ (Pending Queue) และประวัติที่ปิดงานแล้ว (Completed Logs)

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  Search, 
  AlertTriangle, 
  ClipboardList,
  RefreshCw,
  Phone,
  Camera
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  Badge, 
  Dialog 
} from '@/components/ui';
import { CHECKLIST_ITEMS, cn } from '@/lib/utils';
import { InspectionRecord } from '@/lib/db';

export default function MaintenanceLogPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<InspectionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [userRole, setUserRole] = useState<string>('OFFICE');

  // สเตตสำหรับพรีวิวรูปภาพ
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // โหลด Role ผู้ใช้งานจาก localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('thailux_session_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.role) {
            setTimeout(() => {
              setUserRole(user.role);
            }, 0);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleOpenImageModal = (imgUrl: string, plateNumber: string) => {
    setPreviewImageUrl(imgUrl);
    setPreviewTitle(`รูปถ่ายหลักฐาน: ${plateNumber}`);
    setIsPreviewOpen(true);
  };

  // ดึงข้อมูลการซ่อมทั้งหมดจากฐานข้อมูล
  const fetchMaintenanceJobs = useCallback(async () => {
    setLoading(true);
    try {
      // ดึงข้อมูลทั้งหมดก่อน แล้วค่อยนำมาคัดแยกฟิลเตอร์ที่ Client-side เพื่อแบ่งแท็บ
      const res = await fetch('/api/inspections');
      const data = await res.json();
      if (data.success) {
        setInspections(data.data);
      }
    } catch (err) {
      console.error('Error fetching maintenance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaintenanceJobs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMaintenanceJobs]);

  // ฟังก์ชันแยกข้อมูลระหว่าง คิวซ่อม และ ประวัติซ่อมเสร็จ
  const getFilteredJobs = () => {
    return inspections.filter(item => {
      // 1. คัดตามแท็บหลัก
      const matchesTab = activeTab === 'pending'
        ? (item.status === 'รอคิวซ่อม' || item.status === 'ระงับการวิ่ง')
        : (item.status === 'ซ่อมเสร็จสิ้น');

      if (!matchesTab) return false;

      // 2. คัดกรองเพิ่มเติมตามคำค้นหา
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.plateNumber.toLowerCase().includes(query) ||
          item.driverName.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  // ดึงลิสต์ของจุดชำรุด
  const getDefectedItems = (items: Record<string, boolean>) => {
    const list: { label: string; isCritical: boolean }[] = [];
    CHECKLIST_ITEMS.forEach(def => {
      if (items[def.key] === false) {
        list.push({ label: def.label, isCritical: def.isCritical });
      }
    });
    return list;
  };

  // เปิดแบบฟอร์มซ่อม
  const handleOpenRepair = (job: InspectionRecord) => {
    if (userRole === 'OFFICE') return;
    setSelectedJob(job);
    setMechanicNotes(job.mechanicNotes || '');
    setIsModalOpen(true);
  };

  // ส่งบันทึกการซ่อมแซม
  const handleSaveRepair = async () => {
    if (!selectedJob) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/inspections/${selectedJob.id}`, {
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
        fetchMaintenanceJobs(); // โหลดข้อมูลคิวใหม่
      } else {
        alert(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = getFilteredJobs();
  const pendingCount = inspections.filter(item => item.status === 'รอคิวซ่อม' || item.status === 'ระงับการวิ่ง').length;
  const completedCount = inspections.filter(item => item.status === 'ซ่อมเสร็จสิ้น').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ส่วนหัวหน้าจอ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Wrench className="text-blue-900 h-6.5 w-6.5" />
            ประวัติและคิวงานซ่อมบำรุง
          </h2>
          <p className="text-xs text-slate-500 mt-1">บริหารคิวงานบำรุงรักษารถบัสที่มีจุดชำรุดจากการรายงานประจำวัน</p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchMaintenanceJobs}
          className="flex items-center gap-2 rounded-lg hover:bg-slate-100"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          รีเฟรชข้อมูล
        </Button>
      </div>

      {/* ==========================================
          TABS & SEARCH BAR (การสลับแท็บและสืบค้น)
          ========================================== */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* แท็บสลับหน้าคิวงาน */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === 'pending'
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            )}
          >
            <Clock className="h-4 w-4" />
            คิวงานซ่อมค้างอยู่ ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === 'completed'
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            )}
          >
            <CheckCircle className="h-4 w-4" />
            ประวัติซ่อมเสร็จแล้ว ({completedCount})
          </button>
        </div>

        {/* ช่องพิมพ์สืบค้นเฉพาะหน้านี้ */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาทะเบียนรถบัส / ชื่อนายช่าง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-700 bg-white"
          />
        </div>
      </div>

      {/* ==========================================
          LIST OF JOBS (การแสดงผลงานซ่อมบำรุง)
          ========================================== */}
      {loading && filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-900 mb-4" />
          กำลังเรียกคิวข้อมูลงานซ่อม...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
          <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-sm text-slate-500">ไม่มีคิวงานที่ต้องดำเนินการในแท็บนี้</p>
          <p className="text-xs text-slate-400 mt-1">ยินดีด้วย! รถบัสทุกคันในสังกัดปกติดีทั้งหมด</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => {
            const defected = getDefectedItems(job.items as Record<string, boolean>);
            
            return (
              <Card key={job.id} className="border-t-4 border-t-blue-900 hover:scale-[1.01] transition-transform duration-200">
                <CardHeader className="bg-slate-50/30 flex flex-row items-center justify-between py-4.5">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{job.plateNumber}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">โรงงาน: {job.factory} • {job.shift.split(' ')[0]}</p>
                  </div>
                  <Badge status={job.status} />
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* ข้อมูลรายงานโดยคนขับ */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-slate-400">ผู้รายงานสภาพ:</p>
                      <p className="font-bold text-slate-700 mt-0.5">{job.driverName}</p>
                      <p className="text-slate-400 mt-1.5">เลขไมล์วิ่ง:</p>
                      <p className="font-semibold text-slate-600">{job.mileage.toLocaleString()} กม.</p>
                    </div>
                    <div>
                      <p className="text-slate-400">วันที่พบรายงานชำรุด:</p>
                      <p className="font-semibold text-slate-600 mt-0.5">
                        {new Date(job.createdAt).toLocaleDateString('th-TH')} - {new Date(job.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </p>
                      <p className="text-slate-400 mt-1.5">เบอร์โทรศัพท์ติดต่อ:</p>
                      <p className="font-semibold text-slate-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {job.driverPhone}
                      </p>
                    </div>
                  </div>

                  {/* สรุปส่วนชำรุด */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">จุดบกพร่องที่ตรวจพบ ({defected.length} หัวข้อ):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {defected.map((def, idx) => (
                        <span 
                          key={idx} 
                          className={cn(
                            "text-[10px] px-2.5 py-1 rounded-lg font-bold border",
                            def.isCritical 
                              ? "bg-rose-50 border-rose-100 text-rose-700" 
                              : "bg-amber-50 border-amber-100 text-amber-700"
                          )}
                        >
                          {def.isCritical && '🚨 '}{def.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* รูปภาพหลักฐานแนบมา */}
                  {job.images && (job.images as string[]).length > 0 && (
                    <div className="pt-2 border-t border-slate-50">
                      <p className="text-[10px] font-bold text-slate-500 mb-2 flex items-center gap-1">
                        <Camera className="h-3.5 w-3.5 text-blue-900" />
                        รูปถ่ายแนบประกอบ ({ (job.images as string[]).length } ภาพ):
                      </p>
                      <div className="flex gap-2">
                        {(job.images as string[]).map((img, idx) => (
                          <div 
                            key={idx} 
                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:scale-105 hover:border-blue-900 transition-all duration-150 cursor-pointer shadow-sm"
                            title="คลิกเพื่อขยายรูปภาพ"
                            onClick={() => handleOpenImageModal(img, job.plateNumber)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="Evidence thumbnail" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* หมายเหตุช่าง (ถ้ามี/ปิดงานซ่อมเสร็จ) */}
                  {job.status === 'ซ่อมเสร็จสิ้น' && (
                    <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-xl text-xs text-sky-800 space-y-1">
                      <p className="font-bold">✅ รายการซ่อมแซมเรียบร้อยแล้ว</p>
                      {job.repairedAt && (
                        <p className="text-[10px] text-sky-600">
                          ซ่อมเสร็จเมื่อ: {new Date(job.repairedAt).toLocaleString('th-TH')} น.
                        </p>
                      )}
                      {job.mechanicNotes && (
                        <p className="mt-1 bg-white p-2 rounded-lg border border-sky-100 text-slate-700 font-medium">
                          <span className="font-bold text-[10px] text-slate-400 block mb-0.5">บันทึกหน้างาน:</span>
                          {job.mechanicNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ปุ่มกดจัดการซ่อมแซม */}
                  {job.status !== 'ซ่อมเสร็จสิ้น' && userRole !== 'OFFICE' && (
                    <Button
                      variant="primary"
                      onClick={() => handleOpenRepair(job)}
                      className="w-full text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/10 border-none"
                    >
                      <Wrench className="h-4 w-4" />
                      ดำเนินการซ่อมบำรุงรถบัส
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ==========================================
          REPAIR INPUT DIALOG (ป๊อปอัปกรอกผลซ่อมแซม)
          ========================================== */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`จัดการซ่อมแซมรถบัสทะเบียน: ${selectedJob?.plateNumber}`}
      >
        {selectedJob && (
          <div className="space-y-5">
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800">
              <p className="font-bold flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                จุดที่พนักงานขับรถรายงานว่า ชำรุด
              </p>
              <ul className="list-disc pl-4 space-y-1">
                {getDefectedItems(selectedJob.items as Record<string, boolean>).map((item, idx) => (
                  <li key={idx} className={item.isCritical ? "font-bold text-rose-700" : "text-slate-700"}>
                    {item.label} {item.isCritical && '*(จุดวิกฤตทางความปลอดภัย)'}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500">บันทึกขั้นตอนการตรวจเช็กและแก้ไขอะไหล่</label>
              <textarea
                placeholder="อธิบายรายละเอียดการแก้ไข เช่น อัดจารบี เปลี่ยนผ้าเบรกหน้า ซ่อมหลอดไฟท้ายชำรุด หรือตรวจสอบระบบแอร์แล้วพบว่าพัดลมเสีย..."
                value={mechanicNotes}
                onChange={(e) => setMechanicNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-800 bg-white placeholder:text-slate-400"
              />
            </div>

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
                {submitting ? 'กำลังจัดส่ง...' : 'ยืนยันการซ่อมเสร็จ & อนุมัติออกวิ่ง'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ==========================================
          IMAGE PREVIEW DIALOG (ป๊อปอัปพรีวิวรูปภาพขนาดใหญ่)
          ========================================== */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={previewTitle}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-full max-h-[70vh] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewImageUrl} 
              alt="Evidence Large Preview" 
              className="max-w-full max-h-[65vh] rounded-xl object-contain shadow-md"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setIsPreviewOpen(false)}
            className="mt-5 text-xs px-6 rounded-xl"
          >
            ปิดหน้าต่าง
          </Button>
        </div>
      </Dialog>

    </div>
  );
}
