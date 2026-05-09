import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [msgSetting, activeSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'announcement_message' } }),
      prisma.setting.findUnique({ where: { key: 'announcement_active' } }),
    ]);

    const active = activeSetting?.value === 'true';
    const message = msgSetting?.value || '';

    if (!active || !message) {
      return NextResponse.json({ announcement: null });
    }

    return NextResponse.json({ announcement: message });
  } catch {
    return NextResponse.json({ announcement: null });
  }
}
