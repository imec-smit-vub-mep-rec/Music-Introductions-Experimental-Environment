import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the client IP address from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    let clientIp = '127.0.0.1'; // Default fallback
    
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      clientIp = forwarded.split(',')[0].trim();
    } else if (realIp) {
      clientIp = realIp;
    } else if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else {
      // Fallback to connection remote address
      clientIp = request.ip || '127.0.0.1';
    }
    
    return NextResponse.json({ ip: clientIp });
  } catch (error) {
    console.error('Error getting client IP:', error);
    return NextResponse.json({ ip: '127.0.0.1' });
  }
}
