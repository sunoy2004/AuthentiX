# AuthentiX Deployment Guide

## Mobile APK Deployment

### GitHub Release Process
1. The mobile APK is automatically built and released via GitHub Actions
2. APK is available at: `https://github.com/your-username/kinetic-auth-main/releases/latest/download/authentix-mobile.apk`
3. Users can directly download and install the APK on Android devices

### Manual APK Build (if needed)
```bash
# Install dependencies
npm install

# Build mobile app
npm run build:mobile

# Open Android Studio
npx cap open android

# In Android Studio:
# 1. Build > Generate Signed Bundle / APK
# 2. Select APK
# 3. Create or use existing keystore
# 4. Build APK
```

## Backend Always-On Deployment

### Docker Deployment (Recommended)
```bash
# Create .env file with your credentials
cp .env.example .env
# Edit .env with your Supabase credentials

# Start all services
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost
# Backend API: http://localhost:8000
```

### Health Checks
- Backend health check: `http://localhost:8000/`
- Auto-restart on failure with Docker restart policies
- Watchtower for automatic updates

### Environment Variables
Create a `.env` file in the root directory:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
MODEL_PATH_FACE=./models/face_model.onnx
MODEL_PATH_VOICE=./models/voice_model.onnx
MODEL_PATH_GESTURE=./models/gesture_model.pth
```

## Web Application Deployment

### Vercel Deployment
1. Push to GitHub
2. Connect Vercel to your repository
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Manual Web Build
```bash
# Build for production
npm run build

# Serve with any static server
npx serve dist
```

## Supabase Configuration

### Required Tables
The application expects the following tables in your Supabase database:
- `profiles` - User profile information
- `authentication_methods` - Tracking enrolled auth methods
- `authentication_logs` - Authentication events
- `pins` - Encrypted PIN storage

### Real-time Subscriptions
Enable real-time for tables:
```sql
-- Enable for all tables
alter table profiles replica identity full;
alter table authentication_methods replica identity full;
alter table authentication_logs replica identity full;
alter table pins replica identity full;
```

## BLE Integration

### Arduino Nano 33 BLE Sense Rev2
The mobile app connects to Arduino devices with:
- Service UUID: `19B10000-E8F2-537E-4F6C-D104768A1214`
- Characteristics:
  - Temperature: `19B10001-E8F2-537E-4F6C-D104768A1214`
  - Humidity: `19B10002-E8F2-537E-4F6C-D104768A1214`
  - Air Quality: `19B10003-E8F2-537E-4F6C-D104768A1214`
  - Light: `19B10004-E8F2-537E-4F6C-D104768A1214`
  - IMU: `19B10005-E8F2-537E-4F6C-D104768A1214`

## Security Considerations

### API Keys
- Never commit `.env` files to version control
- Use environment variables in production
- Rotate keys regularly

### Data Encryption
- PINs are stored as hashed values
- All communication over HTTPS
- Supabase RLS (Row Level Security) enabled

## Monitoring and Maintenance

### Logs
```bash
# View Docker logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

### Updates
- Watchtower automatically updates containers
- GitHub Actions rebuild APK on code changes
- Manual updates with `docker-compose pull && docker-compose up -d`

## Troubleshooting

### Common Issues
1. **Backend not starting**: Check environment variables and model paths
2. **BLE connection fails**: Ensure device is discoverable and nearby
3. **Authentication issues**: Verify Supabase credentials and database schema
4. **Mobile app crashes**: Check Android logs with `adb logcat`

### Support
For issues, check:
1. Docker logs: `docker-compose logs`
2. Browser console for frontend errors
3. Backend logs in terminal output
4. GitHub Actions build logs