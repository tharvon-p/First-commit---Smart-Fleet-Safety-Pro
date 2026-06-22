// src/lib/db.ts
// ระบบจัดการฐานข้อมูลที่รองรับการตรวจจับข้อผิดพลาด (Smart Database Wrapper with JSON Fallback)
// หากระบบตรวจพบว่าไม่มี PostgreSQL หรือเกิดข้อผิดพลาด จะย้ายไปใช้งานระบบไฟล์จำลอง (JSON File DB) อัตโนมัติ

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

// กำหนดโครงสร้างข้อมูลบัญชีผู้ใช้ (User Record) ในระดับ TypeScript
export interface UserRecord {
  id: string;
  username: string;
  password: string;                // รหัสผ่านที่แฮชแล้ว (SHA-256)
  name: string;                    // ชื่อพนักงาน
  role: string;                    // ADMIN, MECHANIC, OFFICE
  createdAt: string;               // วันที่สร้างบัญชี (ISO String)
  updatedAt: string;               // วันที่แก้ไขล่าสุด (ISO String)
}

// กำหนดโครงสร้างข้อมูลประวัติ พขร. (Driver Profile Record) ในระดับ TypeScript
export interface DriverProfileRecord {
  id: string;
  plateNumber: string;             // ทะเบียนรถบัส (ใช้ทำ lookup ค้นหาโปรไฟล์)
  driverName: string;              // ชื่อพนักงานขับรถ
  driverPhone: string;             // เบอร์โทรศัพท์
  factory: string;                 // สังกัดโรงงาน
  shift: string;                   // กะทำงาน
  photo: string | null;            // รูปถ่ายคนขับ / รถ (Base64)
  createdAt: string;               // วันที่สร้าง (ISO String)
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

// ไฟล์สำหรับเก็บข้อมูลบัญชีผู้ใช้งานสำรอง
const FALLBACK_USERS_FILE_PATH = path.join(process.cwd(), 'users_fallback.json');

// คลาสจัดการ Mock User Database ด้วยไฟล์ JSON
class JSONUserDatabase {
  private readData(): UserRecord[] {
    try {
      if (!fs.existsSync(FALLBACK_USERS_FILE_PATH)) {
        fs.writeFileSync(FALLBACK_USERS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const fileContent = fs.readFileSync(FALLBACK_USERS_FILE_PATH, 'utf-8');
      return JSON.parse(fileContent) as UserRecord[];
    } catch (error) {
      console.error('Error reading fallback JSON Users DB:', error);
      return [];
    }
  }

  private writeData(data: UserRecord[]): void {
    try {
      fs.writeFileSync(FALLBACK_USERS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing fallback JSON Users DB:', error);
    }
  }

  async findMany(args?: { where?: { username?: string } }): Promise<UserRecord[]> {
    let records = this.readData();
    if (args?.where) {
      const { username } = args.where;
      if (username) {
        records = records.filter(r => r.username === username);
      }
    }
    return records;
  }

  async findUnique(args: { where: { id?: string; username?: string } }): Promise<UserRecord | null> {
    const records = this.readData();
    if (args.where.id) {
      return records.find(r => r.id === args.where.id) || null;
    }
    if (args.where.username) {
      return records.find(r => r.username === args.where.username) || null;
    }
    return null;
  }

  async create(args: { data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'> }): Promise<UserRecord> {
    const records = this.readData();
    const now = new Date().toISOString();
    const newRecord: UserRecord = {
      ...args.data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    records.push(newRecord);
    this.writeData(records);
    return newRecord;
  }

  async update(args: {
    where: { id: string };
    data: {
      username?: string;
      password?: string;
      name?: string;
      role?: string;
    };
  }): Promise<UserRecord> {
    const records = this.readData();
    const index = records.findIndex(r => r.id === args.where.id);
    if (index === -1) {
      throw new Error(`User with id ${args.where.id} not found`);
    }
    const currentRecord = records[index];
    const now = new Date().toISOString();
    const updatedRecord: UserRecord = {
      ...currentRecord,
      ...args.data,
      updatedAt: now,
    };
    records[index] = updatedRecord;
    this.writeData(records);
    return updatedRecord;
  }

  async delete(args: { where: { id: string } }): Promise<UserRecord> {
    const records = this.readData();
    const index = records.findIndex(r => r.id === args.where.id);
    if (index === -1) {
      throw new Error(`User with id ${args.where.id} not found`);
    }
    const deletedRecord = records[index];
    records.splice(index, 1);
    this.writeData(records);
    return deletedRecord;
  }
}

// ไฟล์สำหรับเก็บข้อมูลสิทธิ์การเข้าถึงหน้าจอสำรอง
const FALLBACK_PERMISSIONS_FILE_PATH = path.join(process.cwd(), 'permissions_fallback.json');

// โครงสร้างข้อมูลสิทธิ์ของบทบาทการใช้งาน
export interface RolePermissionRecord {
  id: string;
  role: string;
  allowedPages: string;
  createdAt: string;
  updatedAt: string;
}

class JSONRolePermissionDatabase {
  private readData(): RolePermissionRecord[] {
    try {
      if (!fs.existsSync(FALLBACK_PERMISSIONS_FILE_PATH)) {
        fs.writeFileSync(FALLBACK_PERMISSIONS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const fileContent = fs.readFileSync(FALLBACK_PERMISSIONS_FILE_PATH, 'utf-8');
      return JSON.parse(fileContent) as RolePermissionRecord[];
    } catch (error) {
      console.error('Error reading fallback JSON Permissions DB:', error);
      return [];
    }
  }

  private writeData(data: RolePermissionRecord[]): void {
    try {
      fs.writeFileSync(FALLBACK_PERMISSIONS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing fallback JSON Permissions DB:', error);
    }
  }

  async findMany(args?: { where?: { role?: string } }): Promise<RolePermissionRecord[]> {
    let records = this.readData();
    if (args?.where) {
      const { role } = args.where;
      if (role) {
        records = records.filter(r => r.role === role);
      }
    }
    return records;
  }

  async findUnique(args: { where: { id?: string; role?: string } }): Promise<RolePermissionRecord | null> {
    const records = this.readData();
    if (args.where.id) {
      return records.find(r => r.id === args.where.id) || null;
    }
    if (args.where.role) {
      return records.find(r => r.role === args.where.role) || null;
    }
    return null;
  }

  async create(args: { data: Omit<RolePermissionRecord, 'id' | 'createdAt' | 'updatedAt'> }): Promise<RolePermissionRecord> {
    const records = this.readData();
    const now = new Date().toISOString();
    const newRecord: RolePermissionRecord = {
      ...args.data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    records.push(newRecord);
    this.writeData(records);
    return newRecord;
  }

  async update(args: {
    where: { role: string };
    data: {
      allowedPages?: string;
    };
  }): Promise<RolePermissionRecord> {
    const records = this.readData();
    const index = records.findIndex(r => r.role === args.where.role);
    if (index === -1) {
      const now = new Date().toISOString();
      const newRecord: RolePermissionRecord = {
        id: crypto.randomUUID(),
        role: args.where.role,
        allowedPages: args.data.allowedPages || '',
        createdAt: now,
        updatedAt: now,
      };
      records.push(newRecord);
      this.writeData(records);
      return newRecord;
    }
    const currentRecord = records[index];
    const now = new Date().toISOString();
    const updatedRecord: RolePermissionRecord = {
      ...currentRecord,
      ...args.data,
      updatedAt: now,
    };
    records[index] = updatedRecord;
    this.writeData(records);
    return updatedRecord;
  }
}

// ไฟล์สำหรับเก็บข้อมูลโปรไฟล์ พขร. สำรอง
const FALLBACK_PROFILES_FILE_PATH = path.join(process.cwd(), 'driver_profiles_fallback.json');

// คลาสจัดการ Mock Driver Profiles Database ด้วยไฟล์ JSON
class JSONDriverProfileDatabase {
  private readData(): DriverProfileRecord[] {
    try {
      if (!fs.existsSync(FALLBACK_PROFILES_FILE_PATH)) {
        fs.writeFileSync(FALLBACK_PROFILES_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const fileContent = fs.readFileSync(FALLBACK_PROFILES_FILE_PATH, 'utf-8');
      return JSON.parse(fileContent) as DriverProfileRecord[];
    } catch (error) {
      console.error('Error reading fallback JSON Driver Profiles DB:', error);
      return [];
    }
  }

  private writeData(data: DriverProfileRecord[]): void {
    try {
      fs.writeFileSync(FALLBACK_PROFILES_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing fallback JSON Driver Profiles DB:', error);
    }
  }

  async findMany(args?: { where?: { plateNumber?: string } }): Promise<DriverProfileRecord[]> {
    let records = this.readData();
    if (args?.where) {
      const { plateNumber } = args.where;
      if (plateNumber) {
        records = records.filter(r => r.plateNumber === plateNumber);
      }
    }
    return records;
  }

  async findUnique(args: { where: { plateNumber?: string; id?: string } }): Promise<DriverProfileRecord | null> {
    const records = this.readData();
    if (args.where.id) {
      return records.find(r => r.id === args.where.id) || null;
    }
    if (args.where.plateNumber) {
      return records.find(r => r.plateNumber === args.where.plateNumber) || null;
    }
    return null;
  }

  async create(args: { data: Omit<DriverProfileRecord, 'id' | 'createdAt' | 'updatedAt'> }): Promise<DriverProfileRecord> {
    const records = this.readData();
    const now = new Date().toISOString();
    const existingIndex = records.findIndex(r => r.plateNumber === args.data.plateNumber);
    const newRecord: DriverProfileRecord = {
      ...args.data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    if (existingIndex !== -1) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }
    
    this.writeData(records);
    return newRecord;
  }

  async update(args: {
    where: { plateNumber?: string; id?: string };
    data: {
      driverName?: string;
      driverPhone?: string;
      factory?: string;
      shift?: string;
      photo?: string | null;
    };
  }): Promise<DriverProfileRecord> {
    const records = this.readData();
    let index = -1;
    if (args.where.id) {
      index = records.findIndex(r => r.id === args.where.id);
    } else if (args.where.plateNumber) {
      index = records.findIndex(r => r.plateNumber === args.where.plateNumber);
    }
    
    if (index === -1) {
      const now = new Date().toISOString();
      const newRecord: DriverProfileRecord = {
        id: crypto.randomUUID(),
        plateNumber: args.where.plateNumber || '',
        driverName: args.data.driverName || '',
        driverPhone: args.data.driverPhone || '',
        factory: args.data.factory || '',
        shift: args.data.shift || '',
        photo: args.data.photo || null,
        createdAt: now,
        updatedAt: now,
      };
      records.push(newRecord);
      this.writeData(records);
      return newRecord;
    }
    
    const currentRecord = records[index];
    const now = new Date().toISOString();
    const updatedRecord: DriverProfileRecord = {
      ...currentRecord,
      ...args.data,
      updatedAt: now,
    };
    records[index] = updatedRecord;
    this.writeData(records);
    return updatedRecord;
  }

  async upsert(args: {
    where: { plateNumber: string };
    update: {
      driverName?: string;
      driverPhone?: string;
      factory?: string;
      shift?: string;
      photo?: string | null;
    };
    create: {
      plateNumber: string;
      driverName: string;
      driverPhone: string;
      factory: string;
      shift: string;
      photo?: string | null;
    };
  }): Promise<DriverProfileRecord> {
    const records = this.readData();
    const index = records.findIndex(r => r.plateNumber === args.where.plateNumber);
    const now = new Date().toISOString();
    
    if (index === -1) {
      const newRecord: DriverProfileRecord = {
        id: crypto.randomUUID(),
        plateNumber: args.create.plateNumber,
        driverName: args.create.driverName,
        driverPhone: args.create.driverPhone,
        factory: args.create.factory,
        shift: args.create.shift,
        photo: args.create.photo || null,
        createdAt: now,
        updatedAt: now,
      };
      records.push(newRecord);
      this.writeData(records);
      return newRecord;
    } else {
      const currentRecord = records[index];
      const updatedRecord: DriverProfileRecord = {
        ...currentRecord,
        ...args.update,
        updatedAt: now,
      };
      records[index] = updatedRecord;
      this.writeData(records);
      return updatedRecord;
    }
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
const jsonUserDb = new JSONUserDatabase();
const jsonRolePermissionDb = new JSONRolePermissionDatabase();
const jsonDriverProfileDb = new JSONDriverProfileDatabase();


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
  },

  // ห่อหุ้มคำสั่งสำหรับ User table
  user: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: async (args?: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonUserDb.findMany(args);
      }
      try {
        return await prisma.user.findMany(args);
      } catch (err) {
        console.error('Prisma connection error in user.findMany, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonUserDb.findMany(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonUserDb.findUnique(args);
      }
      try {
        return await prisma.user.findUnique(args);
      } catch (err) {
        console.error('Prisma connection error in user.findUnique, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonUserDb.findUnique(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonUserDb.create(args);
      }
      try {
        return await prisma.user.create(args);
      } catch (err) {
        console.error('Prisma connection error in user.create, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonUserDb.create(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonUserDb.update(args);
      }
      try {
        return await prisma.user.update(args);
      } catch (err) {
        console.error('Prisma connection error in user.update, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonUserDb.update(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonUserDb.delete(args);
      }
      try {
        return await prisma.user.delete(args);
      } catch (err) {
        console.error('Prisma connection error in user.delete, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonUserDb.delete(args);
      }
    }
  },

  // ห่อหุ้มคำสั่งสำหรับ RolePermission table
  rolePermission: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: async (args?: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonRolePermissionDb.findMany(args);
      }
      try {
        return await prisma.rolePermission.findMany(args);
      } catch (err) {
        console.error('Prisma connection error in rolePermission.findMany, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonRolePermissionDb.findMany(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonRolePermissionDb.findUnique(args);
      }
      try {
        return await prisma.rolePermission.findUnique(args);
      } catch (err) {
        console.error('Prisma connection error in rolePermission.findUnique, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonRolePermissionDb.findUnique(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonRolePermissionDb.create(args);
      }
      try {
        return await prisma.rolePermission.create(args);
      } catch (err) {
        console.error('Prisma connection error in rolePermission.create, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonRolePermissionDb.create(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonRolePermissionDb.update(args);
      }
      try {
        return await prisma.rolePermission.update(args);
      } catch (err) {
        console.error('Prisma connection error in rolePermission.update, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonRolePermissionDb.update(args);
      }
    }
  },

  // ห่อหุ้มคำสั่งสำหรับ DriverProfile table
  driverProfile: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: async (args?: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDriverProfileDb.findMany(args);
      }
      try {
        return await prisma.driverProfile.findMany(args);
      } catch (err) {
        console.error('Prisma connection error in driverProfile.findMany, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDriverProfileDb.findMany(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDriverProfileDb.findUnique(args);
      }
      try {
        return await prisma.driverProfile.findUnique(args);
      } catch (err) {
        console.error('Prisma connection error in driverProfile.findUnique, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDriverProfileDb.findUnique(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDriverProfileDb.create(args);
      }
      try {
        return await prisma.driverProfile.create(args);
      } catch (err) {
        console.error('Prisma connection error in driverProfile.create, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDriverProfileDb.create(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDriverProfileDb.update(args);
      }
      try {
        return await prisma.driverProfile.update(args);
      } catch (err) {
        console.error('Prisma connection error in driverProfile.update, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDriverProfileDb.update(args);
      }
    },
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert: async (args: any) => {
      if (useJsonDatabase || !prisma) {
        return jsonDriverProfileDb.upsert(args);
      }
      try {
        return await prisma.driverProfile.upsert(args);
      } catch (err) {
        console.error('Prisma connection error in driverProfile.upsert, switching to Fallback JSON Database.', err);
        useJsonDatabase = true;
        return jsonDriverProfileDb.upsert(args);
      }
    }
  }
};
