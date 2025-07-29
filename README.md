# 🌐 IP Tracker Web App

A professional Next.js web application that tracks and displays comprehensive visitor information including IP details, browser information, and device specifications. Optimized for Railway deployment.

## 🚀 Railway Deployment

### Quick Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fyour-username%2Fip-tracker-dummy)

### Manual Deployment
1. **Connect to Railway**:
   ```bash
   railway login
   railway link
   ```

2. **Deploy**:
   ```bash
   railway up
   ```

3. **Set Environment Variables** (optional):
   ```bash
   railway variables set NODE_ENV=production
   ```

## 🔧 Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000` to see the application.

## 📋 Features

### 🎯 Real-Time Tracking
- **IP Geolocation**: City, region, country, ISP, timezone
- **Browser Detection**: Name, version, user agent
- **Device Information**: Type, platform, screen resolution
- **Server Analytics**: Request headers, connection details
- **Live Statistics**: Page views, connection status

### 🖥️ Professional UI
- **Modern Design**: Gradient backgrounds, card layouts
- **Responsive**: Works on desktop, tablet, mobile
- **Real-Time Updates**: Refresh functionality
- **Statistics Dashboard**: Key metrics at a glance
- **Loading States**: Professional loading indicators

### 🔗 API Endpoints

#### `GET /api/visitor-info`
Returns comprehensive visitor information:
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:45.123Z",
    "ip": "203.0.113.1",
    "userAgent": "Mozilla/5.0...",
    "referer": "https://google.com",
    "host": "your-app.railway.app",
    "cfCountry": "US",
    "protocol": "https"
  }
}
```

#### `POST /api/visitor-info`
Logs detailed visitor data:
```json
{
  "success": true,
  "message": "Visit logged successfully",
  "serverDetectedIP": "203.0.113.1",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

#### `GET /api/health`
Health check endpoint:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "service": "IP Tracker Web App",
  "version": "1.0.0",
  "environment": "production"
}
```

## 🏗️ Architecture

### Frontend (Next.js 14)
- **App Router**: Modern Next.js architecture
- **TypeScript**: Type-safe development
- **Client Components**: Interactive UI elements
- **Server Components**: Optimized performance

### Backend (API Routes)
- **Next.js API**: Built-in serverless functions
- **TypeScript**: Type-safe API development
- **Request Logging**: Console output for Railway logs
- **Error Handling**: Comprehensive error management

### Deployment (Railway)
- **Nixpacks**: Automatic build detection
- **Environment Variables**: Configurable settings
- **Auto HTTPS**: Secure connections
- **Custom Domains**: Professional URLs

## 📊 Data Collected

### Client-Side Detection
- Browser name and version
- Operating system
- Device type (desktop/mobile/tablet)
- Screen resolution
- Language preferences
- Platform information
- Cookies and JavaScript status
- Connection type
- Online/offline status

### Server-Side Detection
- Real IP address (handles proxies)
- User agent string
- HTTP headers
- Referer information
- Request timestamp
- Host information
- Cloudflare data (if applicable)

### External API Integration
- **ipapi.co**: IP geolocation data
- City, region, country
- ISP and organization
- Timezone information
- IP version (IPv4/IPv6)

## 🔒 Privacy & Security

### Data Handling
- **No Database**: Data is only logged to console
- **No Storage**: Information is not persisted
- **Server Logs**: Available in Railway dashboard
- **Real-Time Only**: Data refreshes on each visit

### Security Features
- **HTTPS**: Encrypted connections
- **CORS Headers**: Cross-origin request control
- **Input Validation**: Safe data processing
- **Error Handling**: Secure error responses

## 🛠️ Customization

### Environment Variables
```bash
NODE_ENV=production          # Environment mode
CUSTOM_KEY=your-value       # Custom configuration
```

### Styling
- Modify `src/app/globals.css` for custom styles
- Update colors, fonts, and layouts
- Responsive breakpoints included

### API Extensions
- Add new endpoints in `src/app/api/`
- Extend visitor data collection
- Integrate additional services

## 📈 Monitoring

### Railway Dashboard
- **Application Logs**: Real-time visitor tracking
- **Metrics**: CPU, memory, network usage
- **Deployments**: Build and deployment history
- **Custom Domains**: Professional URLs

### Console Output
All visitor interactions are logged:
```
🌐 VISITOR INFO REQUEST: {
  "timestamp": "2024-01-15T10:30:45.123Z",
  "ip": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "referer": "https://google.com"
}
```

## 🔧 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Deployment**: Railway
- **External APIs**: ipapi.co for geolocation
- **Build Tool**: Nixpacks (automatic)

## 📝 License

MIT License - Feel free to use for educational and testing purposes.

---

**⚠️ Disclaimer**: This tool is designed for educational and testing purposes. Always comply with privacy laws and obtain proper consent when tracking visitor information in production environments.

🚀 **Ready to deploy!** Just push to Railway and start tracking visitors with this professional IP tracker web app!