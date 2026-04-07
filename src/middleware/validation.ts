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

export interface ValidationResult<T> {
  data?: T;
  response?: NextResponse;
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = await schema.parseAsync(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        response: new NextResponse(
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
        ),
      };
    }
    return {
      response: new NextResponse(
        JSON.stringify({
          error: 'Invalid request body',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ),
    };
  }
} 
