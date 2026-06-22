// src/app/api/inspections/route.ts
// API Route Handler สำหรับดึงข้อมูลรายการทั้งหมด (GET) และการบันทึกใบตรวจสภาพใหม่ (POST)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateInspectionStatus, CHECKLIST_ITEMS } from '@/lib/utils';

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

interface TelegramInspectionInput {
  id: string;
  plateNumber: string;
  factory: string;
  driverName: string;
  driverPhone: string;
  shift: string;
  mileage: number;
  status: string;
  createdAt: Date | string;
  items: unknown;
  images: unknown;
}

// ฟังก์ชันส่งการแจ้งเตือนผ่าน Telegram Bot API
async function sendTelegramNotification(inspection: TelegramInspectionInput) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN || '8070197477:AAEHQgBIiRRDVPNEVTj5mX-BRnqCHFS1w7E';
    const rawChatId = process.env.TELEGRAM_CHAT_ID || '-5272518813';
    
    // รองรับการส่งเข้าหลายแชทคั่นด้วยจุลภาค
    const chatIds = rawChatId.split(',').map(id => id.trim()).filter(id => id.length > 0);

    // ดึงจุดที่เกิดการชำรุด ( items เก็บแบบ { key: boolean } โดยที่ false = ชำรุด )
    const items = inspection.items as Record<string, boolean>;
    const defectedItemsList: string[] = [];

    Object.entries(items).forEach(([key, value]) => {
      if (value === false) {
        const checkItem = CHECKLIST_ITEMS.find(item => item.key === key);
        if (checkItem) {
          defectedItemsList.push(`${checkItem.isCritical ? '🚨' : '⚠️'} ${checkItem.label}`);
        }
      }
    });

    let statusEmoji = '🟢';
    let statusText = 'ปกติ (พร้อมใช้งาน)';
    if (inspection.status === 'รอคิวซ่อม') {
      statusEmoji = '🟡';
      statusText = 'รอคิวซ่อมบำรุง (ชำรุดจุดย่อย)';
    } else if (inspection.status === 'ระงับการวิ่ง') {
      statusEmoji = '🔴';
      statusText = 'ระงับการวิ่งชั่วคราว (พบจุดวิกฤตความปลอดภัย!)';
    }

    const formattedTime = new Date(inspection.createdAt).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' เวลา ' + new Date(inspection.createdAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';

    const messageLines = [
      `🔔 *แจ้งเตือนการตรวจสภาพรถบัสประจำวัน*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🚌 *ทะเบียนรถบัส:* ${inspection.plateNumber}`,
      `🏢 *สังกัดโรงงาน:* ${inspection.factory}`,
      `👤 *พนักงานขับรถ:* ${inspection.driverName}`,
      `📞 *เบอร์โทรศัพท์:* ${inspection.driverPhone}`,
      `⏱️ *กะทำงาน/เที่ยววิ่ง:* ${inspection.shift}`,
      `🔢 *เลขไมล์สะสม:* ${inspection.mileage.toLocaleString()} กม.`,
      `📅 *วัน-เวลาตรวจ:* ${formattedTime}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `${statusEmoji} *ผลการตรวจสอบ:* *${inspection.status}*`,
      `💬 *รายละเอียด:* ${statusText}`,
    ];

    if (defectedItemsList.length > 0) {
      messageLines.push(`\n🔎 *จุดบกพร่องที่ตรวจพบ (${defectedItemsList.length} รายการ):*`);
      defectedItemsList.forEach(item => {
        messageLines.push(`  • ${item}`);
      });
    } else {
      messageLines.push(`\n✅ ผ่านการตรวจสอบความปลอดภัยทุกจุด`);
    }

    // ลิงก์ดูข้อมูลในแดชบอร์ด
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://first-commit-smart-fleet-safety-pro.vercel.app';
    
    // แนบรูปภาพหาก พขร. มีการอัปโหลดหลักฐานเข้ามา
    const images = (inspection.images as string[]) || [];
    if (images.length > 0) {
      messageLines.push(`\n🖼️ *รูปถ่ายหลักฐานแนบประกอบ (${images.length} ภาพ):*`);
      images.forEach((_, idx) => {
        const imageUrl = `${baseUrl}/api/inspections/${inspection.id}?index=${idx}`;
        messageLines.push(`🔗 รูปภาพที่ ${idx + 1}: ${imageUrl}`);
      });
    }

    messageLines.push(`\n🔗 [คลิกเพื่อตรวจสอบข้อมูลบนระบบควบคุม](${baseUrl})`);

    const fullMessage = messageLines.join('\n');

    // ส่งข้อความแจ้งเตือนหาทุก Chat ID ที่ตั้งค่าไว้
    for (const chatId of chatIds) {
      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: fullMessage,
          parse_mode: 'Markdown',
          disable_web_page_preview: false, // อนุญาตให้ Telegram โหลดพรีวิวรูปภาพเพื่อวิเคราะห์เบื้องต้นได้ทันที
        }),
      });
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
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

    // ส่งการแจ้งเตือน Telegram หลังบันทึกข้อมูลเรียบร้อย (ทำงานแบบ Safe Call ไม่ขัดขวางการตอบกลับ พขร. หาก Telegram ล่ม)
    await sendTelegramNotification(newInspection);

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
