# AuthentiX Deployment Guide

## Prerequisites
- Node.js 16+
- npm or yarn
- Android Studio (for mobile app)
- Vercel account (for web deployment)

## Web Deployment

### Vercel Deployment
1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com) and create a new project
3. Connect your GitHub repository
4. Vercel will automatically detect the build settings
5. Add the following environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

### Manual Deployment
1. Build the project:
   ```bash
   npm run build
   ```
2. The built files will be in the `dist` folder
3. Deploy these files to any static hosting service (Netlify, Render, etc.)

## Mobile App Deployment

### Android APK Generation
1. Build the mobile app:
   ```bash
   npm run build:mobile
   ```
2. Open Android Studio:
   ```bash
   npx cap open android
   ```
3. In Android Studio:
   - Go to Build > Generate Signed Bundle / APK
   - Select APK and follow the wizard
   - Use your keystore or create a new one
   - Build the APK

### Development Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```

## Environment Variables
The application uses the following environment variables:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

These are already configured in the codebase but can be overridden by creating a `.env` file.

## Supabase Configuration
The application is pre-configured to work with your existing Supabase backend:
- Project URL: https://oygijeabsjjbiwxoujuu.supabase.co
- The database schema is automatically handled by the application

## BLE Integration
The application connects to Arduino Nano 33 BLE Sense Rev2 devices using the following service and characteristics:
- Service UUID: 19B10000-E8F2-537E-4F6C-D104768A1214
- Temperature: 19B10001-E8F2-537E-4F6C-D104768A1214
- Humidity: 19B10002-E8F2-537E-4F6C-D104768A1214
- Air Quality: 19B10003-E8F2-537E-4F6C-D104768A1214
- Light: 19B10004-E8F2-537E-4F6C-D104768A1214
- IMU: 19B10005-E8F2-537E-4F6C-D104768A1214

## Features
- Cross-platform support (Web + Android)
- Real-time health monitoring dashboard
- Fall detection alerts
- Historical data visualization
- Caregiver alert system
- Secure authentication with Supabase
- Dark/light theme support

## Troubleshooting
1. If BLE connection fails:
   - Ensure your device is powered on
   - Check that Bluetooth is enabled on your device
   - Make sure the Arduino is running the correct firmware

2. If data is not displaying:
   - Check your Supabase credentials
   - Verify network connectivity
   - Check browser console for errors

3. Mobile app issues:
   - Ensure all Capacitor dependencies are installed
   - Check Android Studio for build errors