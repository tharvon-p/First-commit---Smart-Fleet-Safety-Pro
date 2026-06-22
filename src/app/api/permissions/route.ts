// src/app/api/permissions/route.ts
// API Route Handler สำหรับจัดการสิทธิ์การเข้าถึงหน้าจอของแต่ละบทบาท (Dynamic Permissions)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_PERMISSIONS = [
  { role: 'ADMIN', allowedPages: '/,/inspection,/maintenance,/reports,/users' },
  { role: 'MECHANIC', allowedPages: '/,/inspection,/maintenance' },
  { role: 'OFFICE', allowedPages: '/,/inspection,/reports,/maintenance' }
];

// GET: ดึงรายการสิทธิ์การใช้งานของทุก Role (หากไม่มี จะทำ Auto-seed สิทธิ์ตั้งต้นให้อัตโนมัติ)
export async function GET() {
  try {
    let permissions: any[] = await db.rolePermission.findMany();
    
    // หากข้อมูลในฐานข้อมูลยังไม่มีสิทธิ์ ให้ทำ Auto-seed
    if (permissions.length === 0) {
      const seeded = [];
      for (const item of DEFAULT_PERMISSIONS) {
        const record = await db.rolePermission.create({
          data: {
            role: item.role,
            allowedPages: item.allowedPages
          }
        });
        seeded.push(record);
      }
      permissions = seeded;
    }
    
    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการเรียกข้อมูลสิทธิ์เข้าใช้งานหน้าจอ' },
      { status: 500 }
    );
  }
}

// PUT: บันทึก/อัปเดตสิทธิ์การใช้งานทั้งหมด (ส่งค่าอาเรย์ของบทบาทเข้ามาอัปเดตพร้อมกัน)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: 'รูปแบบข้อมูลไม่ถูกต้อง กรุณาส่งข้อมูลสิทธิ์เป็นชุดอาร์เรย์' },
        { status: 400 }
      );
    }
    
    const results = [];
    for (const item of body) {
      const { role, allowedPages } = item;
      if (!role) continue;
      
      // ค้นหาเพื่อเช็กว่ามีบทบาทนี้ในตารางสิทธิ์แล้วหรือยัง
      const existing = await db.rolePermission.findUnique({
        where: { role }
      });
      
      let record;
      if (existing) {
        // อัปเดตสิทธิ์เดิมที่มี
        record = await db.rolePermission.update({
          where: { role },
          data: { allowedPages: allowedPages || '' }
        });
      } else {
        // สร้างสิทธิ์ใหม่ถ้าไม่มี
        record = await db.rolePermission.create({
          data: {
            role,
            allowedPages: allowedPages || ''
          }
        });
      }
      results.push(record);
    }
    
    return NextResponse.json({
      success: true,
      message: 'บันทึกสิทธิ์การเข้าใช้งานสำเร็จเรียบร้อยแล้ว',
      data: results
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดทางเทคนิคในการอัปเดตสิทธิ์การใช้งาน' },
      { status: 500 }
    );
  }
}
