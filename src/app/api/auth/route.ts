// src/app/api/auth/route.ts
// API Route Handler สำหรับตรวจสอบสิทธิ์เข้าใช้งานระบบหลังบ้าน (Authentication Endpoint)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // 1. ตรวจสอบจำนวนผู้ใช้ในระบบทั้งหมด
    const users = await db.user.findMany();

    // 2. หากยังไม่มีผู้ใช้งานใดๆ เลยในระบบ (รันครั้งแรก) ให้ทำ Auto-Seed บัญชีผู้ดูแลระบบเริ่มต้น
    if (users.length === 0) {
      const defaultAdminUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'thailux1234';

      if (username === defaultAdminUsername && password === defaultAdminPassword) {
        // สร้างบัญชี Admin เริ่มต้นในระบบ
        const defaultAdmin = await db.user.create({
          data: {
            username: defaultAdminUsername,
            password: hashPassword(defaultAdminPassword),
            name: 'ผู้ดูแลระบบหลัก',
            role: 'ADMIN'
          }
        });

        return NextResponse.json({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ (สร้างบัญชีผู้ดูแลระบบเริ่มต้นเรียบร้อย)',
          user: {
            id: defaultAdmin.id,
            username: defaultAdmin.username,
            name: defaultAdmin.name,
            role: defaultAdmin.role
          },
          token: 'session_thailux_safety_token_approved'
        });
      }
    }

    // 3. กรณีปกติ: ค้นหาและตรวจสอบสิทธิ์จากฐานข้อมูล
    const foundUser = await db.user.findUnique({
      where: { username }
    });

    if (foundUser && foundUser.password === hashPassword(password)) {
      return NextResponse.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        user: {
          id: foundUser.id,
          username: foundUser.username,
          name: foundUser.name,
          role: foundUser.role
        },
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
