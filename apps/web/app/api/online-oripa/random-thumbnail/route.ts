import { NextResponse } from 'next/server';
import { getActiveOnlineOripaItems } from '@/lib/online-oripa';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { items } = await getActiveOnlineOripaItems();
  const item = items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null;

  return NextResponse.json(
    { imageUrl: item?.imageUrl ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
