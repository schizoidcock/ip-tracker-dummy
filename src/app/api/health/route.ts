import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'IP Tracker Web App',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
}