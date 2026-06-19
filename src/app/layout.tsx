// src/app/layout.tsx
// หน้าจัดวางโครงสร้างหลัก (Root Layout) ทำหน้าที่โหลดฟอนต์ Sarabun และครอบคอมโพเนนต์นำทางของระบบ

import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import AppLayout from '@/components/layout/AppLayout';
import './globals.css';

// โหลดฟอนต์ Sarabun สนับสนุนภาษาไทยอย่างเป็นทางการ
const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-sarabun',
});

// กำหนด SEO Title และ Meta Description ของระบบ
export const metadata: Metadata = {
  title: 'Smart Fleet Safety Pro - ระบบตรวจสภาพรถบัสประจำวัน (Thailux)',
  description: 'ระบบตรวจสภาพรถบัสประจำวัน 21 จุด เพื่อความปลอดภัยของพนักงานขับรถบัสและผู้โดยสาร บริษัท Thailux',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className={`${sarabun.className} min-h-full flex flex-col text-slate-800 bg-slate-50`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
