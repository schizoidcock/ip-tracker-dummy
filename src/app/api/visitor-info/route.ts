import { NextRequest, NextResponse } from 'next/server';

function getRealIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return 'Unknown';
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const ip = getRealIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  const visitorInfo = {
    timestamp,
    ip,
    userAgent,
    referer: request.headers.get('referer') || 'Direct',
    acceptLanguage: request.headers.get('accept-language') || 'Unknown',
    acceptEncoding: request.headers.get('accept-encoding') || 'Unknown',
    host: request.headers.get('host') || 'Unknown',
    connection: request.headers.get('connection') || 'Unknown',
    xForwardedFor: request.headers.get('x-forwarded-for'),
    xRealIp: request.headers.get('x-real-ip'),
    cfConnectingIP: request.headers.get('cf-connecting-ip'),
    cfRay: request.headers.get('cf-ray'),
    cfCountry: request.headers.get('cf-ipcountry'),
    method: request.method,
    url: request.url,
    protocol: request.url.startsWith('https') ? 'https' : 'http',
  };
  
  // Log visitor info to console (visible in Railway logs)
  console.log('🌐 VISITOR INFO REQUEST:', JSON.stringify(visitorInfo, null, 2));
  
  return NextResponse.json({
    success: true,
    data: visitorInfo,
    message: 'Visitor information captured successfully'
  });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const ip = getRealIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    const clientData = await request.json();
    
    const logData = {
      timestamp,
      serverDetected: {
        ip,
        userAgent,
        referer: request.headers.get('referer') || 'Direct',
        host: request.headers.get('host') || 'Unknown',
      },
      clientReported: clientData
    };
    
    // Log comprehensive visitor data
    console.log('📊 VISITOR DATA LOGGED:', JSON.stringify(logData, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Visit logged successfully',
      serverDetectedIP: ip,
      timestamp
    });
  } catch (error) {
    console.error('❌ Error processing visitor data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process visitor data'
    }, { status: 400 });
  }
}