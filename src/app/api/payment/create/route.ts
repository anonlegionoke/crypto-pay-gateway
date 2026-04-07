import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Use /api/payment/initiate to create payment intents. This route is deprecated.',
      code: 'DEPRECATED_ROUTE',
    },
    { status: 410 }
  );
}
