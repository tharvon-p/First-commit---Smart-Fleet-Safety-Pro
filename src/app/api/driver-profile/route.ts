// src/app/api/driver-profile/route.ts
// API Route Handler สำหรับดึงข้อมูลโปรไฟล์ พขร. (GET) และการบันทึก/อัปเดตโปรไฟล์ (POST)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: ค้นหาข้อมูลโปรไฟล์คนขับรถจากป้ายทะเบียนรถบัส
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plateNumber = searchParams.get('plateNumber') || '';

    if (!plateNumber) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุเลขทะเบียนรถเพื่อใช้ค้นหา' },
        { status: 400 }
      );
    }

    // ค้นหาในฐานข้อมูล
    const profile = await db.driverProfile.findUnique({
      where: {
        plateNumber: plateNumber.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: profile,
      isFallback: db.isFallback
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ พขร.', error: errorMessage },
      { status: 500 }
    );
  }
}

// POST: บันทึกหรืออัปเดตข้อมูลโปรไฟล์ พขร. (Upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plateNumber, driverName, driverPhone, factory, shift, photo } = body;

    // ตรวจสอบข้อมูลขั้นต้น
    if (!plateNumber || !driverName || !driverPhone || !factory || !shift) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกข้อมูลโปรไฟล์ที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const trimmedPlate = plateNumber.trim();

    // บันทึกหรืออัปเดตด้วยวิธี upsert
    const savedProfile = await db.driverProfile.upsert({
      where: {
        plateNumber: trimmedPlate,
      },
      update: {
        driverName,
        driverPhone,
        factory,
        shift,
        photo: photo !== undefined ? photo : null,
      },
      create: {
        plateNumber: trimmedPlate,
        driverName,
        driverPhone,
        factory,
        shift,
        photo: photo || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลโปรไฟล์ พขร. เรียบร้อย',
      data: savedProfile,
      isFallback: db.isFallback
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving driver profile:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์ พขร.', error: errorMessage },
      { status: 500 }
    );
  }
}
