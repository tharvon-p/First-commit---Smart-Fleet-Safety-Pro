// src/lib/utils.ts
// ฟังก์ชันช่วยเหลือ (Utility Functions) และข้อมูลจุดตรวจเช็กของระบบ

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cn(...inputs: any[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      classes.push(cn(...input));
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}

// โครงสร้างประเภทข้อมูลรายการตรวจเช็ก
export interface ChecklistItemDef {
  key: string;
  label: string;
  category: string;
  isCritical: boolean; // จุดวิกฤตที่ส่งผลกระทบต่อความปลอดภัยอย่างร้ายแรง
}

// รายการจุดตรวจสภาพบัส 21 จุดแบ่งตามหมวดหมู่
export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  // หมวดหมู่ 1: เครื่องยนต์และระดับน้ำมัน
  { key: 'engineOil', label: 'ระดับน้ำมันเครื่อง', category: 'เครื่องยนต์และของเหลว', isCritical: false },
  { key: 'coolant', label: 'น้ำยาหล่อเย็นและหม้อน้ำ', category: 'เครื่องยนต์และของเหลว', isCritical: false },
  { key: 'brakeFluid', label: 'ระดับน้ำมันเบรก / คลัตช์', category: 'เครื่องยนต์และของเหลว', isCritical: true }, // ระบบเบรกเป็นเรื่องวิกฤต
  { key: 'powerSteering', label: 'ระดับน้ำมันพาวเวอร์', category: 'เครื่องยนต์และของเหลว', isCritical: false },
  { key: 'engineBelt', label: 'สภาพสายพานเครื่องยนต์', category: 'เครื่องยนต์และของเหลว', isCritical: false },

  // หมวดหมู่ 2: ระบบควบคุมและยาง
  { key: 'brakeSystem', label: 'ประสิทธิภาพระบบเบรก', category: 'ระบบขับเคลื่อนและควบคุม', isCritical: true },
  { key: 'tires', label: 'สภาพยางบัสและลมยาง', category: 'ระบบขับเคลื่อนและควบคุม', isCritical: true },
  { key: 'wheelNuts', label: 'ความแน่นหนาของน็อตล้อ', category: 'ระบบขับเคลื่อนและควบคุม', isCritical: true },

  // หมวดหมู่ 3: ระบบไฟส่องสว่างและสัญญาณ
  { key: 'headlights', label: 'ไฟส่องสว่างหน้า (สูง-ต่ำ)', category: 'ระบบไฟและสัญญาณ', isCritical: false },
  { key: 'brakeLights', label: 'ไฟท้ายและไฟเบรก', category: 'ระบบไฟและสัญญาณ', isCritical: true }, // ไฟเบรกชำรุดถือเป็นเรื่องวิกฤต
  { key: 'turnSignals', label: 'ไฟเลี้ยวและไฟฉุกเฉิน', category: 'ระบบไฟและสัญญาณ', isCritical: true },
  { key: 'interiorLights', label: 'ไฟส่องสว่างภายในรถ', category: 'ระบบไฟและสัญญาณ', isCritical: false },
  { key: 'horn', label: 'สัญญาณแตร', category: 'ระบบไฟและสัญญาณ', isCritical: false },

  // หมวดหมู่ 4: ทัศนวิสัย
  { key: 'wipers', label: 'ใบปัดน้ำฝนและระดับน้ำฉีดกระจก', category: 'ทัศนวิสัยและกระจก', isCritical: false },
  { key: 'mirrors', label: 'กระจกมองข้างและกระจกมองหลัง', category: 'ทัศนวิสัยและกระจก', isCritical: true },

  // หมวดหมู่ 5: อุปกรณ์ความปลอดภัย (วิกฤตสูง)
  { key: 'fireExtinguisher', label: 'ถังดับเพลิงเคมี (มีแรงดันปกติ)', category: 'อุปกรณ์ความปลอดภัย', isCritical: true },
  { key: 'glassHammers', label: 'ค้อนทุบกระจกฉุกเฉิน (ครบตามจุด)', category: 'อุปกรณ์ความปลอดภัย', isCritical: true },
  { key: 'emergencyExit', label: 'ประตูฉุกเฉินและทางออกฉุกเฉิน', category: 'อุปกรณ์ความปลอดภัย', isCritical: true },
  { key: 'seatbelts', label: 'เข็มขัดนิรภัยสำหรับผู้โดยสาร', category: 'อุปกรณ์ความปลอดภัย', isCritical: true },

  // หมวดหมู่ 6: ห้องโดยสารและระบบอำนวยความสะดวก
  { key: 'airConditioner', label: 'ระบบปรับอากาศ / ความเย็นแอร์', category: 'ห้องโดยสารและตัวถัง', isCritical: false },
  { key: 'bodySeats', label: 'สภาพตัวถังรถบัสและเบาะนั่ง', category: 'ห้องโดยสารและตัวถัง', isCritical: false },
];

/**
 * คำนวณสถานะผลการตรวจสภาพรถบัสอัตโนมัติ
 * @param items อ็อบเจกต์เก็บสถานะ { itemKey: boolean } โดยที่ true = ปกติ, false = ชำรุด
 * @returns 'ปกติ' | 'รอคิวซ่อม' | 'ระงับการวิ่ง'
 */
export function calculateInspectionStatus(items: Record<string, boolean>): 'ปกติ' | 'รอคิวซ่อม' | 'ระงับการวิ่ง' {
  let hasCriticalDefect = false;
  let hasMinorDefect = false;

  for (const item of CHECKLIST_ITEMS) {
    const isNormal = items[item.key] ?? true; // หากไม่มีข้อมูลถือว่าปกติ

    if (!isNormal) {
      if (item.isCritical) {
        hasCriticalDefect = true;
      } else {
        hasMinorDefect = true;
      }
    }
  }

  // หากพบการชำรุดในจุดที่ส่งผลต่อความปลอดภัยสูง (Critical) -> ระงับการวิ่งทันที
  if (hasCriticalDefect) {
    return 'ระงับการวิ่ง';
  }

  // หากพบการชำรุดในจุดที่ยอมรับได้ชั่วคราวแต่ต้องซ่อม -> รอคิวซ่อม
  if (hasMinorDefect) {
    return 'รอคิวซ่อม';
  }

  // ปกติทุกประการ
  return 'ปกติ';
}

// สีของสถานะสำหรับจัดทำ UI
export const STATUS_THEME: Record<string, { bg: string; text: string; border: string; iconColor: string }> = {
  'ปกติ': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    iconColor: '#10b981'
  },
  'รอคิวซ่อม': {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
    iconColor: '#f59e0b'
  },
  'ระงับการวิ่ง': {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    border: 'border-rose-200',
    iconColor: '#f43f5e'
  },
  'ซ่อมเสร็จสิ้น': {
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'text-sky-700',
    border: 'border-sky-200',
    iconColor: '#0ea5e9'
  }
};
