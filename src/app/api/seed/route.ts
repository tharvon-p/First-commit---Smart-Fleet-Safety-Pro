import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { db, InspectionRecord } from '@/lib/db';
import { CHECKLIST_ITEMS, calculateInspectionStatus } from '@/lib/utils';

export async function GET() {
  try {
    // 1. ลบข้อมูลเก่าในระบบจำลองไฟล์ JSON (หากใช้งานอยู่) หรือปล่อยไว้ใน PG เพื่อไม่ให้กระทบ
    // สำหรับระบบนี้เราจะเขียนสุ่มทับ/สร้างเพิ่ม
    
    const mockDrivers = [
      { name: 'สมชาย รักดี', phone: '0812345678' },
      { name: 'วิชัย มั่นคง', phone: '0823456789' },
      { name: 'มานะ ขยันยิ่ง', phone: '0834567890' },
      { name: 'สมศักดิ์ ปลอดภัย', phone: '0845678901' },
      { name: 'อุดม ช่วยเจริญ', phone: '0856789012' }
    ];

    const mockBuses = [
      { plate: '30-1001 กทม.', factory: 'KCE' },
      { plate: '30-1002 กทม.', factory: 'สุริยัน' },
      { plate: '30-1003 กทม.', factory: 'KCE' },
      { plate: '30-1004 กทม.', factory: 'สุริยัน' },
      { plate: '30-1005 กทม.', factory: 'อมตะซิตี้' }
    ];

    const mockShifts = [
      'กะเช้า (06:00 - 18:00)',
      'กะดึก (18:00 - 06:00)',
      'เที่ยววิ่งเสริมกลางวัน'
    ];

    // สร้างข้อมูลย้อนหลัง 15 วัน
    const generatedRecords = [];
    const now = new Date();

    for (let i = 15; i >= 0; i--) {
      // สุ่มสร้าง 1-2 งานต่อวัน
      const inspectionsCount = Math.floor(Math.random() * 2) + 1;
      
      for (let j = 0; j < inspectionsCount; j++) {
        const bus = mockBuses[Math.floor(Math.random() * mockBuses.length)];
        const driver = mockDrivers[Math.floor(Math.random() * mockDrivers.length)];
        const shift = mockShifts[Math.floor(Math.random() * mockShifts.length)];
        
        // คำนวณวันย้อนหลัง
        const recordDate = new Date();
        recordDate.setDate(now.getDate() - i);
        // สุ่มชั่วโมงและนาที
        recordDate.setHours(6 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);

        // เลขไมล์สะสมตามวัน (วันเก่าไมล์น้อย วันใหม่ไมล์เพิ่มขึ้น)
        const baseMileage = 100000 + (15 - i) * 150 + j * 50;
        
        // สุ่มสร้างผลการเช็ก 21 จุด
        const items: Record<string, boolean> = {};
        CHECKLIST_ITEMS.forEach(item => {
          // สุ่มให้ผ่าน 95% ของการเช็กทั่วไป
          // หากต้องการให้พบจุดชำรุด ให้สุ่มเป็น false
          const probability = item.isCritical ? 0.98 : 0.95;
          items[item.key] = Math.random() < probability;
        });

        // คำนวณสถานะผลลัพธ์จากไอเทม
        let status: string = calculateInspectionStatus(items);

        // สุ่มจำลองรูปภาพหลักฐาน (Base64 จำลอง หรือว่างเปล่า)
        const images: string[] = [];
        if (status !== 'ปกติ') {
          // แนบรูปตัวอย่างหากพบจุดชำรุด (ใช้ภาพ Placeholder หรือเว้นว่าง)
          images.push('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fee2e2"/><text x="50" y="50" font-size="10" font-family="Arial" font-weight="bold" fill="%23991b1b" dominant-baseline="middle" text-anchor="middle">พบจุดชำรุด</text></svg>');
        }

        let mechanicNotes: string | null = null;
        let repairedAt: Date | null = null;

        // สุ่มให้ 50% ของสถานะที่ไม่ปกติในประวัติเก่า ได้รับการซ่อมเสร็จสิ้นแล้วโดยช่าง
        if (i > 1 && status !== 'ปกติ' && Math.random() < 0.6) {
          status = 'ซ่อมเสร็จสิ้น';
          mechanicNotes = 'ดำเนินการเปลี่ยนอะไหล่ที่ชำรุดและทำการตรวจเช็กซ้ำเรียบร้อย รถสามารถออกวิ่งได้อย่างปลอดภัย';
          const repairDate = new Date(recordDate);
          repairDate.setHours(repairDate.getHours() + 2); // ซ่อมเสร็จหลังเช็ก 2 ชั่วโมง
          repairedAt = repairDate;
        }

        // เซฟลงฐานข้อมูลผ่าน db wrapper
        const record = await db.inspection.create({
          data: {
            factory: bus.factory,
            plateNumber: bus.plate,
            driverName: driver.name,
            driverPhone: driver.phone,
            shift: shift,
            mileage: baseMileage,
            items: items,
            images: images,
            status: status,
            mechanicNotes: mechanicNotes,
            repairedAt: repairedAt
          }
        });

        if (db.isFallback) {
          // ใน JSON DB wrapper มีฟังก์ชันเซฟ แต่อาจต้องย้อนวันที่
          // ดึงประวัติตัวจริงจาก JSON และแก้ `createdAt` และ `updatedAt`
          try {
            const file = path.join(process.cwd(), 'db_fallback.json');
            if (fs.existsSync(file)) {
              const records = JSON.parse(fs.readFileSync(file, 'utf-8'));
              const index = records.findIndex((r: InspectionRecord) => r.id === record.id);
              if (index !== -1) {
                records[index].createdAt = recordDate.toISOString();
                records[index].updatedAt = recordDate.toISOString();
                if (repairedAt) {
                  records[index].repairedAt = repairedAt.toISOString();
                }
                fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf-8');
              }
            }
          } catch (e) {
            console.error('Error rewriting dates in JSON fallback:', e);
          }
        }

        generatedRecords.push(record);
      }
    }

    return NextResponse.json({
      success: true,
      message: `สร้างข้อมูลตัวอย่างการตรวจบัสเรียบร้อยแล้ว จำนวน ${generatedRecords.length} รายการ`,
      count: generatedRecords.length,
      isFallback: db.isFallback
    });
  } catch (error) {
    console.error('Seeding error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างข้อมูลตัวอย่าง',
      error: errorMessage
    }, { status: 500 });
  }
}
