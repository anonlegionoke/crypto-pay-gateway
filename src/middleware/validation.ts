import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  tokenAddress: z.string().min(32).max(44),
  merchantId: z.string().uuid(),
};

export async function validateRequest(
  request: NextRequest,
  schema: z.ZodSchema
): Promise<NextResponse | null> {
  try {
    const body = await request.json();
    await schema.parseAsync(body);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({
          error: 'Validation failed',
          details: error.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    return new NextResponse(
      JSON.stringify({
        error: 'Invalid request body',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 