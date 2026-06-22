// src/app/api/inspections/[id]/route.ts
// API Route Handler สำหรับการอัปเดตสถานะและข้อมูลการซ่อมแซมโดยช่าง (PUT)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const indexStr = searchParams.get('index');

    if (!id) {
      return new Response('ไม่พบรหัสอ้างอิงใบตรวจสภาพ', { status: 400 });
    }

    const inspection = await db.inspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      return new Response('ไม่พบข้อมูลใบตรวจสภาพ', { status: 404 });
    }

    // หากระบุ index เพื่อดึงรูปถ่าย
    if (indexStr !== null) {
      const index = parseInt(indexStr, 10);
      const images = inspection.images as string[];

      if (isNaN(index) || index < 0 || index >= images.length) {
        return new Response('ไม่พบรูปภาพในตำแหน่งที่ระบุ', { status: 400 });
      }

      const base64Data = images[index];

      // สำหรับรูปที่เป็น SVG utf8 (จำลองในข้อมูล Seed)
      if (base64Data.startsWith('data:image/svg+xml;utf8,')) {
        const svgContent = decodeURIComponent(base64Data.substring('data:image/svg+xml;utf8,'.length));
        return new Response(svgContent, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      // แยกเอา mime type และ base64 string ออกจาก data URI
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        // หากรูปไม่ใช่ Base64 Data URL (เช่นเป็น URL ตรง) ให้ทำการรีไดเรกต์ไปที่รูปนั้นเลย
        if (base64Data.startsWith('http')) {
          return NextResponse.redirect(base64Data);
        }
        return new Response('รูปแบบไฟล์รูปภาพไม่ถูกต้อง', { status: 500 });
      }

      const contentType = match[1];
      const base64String = match[2];
      const buffer = Buffer.from(base64String, 'base64');

      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // หากไม่ได้ระบุ index ให้ดึงข้อมูล JSON ตามปกติ
    return NextResponse.json({
      success: true,
      data: inspection,
      isFallback: db.isFallback
    });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return new Response('เกิดข้อผิดพลาดในการดึงข้อมูล', { status: 500 });
  }
}

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
