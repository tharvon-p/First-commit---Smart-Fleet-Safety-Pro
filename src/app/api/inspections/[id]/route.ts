// src/app/api/inspections/[id]/route.ts
// API Route Handler สำหรับการอัปเดตสถานะและข้อมูลการซ่อมแซมโดยช่าง (PUT)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ดึงค่า id จากพารามิเตอร์ URL
    const { id } = await params;
    
    // ดึงข้อมูลใน Request Body
    const body = await request.json();
    const { status, mechanicNotes } = body;

    // ตรวจสอบว่ามี id หรือไม่
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบรหัสอ้างอิงใบตรวจสภาพ' },
        { status: 400 }
      );
    }

    // ดึงข้อมูลแถวเดิมมาตรวจสอบความมีอยู่จริง
    const existing = await db.inspection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลใบตรวจสภาพนี้ในระบบ' },
        { status: 404 }
      );
    }

    // อัปเดตข้อมูลการซ่อม
    const updated = await db.inspection.update({
      where: { id },
      data: {
        status: status || 'ซ่อมเสร็จสิ้น',
        mechanicNotes: mechanicNotes || '',
        repairedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'อัปเดตสถานะการซ่อมบำรุงเรียบร้อยแล้ว',
      data: updated,
      isFallback: db.isFallback
    });
  } catch (error) {
    console.error(`Error updating inspection status for id:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการปรับปรุงสถานะ', error: errorMessage },
      { status: 500 }
    );
  }
}
