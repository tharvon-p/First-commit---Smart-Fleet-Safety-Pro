// src/app/inspection/page.tsx
// หน้าจอสำหรับคนขับรถบัสกรอกฟอร์มตรวจสภาพประจำวัน (VIEW 1: Mobile-First Inspection Form)
// มีการทำงานแบบหลายขั้นตอน (Step-by-step) เพื่อให้ใช้งานได้ง่ายบนหน้าจออุปกรณ์พกพา

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  ChevronRight, 
  ChevronLeft, 
  Send,
  X,
  ClipboardCheck
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  FormInput, 
  FormSelect, 
  InspectionToggle 
} from '@/components/ui';
import { CHECKLIST_ITEMS, STATUS_THEME } from '@/lib/utils';
import { InspectionRecord } from '@/lib/db';

export default function InspectionFormPage() {
  const router = useRouter();

  // สถานะขั้นตอนของฟอร์ม (Step: 1 = ข้อมูลทั่วไป, 2 = ตรวจเช็ก 21 จุด, 3 = แนบหลักฐานและบันทึก)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<InspectionRecord | null>(null);

  // 1. ข้อมูล Profile และ ข้อมูลการวิ่ง
  const [formData, setFormData] = useState({
    factory: 'KCE',
    plateNumber: '',
    driverName: '',
    driverPhone: '',
    shift: 'กะเช้า (06:00 - 18:00)',
    mileage: '',
  });

  // สถานะสำหรับระบบโปรไฟล์ พขร. รายป้ายทะเบียน
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // 2. ข้อมูลเช็กลิสต์ 21 จุด (ตั้งค่าเริ่มต้นให้ "ปกติ = true" ทุกข้อ)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initial[item.key] = true;
    });
    return initial;
  });

  // 3. รูปภาพอัปโหลด 3 ช่อง (เก็บเป็น base64 strings สำหรับพรีวิวและเซฟ)
  const [uploadedImages, setUploadedImages] = useState<string[]>(['', '', '']);

  // จัดการอัปเดตฟิลด์ข้อมูลทั่วไป
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // จัดการอัปเดตค่าเช็กลิสต์ 21 จุด
  const handleToggleChange = (key: string, val: boolean) => {
    setChecklist(prev => ({ ...prev, [key]: val }));
  };

  // จำลองการอัปโหลดและแปลงเป็น Base64 สำหรับจัดเก็บและแสดงตัวอย่าง
  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImages(prev => {
          const updated = [...prev];
          updated[index] = base64String;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // ลบรูปภาพที่แนบไป
  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const updated = [...prev];
      updated[index] = '';
      return updated;
    });
  };

  // ค้นหาข้อมูลโปรไฟล์คนขับรถบัสตามทะเบียนรถ
  const checkDriverProfile = async (plateNum: string) => {
    if (!plateNum || plateNum.trim().length < 3) return;
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/driver-profile?plateNumber=${encodeURIComponent(plateNum.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        const profile = data.data;
        setFormData(prev => ({
          ...prev,
          driverName: profile.driverName,
          driverPhone: profile.driverPhone,
          factory: profile.factory,
          shift: profile.shift,
        }));
        setDriverPhoto(profile.photo);
        setHasProfile(true);
        setIsEditingProfile(false);
      } else {
        // ลองดึงค่าจาก cache localStorage เผื่อกรณีอินเทอร์เน็ตมีปัญหา
        const cachedStr = localStorage.getItem(`thailux_profile_${plateNum.trim()}`);
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            setFormData(prev => ({
              ...prev,
              driverName: cached.driverName,
              driverPhone: cached.driverPhone,
              factory: cached.factory,
              shift: cached.shift,
            }));
            setDriverPhoto(cached.photo || null);
            setHasProfile(true);
            setIsEditingProfile(false);
          } catch {
            setHasProfile(false);
            setIsEditingProfile(true);
          }
        } else {
          // ไม่พบข้อมูล
          setHasProfile(false);
          setIsEditingProfile(true);
        }
      }
    } catch (err) {
      console.error('Error checking driver profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // ดักจับและแปลงไฟล์รูปโปรไฟล์ พขร. เป็น Base64
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriverPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePhoto = () => {
    setDriverPhoto(null);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.plateNumber || !formData.driverName || !formData.driverPhone || !formData.mileage) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนไปขั้นตอนถัดไป');
        return;
      }
      const numMileage = parseInt(formData.mileage, 10);
      if (isNaN(numMileage) || numMileage <= 0) {
        alert('กรุณากรอกเลขไมล์ปัจจุบันให้ถูกต้อง (ต้องเป็นตัวเลขมากกว่า 0)');
        return;
      }
    }
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // จัดส่งข้อมูล (Submit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submissionData = {
        ...formData,
        mileage: parseInt(formData.mileage, 10),
        items: checklist,
        images: uploadedImages.filter(img => img !== ''), // กรองเฉพาะช่องที่มีรูปภาพ
        driverPhoto: driverPhoto // ส่งรูปโปรไฟล์คนขับไปด้วย
      };

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessData(data.data);
        // แคชเก็บข้อมูลโปรไฟล์ในเครื่องทันทีหลังตรวจผ่านสำเร็จ
        try {
          localStorage.setItem(
            `thailux_profile_${formData.plateNumber.trim()}`,
            JSON.stringify({
              driverName: formData.driverName,
              driverPhone: formData.driverPhone,
              factory: formData.factory,
              shift: formData.shift,
              photo: driverPhoto,
            })
          );
        } catch (err) {
          console.error('Failed to cache profile locally:', err);
        }
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  // แยกกลุ่มจุดเช็กตามหมวดหมู่เพื่อการแสดงผลที่สวยงามบน Mobile
  const categories = Array.from(new Set(CHECKLIST_ITEMS.map(item => item.category)));

  // ==========================================
  // VIEW: บันทึกข้อมูลสำเร็จ (Success Page)
  // ==========================================
  if (successData) {
    const statusText = successData.status;
    const theme = STATUS_THEME[statusText] || STATUS_THEME['ปกติ'];

    return (
      <div className="max-w-md mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl text-center w-full">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-emerald-50 mb-6 border-2 border-emerald-500/20">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>

          <h3 className="text-2xl font-extrabold text-slate-800">ส่งรายงานสภาพรถสำเร็จ!</h3>
          <p className="text-sm text-slate-400 mt-1">ขอบคุณที่ร่วมรักษามาตรฐานความปลอดภัยในการขับขี่</p>

          {/* สรุปข้อมูลผลตรวจ */}
          <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
              <span className="text-xs text-slate-500">ทะเบียนรถบัส</span>
              <span className="text-sm font-bold text-slate-800">{successData.plateNumber}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
              <span className="text-xs text-slate-500">พนักงานขับรถ</span>
              <span className="text-sm font-bold text-slate-800">{successData.driverName}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
              <span className="text-xs text-slate-500">เลขไมล์ปัจจุบัน</span>
              <span className="text-sm font-bold text-slate-800">{successData.mileage.toLocaleString()} กม.</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">สถานะประเมินผล</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${theme.bg}`}>
                {statusText}
              </span>
            </div>
          </div>

          {/* ข้อความแจ้งเตือนตามสถานะรถ */}
          {statusText === 'ปกติ' && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-xs font-medium text-center mb-6">
              🟢 รถของคุณอยู่ในสภาพสมบูรณ์เรียบร้อยดี สามารถขับขี่ออกทริปได้ตามปกติ
            </div>
          )}
          {statusText === 'รอคิวซ่อม' && (
            <div className="bg-amber-50 text-amber-800 border border-amber-200 p-4 rounded-xl text-xs font-medium text-center mb-6 leading-relaxed">
              ⚠️ พบจุดชำรุดเล็กน้อยที่ไม่กระทบการวิ่งวิกฤต คุณสามารถวิ่งกะนี้ได้ แต่โปรดแจ้งศูนย์ซ่อมบำรุงเพื่อคิวคิวซ่อมโดยด่วน
            </div>
          )}
          {statusText === 'ระงับการวิ่ง' && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl text-xs font-semibold text-center mb-6 leading-relaxed">
              🚨 **ระงับการวิ่งทันที** เนื่องจากพบจุดชำรุดที่เป็นอันตรายต่อความปลอดภัย ห้ามนำรถออกวิ่งและโปรดติดต่อหัวหน้าช่างทันที!
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Button 
              variant="primary" 
              onClick={() => {
                // รีเซ็ตฟอร์มกลับไปเริ่มต้นใหม่
                setSuccessData(null);
                setStep(1);
                setFormData({
                  factory: 'KCE',
                  plateNumber: '',
                  driverName: '',
                  driverPhone: '',
                  shift: 'กะเช้า (06:00 - 18:00)',
                  mileage: '',
                });
                setDriverPhoto(null);
                setHasProfile(false);
                setIsEditingProfile(false);
                setUploadedImages(['', '', '']);
                const initial: Record<string, boolean> = {};
                CHECKLIST_ITEMS.forEach(item => {
                  initial[item.key] = true;
                });
                setChecklist(initial);
              }}
            >
              เขียนฟอร์มตรวจใหม่
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              กลับไปหน้าแดชบอร์ด
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: แบบฟอร์มกรอกข้อมูลการตรวจ (Form Page)
  // ==========================================
  return (
    <div className="max-w-md mx-auto py-2 px-1 lg:py-6">
      {/* ส่วนหัวหน้าเว็บ (Mobile design) */}
      <div className="mb-6 text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <ClipboardCheck className="text-blue-900 h-6 w-6" />
          ตรวจสภาพรถประจำวัน
        </h2>
        <p className="text-xs text-slate-500 mt-1">แบบฟอร์มตรวจสอบความปลอดภัย 21 จุดก่อนนำรถออกปฏิบัติงาน</p>
      </div>

      {/* แถบระบุขั้นตอน (Step indicator) */}
      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center flex-1 justify-center last:flex-none">
            <div className="flex items-center gap-1.5">
              <span className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === num 
                  ? 'bg-blue-900 text-white' 
                  : step > num 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 text-slate-500'
              }`}>
                {step > num ? '✓' : num}
              </span>
              <span className={`text-[10px] sm:text-xs font-bold hidden sm:inline ${
                step === num ? 'text-blue-900' : 'text-slate-400'
              }`}>
                {num === 1 && 'ข้อมูลทั่วไป'}
                {num === 2 && 'เช็กลิสต์ 21 จุด'}
                {num === 3 && 'หลักฐานและยืนยัน'}
              </span>
            </div>
            {num < 3 && <div className="h-0.5 bg-slate-100 flex-1 mx-2" />}
          </div>
        ))}
      </div>

      {/* ฟอร์มจัดการ */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ==========================================
            ขั้นตอนที่ 1: ข้อมูลประวัติและข้อมูลวิ่ง
            ========================================== */}
        {step === 1 && (
          <Card className="animate-in slide-in-from-right-5 duration-200">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <User className="h-5 w-5 text-blue-900" />
                ขั้นตอนที่ 1: ข้อมูลคนขับและรถยนต์
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ทะเบียนรถบัส (กรอกก่อนเพื่อดึงข้อมูล) */}
              <div className="space-y-1">
                <FormInput
                  label="ทะเบียนรถบัส"
                  name="plateNumber"
                  placeholder="เช่น 30-1234 กทม."
                  value={formData.plateNumber}
                  onChange={handleInputChange}
                  onBlur={() => checkDriverProfile(formData.plateNumber)}
                  required
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-slate-400">
                    * เมื่อกรอกทะเบียนรถและกดออกนอกช่อง ระบบจะดึงโปรไฟล์ พขร. เก่าอัตโนมัติ
                  </span>
                  {loadingProfile && (
                    <span className="text-[10px] text-blue-900 font-bold animate-pulse">
                      กำลังค้นหาโปรไฟล์...
                    </span>
                  )}
                </div>
              </div>

              {/* การ์ดโปรไฟล์ พขร. เดิมที่พบในระบบ */}
              {hasProfile && !isEditingProfile && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-200 flex-shrink-0 flex items-center justify-center relative">
                      {driverPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={driverPhoto} 
                          alt="Driver Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-800 text-sm">{formData.driverName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        📞 {formData.driverPhone}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        🏢 สังกัด: {formData.factory} • {formData.shift}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                    <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      ✓ พบโปรไฟล์ พขร. พร้อมใช้
                    </span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="text-xs py-1 h-8 px-3 border-blue-200 text-blue-900 hover:bg-blue-50"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      แก้ไขโปรไฟล์
                    </Button>
                  </div>
                </div>
              )}

              {/* แบบฟอร์มลงทะเบียน พขร. ใหม่ หรือ เมื่อต้องการแก้ไขข้อมูล */}
              {(!hasProfile || isEditingProfile) && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {hasProfile ? '🔧 แก้ไขข้อมูลโปรไฟล์' : '📝 ลงทะเบียนข้อมูลโปรไฟล์ พขร. (ครั้งแรก)'}
                      </span>
                      {hasProfile && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-[10px] h-6 px-2 py-0 border-slate-200 text-slate-500 hover:bg-slate-100"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          ยกเลิกแก้ไข
                        </Button>
                      )}
                    </div>

                    <FormInput
                      label="ชื่อ-นามสกุล พนักงานขับรถ"
                      name="driverName"
                      placeholder="กรอกชื่อและนามสกุลจริง"
                      value={formData.driverName}
                      onChange={handleInputChange}
                      required
                    />

                    <FormInput
                      label="เบอร์โทรศัพท์มือถือ"
                      name="driverPhone"
                      type="tel"
                      placeholder="เช่น 0891234567"
                      maxLength={10}
                      value={formData.driverPhone}
                      onChange={handleInputChange}
                      required
                    />

                    <FormSelect
                      label="สังกัดโรงงาน"
                      name="factory"
                      value={formData.factory}
                      onChange={handleInputChange}
                      options={[
                        { value: 'KCE', label: 'KCE (นิคมลาดกระบัง)' },
                        { value: 'สุริยัน', label: 'สุริยัน (ลานจอดลาดกระบัง)' },
                        { value: 'อมตะซิตี้', label: 'อมตะซิตี้ (ชลบุรี)' },
                        { value: 'บางปู', label: 'บางปู (สมุทรปราการ)' }
                      ]}
                    />

                    <FormSelect
                      label="กะการทำงาน / เที่ยววิ่ง"
                      name="shift"
                      value={formData.shift}
                      onChange={handleInputChange}
                      options={[
                        { value: 'กะเช้า (06:00 - 18:00)', label: 'กะเช้า (06:00 - 18:00)' },
                        { value: 'กะดึก (18:00 - 06:00)', label: 'กะดึก (18:00 - 06:00)' },
                        { value: 'เที่ยววิ่งเสริมกลางวัน', label: 'เที่ยววิ่งเสริมกลางวัน' }
                      ]}
                    />

                    {/* ช่องอัปโหลดรูปถ่ายโปรไฟล์ พขร. */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-500">รูปถ่ายโปรไฟล์ พขร. / รถบัสประจำตัว (อัปโหลดทางเลือก)</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-sm">
                          {driverPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={driverPhoto} alt="Preview Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-7 w-7 text-slate-300" />
                          )}
                          {driverPhoto && (
                            <button
                              type="button"
                              onClick={removeProfilePhoto}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                          )}
                        </div>
                        <label className="flex-1">
                          <div className="border border-dashed border-slate-300 hover:border-blue-900 rounded-xl p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-900 bg-white shadow-sm">
                            <Camera className="h-4 w-4 text-slate-400" />
                            {driverPhoto ? 'เปลี่ยนรูปถ่ายโปรไฟล์' : 'อัปโหลดรูปโปรไฟล์'}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePhotoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ช่องเลขไมล์ปัจจุบัน (พขร. ต้องกรอกทุกวันอยู่ดี) */}
              <FormInput
                label="เลขไมล์รถบัสปัจจุบัน (กิโลเมตร)"
                name="mileage"
                type="number"
                placeholder="เช่น 124500"
                value={formData.mileage}
                onChange={handleInputChange}
                required
              />
            </CardContent>
          </Card>
        )}

        {/* ==========================================
            ขั้นตอนที่ 2: ตรวจเช็กสภาพรถ 21 จุด
            ========================================== */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-5 duration-200">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-xs text-amber-800 leading-relaxed font-medium">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold mb-0.5">คำชี้แจงในการตรวจเช็ก:</p>
                <p>หากพบจุดชำรุดในหัวข้อที่มีสัญลักษณ์ดอกจันสีแดง <span className="text-red-600 font-bold">* (จุดวิกฤต)</span> ระบบจะทำการ **ระงับการวิ่ง** รถคันนี้ทันทีเพื่อความปลอดภัยสูงสุดของผู้โดยสาร</p>
              </div>
            </div>

            {categories.map((category) => (
              <Card key={category}>
                <CardHeader className="bg-slate-50/50 py-3.5 border-b border-slate-100">
                  <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">
                    {category}
                  </span>
                </CardHeader>
                <CardContent className="p-3 divide-y divide-slate-100/50">
                  {CHECKLIST_ITEMS.filter(item => item.category === category).map((item) => (
                    <div key={item.key} className="py-2.5 first:pt-0 last:pb-0">
                      <InspectionToggle
                        label={
                          <div className="flex items-center gap-1.5">
                            <span>{item.label}</span>
                            {item.isCritical && (
                              <span className="text-red-500 font-bold text-xs shrink-0" title="จุดสำคัญทางความปลอดภัย">* วิกฤต</span>
                            )}
                          </div>
                        }
                        checked={checklist[item.key]}
                        onChange={(val) => handleToggleChange(item.key, val)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ==========================================
            ขั้นตอนที่ 3: แนบหลักฐานและการส่งใบตรวจ
            ========================================== */}
        {step === 3 && (
          <Card className="animate-in slide-in-from-right-5 duration-200">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Camera className="h-5 w-5 text-blue-900" />
                ขั้นตอนที่ 3: แนบรูปถ่ายหลักฐานการตรวจสอบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                กรุณาถ่ายรูปและแนบหลักฐานสภาพรถอย่างน้อย 1-3 รูปภาพ (เช่น สภาพหน้ารถ, เลขไมล์, สภาพยาง หรือบริเวณที่พบชำรุด)
              </p>

              {/* ตารางแนบรูปภาพ 3 ช่อง */}
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="relative aspect-square bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 hover:border-blue-900/30 rounded-2xl transition-all overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
                    {uploadedImages[idx] ? (
                      <>
                        {/* ภาพที่พรีวิว */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={uploadedImages[idx]} 
                          alt={`Evidence preview ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {/* ปุ่มกดลบภาพ */}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg p-1 transition-all cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="file"
                          id={`file-input-${idx}`}
                          accept="image/*"
                          onChange={(e) => handleImageChange(idx, e)}
                          className="hidden"
                        />
                        <label 
                          htmlFor={`file-input-${idx}`}
                          className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center cursor-pointer"
                        >
                          <Camera className="h-5 w-5 text-slate-400 mb-1 group-hover:text-blue-900 group-hover:scale-105 transition-all" />
                          <span className="text-[9px] text-slate-400 group-hover:text-blue-900">ช่องที่ {idx + 1}</span>
                        </label>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* ข้อตกลงความปลอดภัย */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <input 
                  type="checkbox" 
                  id="safetyAgreement" 
                  required 
                  className="mt-1 h-4 w-4 text-blue-900 border-slate-300 rounded focus:ring-blue-900 cursor-pointer"
                />
                <label htmlFor="safetyAgreement" className="text-[11px] text-slate-500 leading-relaxed cursor-pointer select-none">
                  ข้าพเจ้ายืนยันว่าได้ทำการเดินตรวจสภาพรถยนต์จริงครบทั้ง 21 หัวข้อ และข้อมูลเลขไมล์รวมถึงสภาพความชำรุดเป็นความจริงทุกประการเพื่อความปลอดภัยในการเดินทาง
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==========================================
            ปุ่มเมนูนำทาง (Stepper controls)
            ========================================== */}
        <div className="flex gap-4">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1 rounded-2xl flex items-center justify-center gap-2"
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
              ย้อนกลับ
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNextStep}
              className="flex-1 rounded-2xl flex items-center justify-center gap-2"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="danger"
              className="flex-1 rounded-2xl flex items-center justify-center gap-2 bg-[#b91c1c] hover:bg-red-800"
              disabled={loading}
            >
              {loading ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  บันทึกและส่งรายงาน
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
