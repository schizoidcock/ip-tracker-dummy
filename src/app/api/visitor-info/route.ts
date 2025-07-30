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

// Enhanced proxy/VPN detection with faster processing
async function detectProxyVPN(ip: string, request: NextRequest) {
  const startTime = Date.now();
  
  const proxyHeaders = [
    'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'true-client-ip',
    'x-forwarded-proto', 'x-forwarded-host', 'x-cluster-client-ip'
  ];

  const detectedHeaders: { header: string; value: string }[] = [];
  proxyHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) detectedHeaders.push({ header, value });
  });

  // Quick IP chain analysis
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipChain = forwardedFor ? forwardedFor.split(',').map(ip => ip.trim()) : [];
  const hasMultipleIPs = ipChain.length > 1;
  const isLikelyProxy = detectedHeaders.length > 0 || hasMultipleIPs;

  // Basic automation detection
  const userAgent = request.headers.get('user-agent') || '';
  const isAutomated = /bot|crawler|spider|scraper/i.test(userAgent);

  // PARALLEL geolocation and Tor detection for speed
  const promises = [];
  
  // Promise 1: Fast geolocation (with shorter timeout)
  promises.push(
    fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,isp,org,proxy,hosting`, {
      signal: AbortSignal.timeout(1500) // Reduced from default timeout
    }).then(r => r.json()).catch(() => null)
  );
  
  // Promise 2: Tor detection (with timeout)
  promises.push(
    fetch(`https://check.torproject.org/api/ip/${ip}`, {
      signal: AbortSignal.timeout(1000) // Very short timeout for Tor check
    }).then(r => r.json()).catch(() => null)
  );

  const [geoData, torData] = await Promise.allSettled(promises);
  
  // Process results quickly
  const geo = geoData.status === 'fulfilled' ? geoData.value : null;
  const tor = torData.status === 'fulfilled' ? torData.value : null;
  
  // Fast Tor detection
  let isTor = tor?.IsTor === true;
  let torDetectionMethod = isTor ? 'Official Tor Exit Node List' : '';
  
  // Quick fallback Tor detection using ISP patterns
  if (!isTor && geo) {
    const torPatterns = ['tor', 'exit', 'relay', 'privacy foundation'];
    const isp = (geo.isp || '').toLowerCase();
    const org = (geo.org || '').toLowerCase();
    
    if (torPatterns.some(pattern => isp.includes(pattern) || org.includes(pattern))) {
      isTor = true;
      torDetectionMethod = 'ISP Pattern Analysis';
    }
  }

  // Determine connection type quickly
  let connectionType = 'Direct';
  if (isTor) connectionType = 'Tor Network';
  else if (geo?.hosting) connectionType = 'Hosting/VPS';
  else if (geo?.proxy || isLikelyProxy) connectionType = 'Proxy/VPN';

  const processingTime = Date.now() - startTime;

  return {
    isLikelyProxy: isLikelyProxy || isTor,
    hasMultipleIPs,
    isTor,
    torDetectionMethod,
    proxyHeaders: detectedHeaders,
    ipChain,
    realIP: isTor ? 'Hidden by Tor Network' : (ipChain[0] || ip),
    proxyChain: ipChain.slice(1),
    isAutomated,
    geoData: geo,
    analysis: {
      proxyScore: detectedHeaders.length + (hasMultipleIPs ? 2 : 0) + (isAutomated ? 1 : 0) + (isTor ? 5 : 0),
      confidence: (isTor || isLikelyProxy) ? 'High' : 'Low',
      type: connectionType,
      processingTime: `${processingTime}ms`,
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
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const ip = getRealIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    const clientData = await request.json();
    const dataType = clientData.type || 'UNKNOWN';
    
    // Fast-track instant capture data (minimal processing)
    if (dataType === 'INSTANT_CAPTURE') {
      const sessionId = getOrCreateSession(ip, userAgent);
      const session = visitorSessions.get(`${ip}_${userAgent}`);
      
      console.log(`⚡ INSTANT CAPTURE - ${sessionId} (Visit #${session.visitCount})`);
      console.log(`   ├─ Speed: ${clientData.captureSpeed}`);
      console.log(`   ├─ Browser: ${clientData.userAgent.split(' ')[0]}`);
      console.log(`   └─ IP: ${ip}`);
      
      return NextResponse.json({
        success: true,
        message: 'Instant capture logged',
        sessionId,
        processingTime: `${Date.now() - startTime}ms`
      });
    }
    
    // Performance metrics (minimal processing)
    if (dataType === 'PERFORMANCE_METRICS') {
      console.log(`📊 PERFORMANCE METRICS:`);
      console.log(`   ├─ Total Capture Time: ${clientData.totalCaptureTime}ms`);
      console.log(`   ├─ Main Data Result: ${clientData.mainDataResult}`);
      console.log(`   └─ Geo Data Available: ${clientData.geoDataAvailable}`);
      
      return NextResponse.json({ success: true, message: 'Metrics logged' });
    }
    
    // Error reports (minimal processing)
    if (dataType === 'CAPTURE_ERROR') {
      console.error(`❌ CAPTURE ERROR: ${clientData.error}`);
      return NextResponse.json({ success: true, message: 'Error logged' });
    }
    
    // Geolocation data (skip proxy detection for speed)
    if (dataType === 'GEOLOCATION_DATA') {
      console.log(`🌍 GEOLOCATION (${clientData.source}):`);
      console.log(`   ├─ Location: ${clientData.city}, ${clientData.country}`);
      console.log(`   ├─ ISP: ${clientData.isp || 'Unknown'}`);
      console.log(`   └─ IP: ${clientData.ip || ip}`);
      
      return NextResponse.json({ success: true, message: 'Geolocation logged' });
    }
    
    // Main data processing (full analysis but optimized)
    let proxyDetection = null;
    if (dataType === 'MAIN_DATA') {
      // Only run proxy detection for main data to save time
      proxyDetection = await detectProxyVPN(ip, request);
    }
    
    const sessionId = getOrCreateSession(ip, userAgent);
    const session = visitorSessions.get(`${ip}_${userAgent}`);
    
    // Optimized logging based on data type
    if (dataType === 'MAIN_DATA') {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`👤 VISITOR: ${sessionId} (Visit #${session.visitCount})`);
      console.log(`🌍 IP: ${ip} | 🌎 Location: ${proxyDetection.geoData?.country || 'Unknown'}`);
      console.log(`🖥️  Device: ${clientData.os} | 🌐 Browser: ${clientData.browser}`);
      console.log(`📱 Type: ${clientData.deviceType} | 📏 Screen: ${clientData.screenResolution}`);
      
      if (proxyDetection.isTor) {
        console.log(`🧅 CONNECTION: Tor Network (${proxyDetection.torDetectionMethod})`);
      } else if (proxyDetection.isLikelyProxy) {
        console.log(`🔒 CONNECTION: ${proxyDetection.analysis.type}`);
      } else {
        console.log(`🔓 CONNECTION: Direct`);
      }
      
      console.log(`⚡ Capture Speed: ${clientData.captureTime}ms | Processing: ${proxyDetection.analysis.processingTime}`);
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log(`${'='.repeat(50)}\n`);
    }
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: `${dataType} logged successfully`,
      sessionId,
      visitCount: session.visitCount,
      serverDetectedIP: ip,
      realIP: proxyDetection?.realIP || ip,
      isProxy: proxyDetection?.isLikelyProxy || false,
      isTor: proxyDetection?.isTor || false,
      proxyType: proxyDetection?.analysis.type || 'Unknown',
      processingTime: `${processingTime}ms`,
      timestamp
    });
    
  } catch (error) {
    console.error('❌ Error processing visitor data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process visitor data',
      processingTime: `${Date.now() - startTime}ms`
    }, { status: 400 });
  }
}