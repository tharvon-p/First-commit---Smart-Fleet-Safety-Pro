// src/app/api/users/route.ts
// API Route Handler สำหรับการดึงรายชื่อผู้ใช้ทั้งหมด (GET) และการเพิ่มบัญชีผู้ใช้ใหม่ (POST)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '../auth/route';

// GET: ดึงข้อมูลรายชื่อผู้ใช้งานทั้งหมด
export async function GET() {
  try {
    const users = await db.user.findMany();
    // กรองเอาฟิลด์รหัสผ่านออกเพื่อความปลอดภัย
    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบัญชีผู้ใช้' },
      { status: 500 }
    );
  }
}

// POST: เพิ่มบัญชีผู้ใช้งานรายใหม่เข้าระบบ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, role } = body;

    // ตรวจสอบความถูกต้องของข้อมูลที่กรอกเข้ามา
    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { success: false, message: 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'MECHANIC', 'OFFICE'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'ระดับสิทธิ์การเข้าใช้ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีชื่อผู้ใช้นี้ซ้ำในระบบแล้วหรือไม่
    const existingUser = await db.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'ชื่อผู้ใช้งานนี้ถูกใช้งานไปแล้ว' },
        { status: 400 }
      );
    }

    // ทำการสร้างบัญชีผู้ใช้
    const newUser = await db.user.create({
      data: {
        username: cleanUsername,
        password: hashPassword(password),
        name: name.trim(),
        role: role
      }
    });

    return NextResponse.json({
      success: true,
      message: 'เพิ่มบัญชีผู้ใช้งานใหม่สำเร็จ',
      data: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้', error: errorMessage },
      { status: 500 }
    );
  }
}
