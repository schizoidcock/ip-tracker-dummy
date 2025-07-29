import { NextRequest, NextResponse } from 'next/server';

// Simple session tracking
const visitorSessions = new Map();
let sessionCounter = 1;

function generateSessionId(): string {
  return `SESSION_${sessionCounter++}_${Date.now()}`;
}

function getOrCreateSession(ip: string, userAgent: string): string {
  const sessionKey = `${ip}_${userAgent}`;
  
  if (!visitorSessions.has(sessionKey)) {
    const sessionId = generateSessionId();
    visitorSessions.set(sessionKey, {
      sessionId,
      firstSeen: new Date().toISOString(),
      visitCount: 0
    });
    console.log(`🆕 NEW VISITOR SESSION: ${sessionId}`);
  }
  
  const session = visitorSessions.get(sessionKey);
  session.visitCount++;
  session.lastSeen = new Date().toISOString();
  
  return session.sessionId;
}

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

  // Enhanced Tor detection
  let isTor = false;
  let torDetectionMethod = '';
  
  // Check if IP is a known Tor exit node
  try {
    // Using TorProject's official exit node list API
    const torCheckResponse = await fetch(`https://check.torproject.org/api/ip/${ip}`);
    if (torCheckResponse.ok) {
      const torData = await torCheckResponse.json();
      isTor = torData.IsTor === true;
      if (isTor) torDetectionMethod = 'Official Tor Exit Node List';
    }
  } catch (error) {
    console.log('⚠️ Tor API unavailable, using fallback detection');
  }
  
  // Enhanced fallback: Check common Tor indicators
  if (!isTor && geoData) {
    const torIndicators = [
      /tor/i.test(geoData.isp || ''),
      /tor/i.test(geoData.org || ''),
      /exit.*node/i.test(geoData.isp || ''),
      /relay/i.test(geoData.isp || ''),
      /privacy/i.test(geoData.isp || ''),
      /foundation.*applied.*privacy/i.test(geoData.isp || ''),
      /foundation.*applied.*privacy/i.test(geoData.org || ''),
      /torservers/i.test(geoData.org || ''),
      /article.*19/i.test(geoData.org || ''),
      geoData.proxy === true && /AS208323/i.test(geoData.as || ''), // Known Tor AS
      geoData.proxy === true && /vienna/i.test(geoData.city || '') && /foundation/i.test(geoData.org || '')
    ];
    
    if (torIndicators.some(indicator => indicator)) {
      isTor = true;
      torDetectionMethod = 'ISP/Organization Pattern Analysis';
    }
  }

  // Determine connection type with enhanced Tor detection
  let connectionType = 'Direct';
  if (isTor) {
    connectionType = 'Tor Network';
  } else if (geoData?.hosting) {
    connectionType = 'Hosting/VPS';
  } else if (geoData?.proxy) {
    connectionType = 'Proxy/VPN';
  } else if (hasMultipleIPs) {
    connectionType = 'Proxy Chain';
  } else if (isLikelyProxy) {
    connectionType = 'Proxy/VPN';
  }

  return {
    isLikelyProxy: isLikelyProxy || isTor,
    hasMultipleIPs,
    isTor,
    torDetectionMethod,
    proxyHeaders: detectedHeaders,
    ipChain,
    realIP: isTor ? 'Hidden by Tor Network' : (ipChain.length > 0 ? ipChain[0] : ip),
    proxyChain: ipChain.length > 1 ? ipChain.slice(1) : [],
    isAutomated,
    geoData,
    analysis: {
      proxyScore: detectedHeaders.length + (hasMultipleIPs ? 2 : 0) + (isAutomated ? 1 : 0) + (isTor ? 5 : 0),
      confidence: (isTor || isLikelyProxy) ? 'High' : 'Low',
      type: connectionType,
      explanation: isTor 
        ? 'Real IP cannot be determined - Tor network provides anonymity by design'
        : connectionType === 'Direct' 
        ? 'Direct connection detected'
        : 'Proxy/VPN detected - real IP may be hidden'
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
    
    // Get or create session for this visitor
    const sessionId = getOrCreateSession(ip, userAgent);
    const session = visitorSessions.get(`${ip}_${userAgent}`);
    
    // Enhanced logging with emojis and session tracking
    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 VISITOR: ${sessionId} (Visit #${session.visitCount})`);
    console.log(`🌍 IP: ${ip} | 🌎 Country: ${proxyDetection.geoData?.country || 'Unknown'}`);
    console.log(`🖥️  Device: ${clientData.os || 'Unknown'} | 🌐 Browser: ${clientData.browser || 'Unknown'}`);
    
    if (proxyDetection.isTor) {
      console.log(`🧅 CONNECTION: Tor Network`);
      console.log(`   ├─ Method: ${proxyDetection.torDetectionMethod}`);
      console.log(`   ├─ Exit Node: ${ip}`);
      console.log(`   ├─ Real IP: Hidden by Tor Network`);
      console.log(`   └─ ISP: ${proxyDetection.geoData?.isp || 'Unknown'}`);
    } else if (proxyDetection.isLikelyProxy) {
      console.log(`🔒 CONNECTION: ${proxyDetection.analysis.type}`);
      console.log(`   ├─ Real IP: ${proxyDetection.realIP}`);
      console.log(`   ├─ Confidence: ${proxyDetection.analysis.confidence}`);
      console.log(`   └─ ISP: ${proxyDetection.geoData?.isp || 'Unknown'}`);
    } else {
      console.log(`🔓 CONNECTION: Direct`);
      console.log(`   └─ ISP: ${proxyDetection.geoData?.isp || 'Unknown'}`);
    }
    
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Log comprehensive visitor data
    console.log('📊 VISITOR DATA LOGGED:', JSON.stringify(logData, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Visit logged successfully',
      sessionId,
      visitCount: session.visitCount,
      serverDetectedIP: ip,
      realIP: proxyDetection.realIP,
      isProxy: proxyDetection.isLikelyProxy,
      isTor: proxyDetection.isTor,
      proxyType: proxyDetection.analysis.type,
      explanation: proxyDetection.analysis.explanation,
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