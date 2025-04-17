import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

interface TokenPayload {
  merchantId: string;
  email: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = verify(token, secret) as TokenPayload;
    
    // Check if the merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.merchantId },
    });
    
    if (!merchant) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Add merchant data to request context
    const requestWithAuth = request as any;
    requestWithAuth.merchant = {
      id: merchant.id,
      email: merchant.email,
    };
    
    return NextResponse.next();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid token', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
} 