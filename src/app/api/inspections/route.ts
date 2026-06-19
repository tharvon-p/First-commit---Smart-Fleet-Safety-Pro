// src/app/api/inspections/route.ts
// API Route Handler สำหรับดึงข้อมูลรายการทั้งหมด (GET) และการบันทึกใบตรวจสภาพใหม่ (POST)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateInspectionStatus } from '@/lib/utils';

// ดึงข้อมูลรายการการตรวจสภาพรถทั้งหมด พร้อมระบบฟิลเตอร์
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const factory = searchParams.get('factory') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    // ค้นหาสังกัดโรงงาน
    if (factory && factory !== 'ทั้งหมด') {
      whereClause.factory = factory;
    }

    // ค้นหาตามสถานะการซ่อมบำรุง
    if (status && status !== 'ทั้งหมด') {
      whereClause.status = status;
    }

    // ค้นหาตามการพิมพ์ข้อความ (ทะเบียนรถ หรือ ชื่อคนขับ)
    if (query) {
      whereClause.OR = [
        { plateNumber: { contains: query, mode: 'insensitive' } },
        { driverName: { contains: query, mode: 'insensitive' } },
      ];
    }

    // ค้นหาตามช่วงเวลาที่สร้างข้อมูล (Date Range)
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        // กำหนดเป็นจุดเริ่มต้นของวันนั้นๆ (00:00:00)
        whereClause.createdAt.gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      }
      if (endDate) {
        // กำหนดเป็นจุดสิ้นสุดของวันนั้นๆ (23:59:59)
        whereClause.createdAt.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      }
    }

    // ดึงข้อมูลตามเงื่อนไข จัดเรียงตามวันเวลาสร้างล่าสุด
    const inspections = await db.inspection.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: inspections,
      isFallback: db.isFallback
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: errorMessage },
      { status: 500 }
    );
  }
}

// รับข้อมูลจากฟอร์มคนขับรถบัส และทำการคำนวณผลลัพธ์เพื่อเซฟลงฐานข้อมูล
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factory, plateNumber, driverName, driverPhone, shift, mileage, items, images } = body;

    // ตรวจสอบข้อมูลขั้นต้น
    if (!factory || !plateNumber || !driverName || !driverPhone || !shift || mileage === undefined || !items) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // แปลงประเภทตัวเลขไมล์
    const parsedMileage = parseInt(mileage, 10);
    if (isNaN(parsedMileage)) {
      return NextResponse.json(
        { success: false, message: 'ตัวเลขไมล์ปัจจุบันต้องเป็นตัวเลขเท่านั้น' },
        { status: 400 }
      );
    }

    // คำนวณสถานะผลลัพธ์การตรวจสภาพอัตโนมัติ (ปกติ / รอคิวซ่อม / ระงับการวิ่ง)
    const calculatedStatus = calculateInspectionStatus(items);

    // เซฟลง Database
    const newInspection = await db.inspection.create({
      data: {
        factory,
        plateNumber,
        driverName,
        driverPhone,
        shift,
        mileage: parsedMileage,
        items, // บันทึกเป็น JSON object
        images: images || [], // บันทึกเป็น JSON array เก็บ URL ของภาพหลักฐาน (หรือ base64)
        status: calculatedStatus,
        mechanicNotes: null,
        repairedAt: null
      },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกรายงานตรวจสภาพรถสำเร็จ',
      data: newInspection,
      isFallback: db.isFallback
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating inspection:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', error: errorMessage },
      { status: 500 }
    );
  }
}
