// src/app/api/users/[id]/route.ts
// API Route Handler สำหรับการแก้ไขข้อมูลผู้ใช้ (PUT) และการลบบัญชีผู้ใช้ (DELETE)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '../../auth/route';

// PUT: แก้ไขข้อมูลบัญชีผู้ใช้งาน
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, password, name, role } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบรหัสอ้างอิงบัญชีผู้ใช้' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      role?: string;
      username?: string;
      password?: string;
    } = {};

    if (name) updateData.name = name.trim();
    if (role) {
      if (!['ADMIN', 'MECHANIC', 'OFFICE'].includes(role)) {
        return NextResponse.json(
          { success: false, message: 'ระดับสิทธิ์การเข้าใช้งานไม่ถูกต้อง' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername !== existing.username) {
        const duplicate = await db.user.findUnique({
          where: { username: cleanUsername }
        });
        if (duplicate) {
          return NextResponse.json(
            { success: false, message: 'ชื่อผู้ใช้งานนี้ถูกใช้งานไปแล้ว' },
            { status: 400 }
          );
        }
        updateData.username = cleanUsername;
      }
    }

    if (password && password.trim().length >= 4) {
      updateData.password = hashPassword(password);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้', error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE: ลบบัญชีผู้ใช้งานออก
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบรหัสอ้างอิงบัญชีผู้ใช้' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ' },
        { status: 404 }
      );
    }

    // ป้องกันการลบ Admin คนสุดท้ายในระบบ
    if (existing.role === 'ADMIN') {
      const users = await db.user.findMany();
      const adminCount = users.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายในระบบได้' },
          { status: 400 }
        );
      }
    }

    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้', error: errorMessage },
      { status: 500 }
    );
  }
}
