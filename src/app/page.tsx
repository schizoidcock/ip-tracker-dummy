'use client';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // IMMEDIATE data capture - execute as fast as possible
    const captureInstantData = () => {
      console.log('⚡ INSTANT CAPTURE INITIATED');
      const timestamp = Date.now();
      
      // Capture basic data immediately (synchronous)
      const instantData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer || 'Direct',
        language: navigator.language,
        screenRes: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        online: navigator.onLine,
        captureSpeed: `${Date.now() - timestamp}ms`
      };
      
      // Send instant data immediately (fire-and-forget)
      fetch('/api/visitor-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'INSTANT_CAPTURE', ...instantData }),
        keepalive: true
      }).catch(() => {}); // Ignore errors for speed
      
      console.log('⚡ INSTANT DATA SENT:', instantData);
    };
    
    // Execute instant capture immediately
    captureInstantData();
    
    // Enhanced comprehensive data capture with parallel processing
    const captureComprehensiveData = async () => {
      try {
        console.log('🚀 COMPREHENSIVE CAPTURE STARTED');
        const startTime = Date.now();
        
        // Collect all client-side data (optimized for speed)
        const clientData = {
          // Core browser info (fast)
          userAgent: navigator.userAgent,
          browser: detectBrowser(navigator.userAgent),
          os: detectOS(navigator.userAgent),
          platform: navigator.platform,
          language: navigator.language,
          languages: navigator.languages,
          
          // Device & Display (very fast)
          screenResolution: `${screen.width} x ${screen.height}`,
          screenColorDepth: screen.colorDepth,
          windowSize: `${window.innerWidth} x ${window.innerHeight}`,
          deviceType: detectDeviceType(navigator.userAgent),
          
          // System capabilities (fast)
          cookiesEnabled: navigator.cookieEnabled,
          javaEnabled: navigator.javaEnabled?.() || false,
          onlineStatus: navigator.onLine,
          hardwareConcurrency: navigator.hardwareConcurrency,
          memory: (navigator as any).deviceMemory,
          
          // Connection info (fast when available)
          connectionType: getConnectionType(),
          
          // Browser features (very fast)
          webglSupport: !!window.WebGLRenderingContext,
          localStorage: !!window.localStorage,
          sessionStorage: !!window.sessionStorage,
          indexedDB: !!window.indexedDB,
          
          // Page context (instant)
          url: window.location.href,
          protocol: window.location.protocol,
          referrer: document.referrer || 'Direct',
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          
          // Performance tracking
          captureTime: Date.now() - startTime
        };

        // PARALLEL API CALLS for maximum speed
        const promises = [];
        
        // 1. Send main visitor data (highest priority)
        promises.push(
          fetch('/api/visitor-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'MAIN_DATA', ...clientData }),
            keepalive: true
          }).then(r => r.json()).catch(e => ({ error: 'main_failed' }))
        );
        
        // 2. Multiple geolocation services in parallel (fastest wins)
        promises.push(
          // Service 1: ipapi.co (usually fastest)
          fetch('https://ipapi.co/json/', { 
            signal: AbortSignal.timeout(2000) // 2s timeout
          }).then(r => r.json()).catch(() => null)
        );
        
        promises.push(
          // Service 2: ipify as backup
          fetch('https://api.ipify.org?format=json', {
            signal: AbortSignal.timeout(2000) // 2s timeout
          }).then(r => r.json()).catch(() => null)
        );
        
        promises.push(
          // Service 3: ip-api.com as another backup
          fetch('http://ip-api.com/json/?fields=status,country,countryCode,region,city,lat,lon,timezone,isp,org,as,query', {
            signal: AbortSignal.timeout(2000) // 2s timeout
          }).then(r => r.json()).catch(() => null)
        );

        // Wait for all parallel requests to complete
        const results = await Promise.allSettled(promises);
        
        // Process geolocation results (use first successful one)
        const [mainResponse, ipapi, ipify, ipApiCom] = results;
        
        // Find the first successful geolocation response
        let geoData = null;
        for (const result of [ipapi, ipify, ipApiCom]) {
          if (result.status === 'fulfilled' && result.value && !result.value.error) {
            geoData = result.value;
            break;
          }
        }
        
        // Send geolocation data if available
        if (geoData) {
          fetch('/api/visitor-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'GEOLOCATION_DATA',
              source: geoData.ip ? 'ipapi.co' : geoData.query ? 'ip-api.com' : 'ipify',
              ...geoData,
              timestamp: new Date().toISOString(),
            }),
            keepalive: true
          }).catch(() => {}); // Fire and forget
        }

        const totalTime = Date.now() - startTime;
        console.log(`🎯 COMPREHENSIVE CAPTURE COMPLETED in ${totalTime}ms`);
        
        // Send performance metrics
        fetch('/api/visitor-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'PERFORMANCE_METRICS',
            totalCaptureTime: totalTime,
            mainDataResult: mainResponse.status,
            geoDataAvailable: !!geoData,
            timestamp: new Date().toISOString(),
          }),
          keepalive: true
        }).catch(() => {});

      } catch (error) {
        console.error('❌ Error in comprehensive capture:', error);
        // Send error report
        fetch('/api/visitor-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'CAPTURE_ERROR',
            error: error.message,
            timestamp: new Date().toISOString(),
          }),
          keepalive: true
        }).catch(() => {});
      }
    };

    // Start comprehensive capture asynchronously (don't block instant capture)
    captureComprehensiveData();
  }, []);

  // Optimized detection functions (faster execution)
  const detectBrowser = (ua: string): string => {
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
  };

  const detectOS = (ua: string): string => {
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  };

  const detectDeviceType = (ua: string): string => {
    if (/tablet|ipad/i.test(ua)) return 'Tablet';
    if (/mobile|android|iphone/i.test(ua)) return 'Mobile';
    return 'Desktop';
  };

  const getConnectionType = (): string => {
    try {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      margin: 0,
      padding: 0
    }}>
      {/* Empty - plain white page */}
    </div>
  );
}