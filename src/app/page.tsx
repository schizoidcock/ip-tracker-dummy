'use client';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Log visit immediately when page loads
    const logVisit = async () => {
      try {
        // Collect comprehensive client-side data
        const clientData = {
          // Browser Information
          userAgent: navigator.userAgent,
          browser: detectBrowser(navigator.userAgent),
          os: detectOS(navigator.userAgent),
          deviceType: detectDeviceType(navigator.userAgent),
          platform: navigator.platform,
          language: navigator.language,
          languages: navigator.languages,
          cookiesEnabled: navigator.cookieEnabled,
          javaEnabled: navigator.javaEnabled?.() || false,
          
          // Screen & Display
          screenResolution: `${screen.width} x ${screen.height}`,
          screenColorDepth: screen.colorDepth,
          screenPixelDepth: screen.pixelDepth,
          windowSize: `${window.innerWidth} x ${window.innerHeight}`,
          
          // Connection & Performance
          connectionType: getConnectionType(),
          onlineStatus: navigator.onLine,
          hardwareConcurrency: navigator.hardwareConcurrency,
          memory: (navigator as any).deviceMemory,
          
          // Page & Session
          referrer: document.referrer || 'Direct',
          url: window.location.href,
          protocol: window.location.protocol,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          
          // Additional Browser Features
          webglSupport: !!window.WebGLRenderingContext,
          localStorage: !!window.localStorage,
          sessionStorage: !!window.sessionStorage,
          indexedDB: !!window.indexedDB,
        };

        // Send to server for logging
        await fetch('/api/visitor-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
        });

        // Also get external IP info and log it
        try {
          const ipResponse = await fetch('https://ipapi.co/json/');
          const ipData = await ipResponse.json();
          
          await fetch('/api/visitor-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'IP_GEOLOCATION',
              ...ipData,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (error) {
          console.log('External IP API unavailable');
        }

      } catch (error) {
        console.error('Error logging visit:', error);
      }
    };

    logVisit();
  }, []);

  // Browser detection functions
  const detectBrowser = (userAgent: string): string => {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    return 'Unknown';
  };

  const detectOS = (userAgent: string): string => {
    if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS X')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  };

  const detectDeviceType = (userAgent: string): string => {
    if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'Mobile';
    return 'Desktop';
  };

  const getConnectionType = (): string => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'Unknown';
    }
    return 'Unknown';
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