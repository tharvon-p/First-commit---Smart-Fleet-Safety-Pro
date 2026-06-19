// src/lib/db.ts
// ระบบจัดการฐานข้อมูลที่รองรับการตรวจจับข้อผิดพลาด (Smart Database Wrapper with JSON Fallback)
// หากระบบตรวจพบว่าไม่มี PostgreSQL หรือเกิดข้อผิดพลาด จะย้ายไปใช้งานระบบไฟล์จำลอง (JSON File DB) อัตโนมัติ

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// กำหนดโครงสร้างข้อมูลการตรวจบัส (Inspection Record) ในระดับ TypeScript
export interface InspectionRecord {
  id: string;
  factory: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  shift: string;
  mileage: number;
  items: Record<string, boolean>; // key เป็นรหัสจุดตรวจเช็ก, value เป็น true (ปกติ) / false (ชำรุด)
  images: string[];                // อาร์เรย์เก็บ URL หรือ Base64 รูปภาพ 3 ช่อง
  status: string;                  // "ปกติ", "รอคิวซ่อม", "ระงับการวิ่ง", "ซ่อมเสร็จสิ้น"
  mechanicNotes: string | null;    // หมายเหตุจากช่าง
  repairedAt: string | null;       // วันที่ทำการซ่อมเสร็จ (ISO String)
  createdAt: string;               // วันที่สร้างรายงาน (ISO String)
  updatedAt: string;               // วันที่แก้ไขล่าสุด (ISO String)
}

// ไฟล์สำหรับเก็บข้อมูลสำรองเมื่อฐานข้อมูล PostgreSQL ใช้งานไม่ได้
const FALLBACK_FILE_PATH = path.join(process.cwd(), 'db_fallback.json');

// คลาสจัดการ Mock Database ด้วยไฟล์ JSON
class JSONDatabase {
  private readData(): InspectionRecord[] {
    try {
      if (!fs.existsSync(FALLBACK_FILE_PATH)) {
        // หากยังไม่มีไฟล์ ให้สร้างอาเรย์ว่างเปล่าเริ่มต้น
        fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const fileContent = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8');
      return JSON.parse(fileContent) as InspectionRecord[];
    } catch (error) {
      console.error('Error reading fallback JSON DB:', error);
      return [];
    }
  }

  private writeData(data: InspectionRecord[]): void {
    try {
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing fallback JSON DB:', error);
    }
  }

  // ดึงข้อมูลทั้งหมดพร้อมกรองข้อมูล (ตามเงื่อนไขที่ Prisma Query ใช้)
  async findMany(args?: {
    where?: {
      factory?: string;
      status?: string;
      plateNumber?: string;
      OR?: Array<{
        plateNumber?: { contains: string; mode?: string };
        driverName?: { contains: string; mode?: string };
      }>;
      createdAt?: {
        gte?: Date | string;
        lte?: Date | string;
      };
    };
    orderBy?: {
      createdAt: 'asc' | 'desc';
    };
  }): Promise<InspectionRecord[]> {
    let records = this.readData();

    // ตัวกรอง (Filter logic)
    if (args?.where) {
      const { factory, status, OR, createdAt } = args.where;

      if (factory) {
        records = records.filter(r => r.factory === factory);
      }

      if (status) {
        records = records.filter(r => r.status === status);
      }

      if (OR && OR.length > 0) {
        records = records.filter(r => {
          return OR.some(condition => {
            if (condition.plateNumber?.contains) {
              const query = condition.plateNumber.contains.toLowerCase();
              return r.plateNumber.toLowerCase().includes(query);
            }
            if (condition.driverName?.contains) {
              const query = condition.driverName.contains.toLowerCase();
              return r.driverName.toLowerCase().includes(query);
            }
            return false;
          });
        });
      }

      if (createdAt) {
        if (createdAt.gte) {
          const gteTime = new Date(createdAt.gte).getTime();
          records = records.filter(r => new Date(r.createdAt).getTime() >= gteTime);
        }
        if (createdAt.lte) {
          const lteTime = new Date(createdAt.lte).getTime();
          records = records.filter(r => new Date(r.createdAt).getTime() <= lteTime);
        }
      }
    }

    // จัดเรียงข้อมูล (Ordering)
    if (args?.orderBy?.createdAt) {
      const order = args.orderBy.createdAt;
      records.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return order === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    return records;
  }

  // ค้นหารายการเดียว
  async findUnique(args: { where: { id: string } }): Promise<InspectionRecord | null> {
    const records = this.readData();
    const record = records.find(r => r.id === args.where.id);
    return record || null;
  }

  // สร้างข้อมูลตรวจสภาพใหม่
  async create(args: { data: Omit<InspectionRecord, 'id' | 'createdAt' | 'updatedAt'> }): Promise<InspectionRecord> {
    const records = this.readData();
    const now = new Date().toISOString();
    const newRecord: InspectionRecord = {
      ...args.data,
      id: crypto.randomUUID(), // สร้างรหัสสุ่ม UUID
      createdAt: now,
      updatedAt: now,
    };

    records.push(newRecord);
    this.writeData(records);
    return newRecord;
  }

  // อัปเดตสถานะการซ่อมบำรุง
  async update(args: {
    where: { id: string };
    data: {
      status?: string;
      mechanicNotes?: string | null;
      repairedAt?: Date | string | null;
    };
  }): Promise<InspectionRecord> {
    const records = this.readData();
    const index = records.findIndex(r => r.id === args.where.id);
    if (index === -1) {
      throw new Error(`Record with id ${args.where.id} not found`);
    }

    const currentRecord = records[index];
    const now = new Date().toISOString();
    
    // ทำการอัปเดตข้อมูลทีละฟิลด์
    const updatedRecord: InspectionRecord = {
      ...currentRecord,
      ...args.data,
      repairedAt: args.data.repairedAt ? new Date(args.data.repairedAt).toISOString() : currentRecord.repairedAt,
      updatedAt: now,
    };

    records[index] = updatedRecord;
    this.writeData(records);
    return updatedRecord;
  }

  // นับจำนวนรวม
  async count(args?: {
    where?: {
      factory?: string;
      status?: string;
      plateNumber?: string;
      OR?: Array<{
        plateNumber?: { contains: string; mode?: string };
        driverName?: { contains: string; mode?: string };
      }>;
      createdAt?: {
        gte?: Date | string;
        lte?: Date | string;
      };
    };
  }): Promise<number> {
    const records = await this.findMany(args);
    return records.length;
  }
}

// ตรวจสอบความถูกต้องและสร้างออบเจ็กต์เชื่อมต่อ
let prisma: PrismaClient | null = null;
let useJsonDatabase = false;

// หากมีตัวแปรระบบ DATABASE_URL ให้จำลองการเชื่อมต่อฐานข้อมูล
if (process.env.DATABASE_URL) {
  try {
    prisma = new PrismaClient({
      log: ['error'],
    });
    // โน้ต: การเชื่อมต่อจะเกิดจริงตอนรันคิวรีครั้งแรก
  } catch (e) {
    console.warn('❌ ไม่สามารถสร้างอินสแตนซ์ Prisma Client ได้, กำลังสลับไปใช้ JSON Database...', e);
    useJsonDatabase = true;
  }
} else {
  console.warn('⚠️ ไม่พบตัวแปรระบบ DATABASE_URL ในไฟล์ .env, กำลังใช้งานโหมดทดลองเซฟลงไฟล์ JSON ในเครื่อง (JSON database)');
  useJsonDatabase = true;
}

// สร้างคลาส Mock Database Wrapper
const jsonDb = new JSONDatabase();

// ส่งออก Database Client ที่สามารถเรียกใช้รูปแบบเดียวกับ Prisma
export const db = {
  get isFallback() {
    return useJsonDatabase;
  },
  
  // ห่อหุ้มคำสั่งสำหรับ Inspection table
  inspection: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: async (args?: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDb.findMany(args);
      }
      try {
        return await prisma.inspection.findMany(args);
      } catch (err) {
        console.error('Prisma connection error in findMany, switching to Fallback JSON Database.', err);
        useJsonDatabase = true; // เปลี่ยนเป็นใช้ JSON ชั่วคราวสำหรับการรันครั้งต่อไป
        return jsonDb.findMany(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDb.findUnique(args);
      }
      try {
        return await prisma.inspection.findUnique(args);
      } catch (err) {
        console.error('Prisma connection error in findUnique, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDb.findUnique(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDb.create(args);
      }
      try {
        return await prisma.inspection.create(args);
      } catch (err) {
        console.error('Prisma connection error in create, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDb.create(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDb.update(args);
      }
      try {
        return await prisma.inspection.update(args);
      } catch (err) {
        console.error('Prisma connection error in update, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDb.update(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count: async (args?: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDb.count(args);
      }
      try {
        return await prisma.inspection.count(args);
      } catch (err) {
        console.error('Prisma connection error in count, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDb.count(args);
      }
    }
  }
};
