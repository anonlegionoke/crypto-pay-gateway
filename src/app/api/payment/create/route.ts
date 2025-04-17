import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/middleware/validation';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/error-handler';

// Create payment schema
const createPaymentSchema = z.object({
  merchantId: commonSchemas.merchantId,
  amount: commonSchemas.amount,
  token: z.string(),
  fromWallet: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  // Validate request
  const validationResponse = await validateRequest(request, createPaymentSchema);
  if (validationResponse) return validationResponse;

  try {
    const body = await request.json();
    
    // Create payment in database
    const payment = await prisma.payment.create({
      data: {
        merchantId: body.merchantId,
        amount: body.amount,
        token: body.token,
        fromWallet: body.fromWallet || 'pending',
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        paymentId: payment.id,
        paymentUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/${payment.id}`
      },
      { status: 201 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
} 