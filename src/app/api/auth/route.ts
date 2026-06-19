// src/app/api/auth/route.ts
// API Route Handler สำหรับตรวจสอบสิทธิ์เข้าใช้งานระบบหลังบ้าน (Authentication Endpoint)
// ตรวจสอบข้อมูลบน Server-side เพื่อป้องกันรหัสผ่านรั่วไหลไปกับไฟล์ JS บนบราว์เซอร์

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // โหลดรหัสผ่านผู้ดูแลระบบจากตัวแปรระบบ (.env) หากไม่มีจะใช้ค่าเริ่มต้นสำหรับทดสอบ
    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'thailux1234';

    if (username === expectedUsername && password === expectedPassword) {
      return NextResponse.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        token: 'session_thailux_safety_token_approved'
      });
    }

    return NextResponse.json(
      { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดทางเทคนิคในการเชื่อมต่อ', error: errorMessage },
      { status: 500 }
    );
  }
}
