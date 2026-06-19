// src/components/ui/index.tsx
// รวมคอมโพเนนต์ UI พื้นฐาน (Design System) ที่ได้รับการตกแต่งในสไตล์ระดับพรีเมียม (Premium Modern Design)
// คุมโทนสีน้ำเงินเข้ม (#1e3a8a) และ แดงเลือดหมู (#b91c1c) พร้อมเงาและขอบมนสวยงาม

import React from 'react';
import { cn, STATUS_THEME } from '@/lib/utils';

// ==========================================
// 1. CARD COMPONENT (การ์ดแสดงข้อมูล)
// ==========================================
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pb-4 border-b border-slate-50", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-bold text-slate-800 tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

// ==========================================
// 2. BUTTON COMPONENT (ปุ่มกดแบบมีเอฟเฟกต์)
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        // สีตามธีมและเอฟเฟกต์โฮเวอร์
        variant === 'primary' && "bg-blue-900 text-white hover:bg-blue-950 shadow-sm shadow-blue-900/10",
        variant === 'secondary' && "bg-slate-100 text-slate-800 hover:bg-slate-200",
        variant === 'danger' && "bg-rose-700 text-white hover:bg-rose-800 shadow-sm shadow-rose-700/10",
        variant === 'outline' && "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50",
        variant === 'ghost' && "text-slate-600 hover:bg-slate-100",
        // ขนาดปุ่ม
        size === 'sm' && "px-3 py-1.5 text-sm",
        size === 'md' && "px-5 py-2.5 text-base",
        size === 'lg' && "px-7 py-3 text-lg",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ==========================================
// 3. BADGE COMPONENT (ป้ายแสดงสถานะ)
// ==========================================
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

export function Badge({ className, status, children, ...props }: BadgeProps) {
  const theme = STATUS_THEME[status] || {
    bg: 'bg-slate-100 text-slate-800 border-slate-200',
    text: 'text-slate-800',
    border: 'border-slate-200'
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
        theme.bg,
        className
      )}
      {...props}
    >
      {children || status}
    </span>
  );
}

// ==========================================
// 4. DIALOG / MODAL COMPONENT (กล่องป๊อปอัป)
// ==========================================
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* พื้นหลังมัวขุ่น (Blur backdrop) */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* ตัวกล่องป๊อปอัป */}
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. INSPECTION TOGGLE SWITCH (สวิตช์ตรวจสภาพ ปกติ/ชำรุด)
// ==========================================
interface ToggleProps {
  checked: boolean; // true = ปกติ (Normal), false = ชำรุด (Defective)
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
}

export function InspectionToggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-3 w-full">
      {label && <span className="text-slate-700 font-medium text-sm sm:text-base">{label}</span>}
      
      <div className="flex items-center bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto self-stretch sm:self-auto">
        {/* ปุ่มเลือก "ปกติ" (สีเขียว) */}
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer",
            checked
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          ปกติ
        </button>
        
        {/* ปุ่มเลือก "ชำรุด" (สีแดง) */}
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer",
            !checked
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          ชำรุด
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 6. FORM INPUT & SELECT HELPER
// ==========================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 focus:outline-none transition-all text-slate-800 bg-white placeholder:text-slate-400",
          className
        )}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export function FormSelect({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <select
          className={cn(
            "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 focus:outline-none transition-all text-slate-800 bg-white appearance-none cursor-pointer",
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* ไอคอนลูกศรลงของ Dropdown */}
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
          ▼
        </div>
      </div>
    </div>
  );
}
