// src/app/reports/page.tsx
// หน้าจอรายงาน 31 วันในรูปแบบตาราง Matrix (VIEW 4: PDF Reports)
// จัดทำตารางประเมินผล 21 จุด x 31 วัน พร้อมปุ่มเปิดระบบพิมพ์ออกมาเป็นรายงาน PDF ขนาดกระดาษ A4 แนวนอน

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Filter, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button 
} from '@/components/ui';
import { CHECKLIST_ITEMS } from '@/lib/utils';
import { InspectionRecord } from '@/lib/db';

export default function ReportsPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [plates, setPlates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ฟิลเตอร์รายงาน
  const [selectedPlate, setSelectedPlate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    // คืนค่ารูปแบบ YYYY-MM
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // โหลดรายการทั้งหมดเพื่อแยกป้ายทะเบียนรถที่มีในระบบ
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await fetch('/api/inspections');
        const data = await res.json();
        if (data.success && active) {
          setInspections(data.data);
          
          // สกัดป้ายทะเบียนรถบัสที่ไม่ซ้ำกันในระบบ
          const uniquePlates: string[] = Array.from(
            new Set((data.data as InspectionRecord[]).map(item => item.plateNumber))
          );
          setPlates(uniquePlates);

          // ตั้งค่าตัวเลือกป้ายทะเบียนเริ่มต้นหากมีข้อมูล
          if (uniquePlates.length > 0 && !selectedPlate) {
            setSelectedPlate(uniquePlates[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    
    // ดีเฟอร์การปรับค่าสถานะเพื่อหลีกเลี่ยงข้อผิดพลาดการเกิด Cascading Renders
    const timer = setTimeout(() => {
      if (active) {
        setLoading(true);
        loadData();
      }
    }, 0);
    
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedPlate]);

  // คำนวณจำนวนวันในเดือนที่เลือก (28, 29, 30, 31 วัน)
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ชื่อเดือนภาษาไทยสำหรับแสดงบนหัวรายงาน
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiMonthName = thaiMonths[month - 1];
  const thaiYear = year + 543;

  // กรองข้อมูลการตรวจของทะเบียนรถและเดือนที่เลือก
  const getMatrixData = () => {
    if (!selectedPlate) return {};

    const filtered = inspections.filter(item => {
      const itemDate = new Date(item.createdAt);
      const isSameVehicle = item.plateNumber === selectedPlate;
      const isSameMonth = itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month;
      return isSameVehicle && isSameMonth;
    });

    // แมปข้อมูลลงรายวัน: { [วันที]: { [itemKey]: boolean } }
    const dailyMap: Record<number, Record<string, boolean>> = {};
    
    // เรียงจากเก่าไปใหม่ เพื่อให้การตรวจหลังสุดของวันนั้นๆ ทับข้อมูล
    const sorted = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    sorted.forEach(record => {
      const day = new Date(record.createdAt).getDate();
      dailyMap[day] = record.items as Record<string, boolean>;
    });

    return dailyMap;
  };

  const matrixData = getMatrixData();

  // ฟังก์ชันพิมพ์รายงาน PDF
  const handlePrint = () => {
    if (!selectedPlate) {
      alert('กรุณาเลือกทะเบียนรถบัสก่อนสั่งพิมพ์');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* สไตล์การจัดหน้าสำหรับพิมพ์ลงกระดาษ A4 แนวนอน (Print layout configuration) */}
      <style jsx global>{`
        @media print {
          /* ซ่อนเมนูนำทาง Sidebar, Header และตัวกรองทั้งหมด */
          header, aside, main > div:first-child, .no-print {
            display: none !important;
          }
          /* ขยายขอบกระดาษเป็น 100% */
          body, html, main {
            background: #fff !important;
            color: #000 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
          }
          /* ตั้งค่ากระดาษหน้าแนวนอน (A4 Landscape) */
          @page {
            size: A4 landscape;
            margin: 0.8cm;
          }
          /* คอนเทนเนอร์สำหรับพิมพ์ */
          .print-container {
            display: block !important;
            width: 100% !important;
            font-size: 9px !important;
          }
          /* ปรับความคมชัดขอบตาราง */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 3px 2px !important;
            font-size: 8px !important;
            text-align: center !important;
          }
          .critical-row {
            background-color: #fef2f2 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* ==========================================
          FILTER BAR (กล่องเลือกรายงาน - ซ่อนตอนปริ้น)
          ========================================== */}
      <Card className="no-print">
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-900" />
            ตัวกรองรายงาน Matrix 31 วัน
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            
            {/* เลือกป้ายทะเบียนรถที่มีในระบบ */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500">เลือกทะเบียนรถบัส</label>
              <select
                value={selectedPlate}
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-700 bg-white cursor-pointer"
                disabled={plates.length === 0}
              >
                {plates.length === 0 ? (
                  <option value="">ไม่มีข้อมูลทะเบียนรถในระบบ</option>
                ) : (
                  plates.map(plate => (
                    <option key={plate} value={plate}>{plate}</option>
                  ))
                )}
              </select>
            </div>

            {/* เลือกเดือน/ปีที่สร้างรายงาน */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500">ประจำเดือน / ปี</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-900 focus:outline-none text-slate-700 bg-white cursor-pointer"
              />
            </div>

            {/* ปุ่มกดพิมพ์รายงาน */}
            <Button
              variant="primary"
              onClick={handlePrint}
              className="rounded-xl flex items-center justify-center gap-2 h-11"
              disabled={plates.length === 0}
            >
              <Printer className="h-4 w-4" />
              พิมพ์รายงาน PDF (A4 แนวนอน)
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* ==========================================
          MATRIX REPORT SHEET (แผ่นรายงานกระดาษจริง)
          ========================================== */}
      {loading ? (
        <Card className="no-print">
          <CardContent className="py-16 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-900 mb-3" />
            <p className="font-bold text-slate-600">กำลังเรียกประวัติรายงานรถบัส...</p>
          </CardContent>
        </Card>
      ) : plates.length === 0 ? (
        <Card className="no-print">
          <CardContent className="py-16 text-center text-slate-400">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="font-bold text-slate-600">ไม่พบทะเบียนรถบัสในระบบ</p>
            <p className="text-xs text-slate-400 mt-1">กรุณากรอกฟอร์มตรวจสภาพรถอย่างน้อย 1 รายการเพื่อริเริ่มข้อมูล</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="print-container overflow-hidden bg-white p-6 sm:p-8 border border-slate-100 shadow-lg">
          
          {/* ส่วนหัวแผ่นกระดาษรายงานส่งผู้บริหาร */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold bg-blue-900 text-white px-2.5 py-0.5 rounded uppercase tracking-wider">
                Thailux Transportation Report
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                รายงานสรุปสภาพรถบัสประจำวัน (Daily Inspection Matrix Sheet)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                ประจำเดือน <span className="font-bold text-slate-800">{thaiMonthName} พ.ศ. {thaiYear}</span>
              </p>
            </div>
            
            <div className="text-right text-xs text-slate-500 font-medium bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p>ทะเบียนรถบัส: <span className="font-bold text-slate-900 text-sm">{selectedPlate}</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">ฝ่ายตรวจสอบมาตรฐานยานยนต์ Thailux</p>
            </div>
          </div>

          {/* ส่วนตารางความปลอดภัย 21 จุด x 31 วัน */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border border-slate-200">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-300 text-[10px] font-extrabold text-slate-600">
                  <th className="px-2 py-3 text-left border-r border-slate-200 min-w-[150px] sm:min-w-[200px]">
                    หัวข้อรายการตรวจสอบความปลอดภัย (21 จุด)
                  </th>
                  {daysArray.map(day => (
                    <th key={day} className="px-1 py-3 border-r border-slate-200 min-w-[20px] font-bold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {CHECKLIST_ITEMS.map((item) => (
                  <tr 
                    key={item.key} 
                    className={item.isCritical ? "bg-rose-50/20 hover:bg-slate-50 critical-row" : "hover:bg-slate-50"}
                  >
                    {/* ชื่อจุดเช็กและเครื่องหมายวิกฤต */}
                    <td className="px-2.5 py-2 text-left font-medium text-slate-700 border-r border-slate-200 flex items-center justify-between gap-1">
                      <span className="truncate">{item.label}</span>
                      {item.isCritical && (
                        <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1 rounded scale-90 shrink-0">
                          วิกฤต
                        </span>
                      )}
                    </td>

                    {/* แสดงผลของแต่ละวัน */}
                    {daysArray.map(day => {
                      const dayData = matrixData[day];
                      const status = dayData ? dayData[item.key] : undefined;

                      return (
                        <td 
                          key={day} 
                          className={`border-r border-slate-200 p-1 font-bold ${
                            status === true 
                              ? "text-emerald-600" 
                              : status === false 
                                ? "text-rose-600" 
                                : "text-slate-300 font-normal"
                          }`}
                        >
                          {status === true && '✓'}
                          {status === false && '✗'}
                          {status === undefined && '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* สัญลักษณ์ความหมายตาราง */}
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-wrap gap-5 text-xs text-slate-500 font-semibold">
            <span className="text-slate-400 font-bold">ความหมายสัญลักษณ์:</span>
            <span className="flex items-center gap-1.5 text-emerald-600">✓ ปกติ (ผ่านเกณฑ์)</span>
            <span className="flex items-center gap-1.5 text-rose-600">✗ ชำรุด (ไม่ผ่านเกณฑ์)</span>
            <span className="flex items-center gap-1.5 text-slate-400">- ไม่มีบันทึกข้อมูลตรวจสภาพ</span>
          </div>

          {/* ==========================================
              SIGNATURES PANEL (แผงลงลายมือชื่อพยาน - แสดงตอนปริ้น)
              ========================================== */}
          <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs font-semibold text-slate-600">
            <div className="space-y-6">
              <p>ผู้จัดทำ / รายงานสภาพ</p>
              <div className="h-px bg-slate-300 mx-auto w-40" />
              <p className="text-[10px] text-slate-400 mt-1">( ลงชื่อพนักงานขับรถบัส )</p>
            </div>
            <div className="space-y-6">
              <p>ผู้ตรวจสอบการแก้ไข</p>
              <div className="h-px bg-slate-300 mx-auto w-40" />
              <p className="text-[10px] text-slate-400 mt-1">( ลงชื่อวิศวกร/หัวหน้าช่างบำรุง )</p>
            </div>
            <div className="space-y-6">
              <p>ผู้อนุมัติผลความปลอดภัย</p>
              <div className="h-px bg-slate-300 mx-auto w-40" />
              <p className="text-[10px] text-slate-400 mt-1">( ลงชื่อผู้จัดการฝ่ายขนส่ง Thailux )</p>
            </div>
          </div>

        </Card>
      )}

    </div>
  );
}
