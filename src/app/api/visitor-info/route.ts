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

// Enhanced proxy/VPN detection
async function detectProxyVPN(ip: string, request: NextRequest) {
  const proxyHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-forwarded-proto',
    'x-forwarded-host',
    'x-cluster-client-ip',
    'x-originating-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'x-client-ip',
    'fastly-client-ip',
    'x-azure-clientip',
    'x-azure-socketip'
  ];

  const detectedHeaders: { header: string; value: string }[] = [];
  for (const header of proxyHeaders) {
    const value = request.headers.get(header);
    if (value) {
      detectedHeaders.push({ header, value });
    }
  }

  // Check for multiple IP addresses in forwarded headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  let ipChain: string[] = [];
  if (forwardedFor) {
    ipChain = forwardedFor.split(',').map(ip => ip.trim());
  }

  // Basic VPN/Proxy indicators
  const isLikelyProxy = detectedHeaders.length > 0 || ipChain.length > 1;
  const hasMultipleIPs = ipChain.length > 1;
  
  // Additional checks
  const userAgent = request.headers.get('user-agent') || '';
  const isAutomated = /bot|crawler|spider|scraper/i.test(userAgent);
  
  // Try to get geolocation data for additional analysis
  let geoData: any = null;
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting`);
    if (response.ok) {
      geoData = await response.json();
    }
  } catch (error) {
    console.log('⚠️ Geolocation API unavailable');
  }

  return {
    isLikelyProxy,
    hasMultipleIPs,
    proxyHeaders: detectedHeaders,
    ipChain,
    realIP: ipChain.length > 0 ? ipChain[0] : ip,
    proxyChain: ipChain.length > 1 ? ipChain.slice(1) : [],
    isAutomated,
    geoData,
    analysis: {
      proxyScore: detectedHeaders.length + (hasMultipleIPs ? 2 : 0) + (isAutomated ? 1 : 0),
      confidence: isLikelyProxy ? 'High' : 'Low',
      type: geoData?.hosting ? 'Hosting/VPS' : geoData?.proxy ? 'Proxy/VPN' : hasMultipleIPs ? 'Proxy Chain' : 'Direct'
    }
  };
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const ip = getRealIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  // Get proxy/VPN detection
  const proxyDetection = await detectProxyVPN(ip, request);
  
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
    proxyDetection
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
    
    // Get proxy/VPN detection
    const proxyDetection = await detectProxyVPN(ip, request);
    
    const logData = {
      timestamp,
      serverDetected: {
        ip,
        userAgent,
        referer: request.headers.get('referer') || 'Direct',
        host: request.headers.get('host') || 'Unknown',
        proxyDetection
      },
      clientReported: clientData
    };
    
    // Enhanced logging with proxy/VPN information
    if (proxyDetection.isLikelyProxy) {
      console.log('🔍 PROXY/VPN DETECTED:');
      console.log(`   Real IP: ${proxyDetection.realIP}`);
      console.log(`   Proxy Chain: ${proxyDetection.ipChain.join(' → ')}`);
      console.log(`   Type: ${proxyDetection.analysis.type}`);
      console.log(`   Confidence: ${proxyDetection.analysis.confidence}`);
      console.log(`   Score: ${proxyDetection.analysis.proxyScore}/10`);
      if (proxyDetection.geoData) {
        console.log(`   ISP: ${proxyDetection.geoData.isp || 'Unknown'}`);
        console.log(`   Organization: ${proxyDetection.geoData.org || 'Unknown'}`);
        console.log(`   Country: ${proxyDetection.geoData.country || 'Unknown'}`);
      }
    }
    
    // Log comprehensive visitor data
    console.log('📊 VISITOR DATA LOGGED:', JSON.stringify(logData, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Visit logged successfully',
      serverDetectedIP: ip,
      realIP: proxyDetection.realIP,
      isProxy: proxyDetection.isLikelyProxy,
      proxyType: proxyDetection.analysis.type,
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