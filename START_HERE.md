# 🚀 START HERE - Kinetic Auth Setup

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Backend Dependencies

```bash
cd backend
.\setup.bat
```

**OR manually**:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

⏱️ **This will take 5-10 minutes** (downloading TensorFlow, PyTorch, etc.)

### Step 2: Start Backend Server

```bash
cd backend
.\start.bat
```

**OR manually**:
```bash
cd backend
venv\Scripts\activate
python main.py
```

✅ Server should start on: **http://localhost:8000**

### Step 3: Install Frontend Dependencies

```bash
npm install
```

**OR**:
```bash
bun install
```

### Step 4: Start Frontend

```bash
npm run dev
```

**OR**:
```bash
bun dev
```

✅ Frontend should open on: **http://localhost:5173**

---

## 🧪 Test the Fix

### Face Authentication Test

1. Open **http://localhost:5173** in browser
2. Navigate to **Enroll** page
3. Click **"Enroll Face"** button
4. ✅ **Camera preview should appear immediately**
5. Position your face in frame
6. Click **"Capture"**
7. Click **"Verify Face"**
8. ✅ **Success message should appear**

### Voice Authentication Test

1. Click **"Enroll Voice"** button
2. ✅ **Microphone permission requested**
3. Click **"Start Recording"**
4. Say: **"This is my voice for authentication"**
5. Click **"Stop Recording"**
6. ✅ **Audio playback should work**
7. Click **"Verify Voice"**
8. ✅ **Success message should appear**

---

## 📋 Verification Checklist

Run this after installation:

```bash
cd backend
venv\Scripts\activate
python test_setup.py
```

This will verify:
- ✅ All dependencies installed
- ✅ FaceNet model loads
- ✅ Services initialize correctly
- ✅ Supabase connection works

---

## 🐛 Common Issues

### Issue: "Python not found"
**Solution**: Install Python 3.8+ from [python.org](https://www.python.org/downloads/)

### Issue: "FAISS import failed"
**Solution**: 
```bash
pip uninstall faiss-cpu
pip install faiss-cpu --no-cache-dir
```

### Issue: "Camera not working"
**Solutions**:
- Check browser permissions (chrome://settings/content/camera)
- Use Chrome or Edge (better WebRTC support)
- Ensure using HTTPS or localhost

### Issue: "Backend crashes on startup"
**Solution**:
```bash
cd backend
python test_setup.py
```
Check which dependency is missing

### Issue: "Port 8000 already in use"
**Solution**: 
- Kill process using port 8000
- Or change port in `backend/main.py` line 188

---

## 📁 Project Structure

```
kinetic-auth-main/
├── backend/
│   ├── services/
│   │   ├── face_service.py      # ✅ Fixed - FaceNet
│   │   ├── voice_service.py     # ✅ Fixed - MFCC
│   │   └── gesture_service.py
│   ├── data/                     # Created automatically
│   │   ├── face/                # FAISS indices
│   │   └── voice/               # FAISS indices
│   ├── main.py                   # ✅ Fixed - Real services
│   ├── supabase_client.py        # ✅ New - Logging
│   ├── requirements.txt          # ✅ Updated
│   ├── setup.bat                 # ✅ New - Easy install
│   ├── start.bat                 # Startup script
│   └── test_setup.py             # ✅ New - Verification
├── src/
│   ├── components/auth/
│   │   ├── FaceAuth.tsx         # ✅ Already working
│   │   └── VoiceAuth.tsx        # ✅ Already working
│   └── hooks/
│       └── usePythonAPI.ts       # ✅ Fixed - Port 8000
├── .env                          # API URLs
├── FIX_SUMMARY.md               # ✅ New - What changed
└── FACE_VOICE_FIX_GUIDE.md      # ✅ New - Full guide
```

---

## 🔧 Configuration

### Backend Port

**File**: `backend/main.py` (line 188)
```python
uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### Frontend API URL

**File**: `.env`
```
VITE_PYTHON_API_URL=http://localhost:8000
```

### Face Recognition Threshold

**File**: `backend/services/face_service.py` (line 19)
```python
self.threshold = 0.75  # Higher = stricter (0.6-0.9)
```

### Voice Recognition Threshold

**File**: `backend/services/voice_service.py` (line 18)
```python
self.threshold = 0.70  # Higher = stricter (0.6-0.8)
```

---

## 📚 Documentation

- **FIX_SUMMARY.md** - What was fixed and how
- **FACE_VOICE_FIX_GUIDE.md** - Detailed technical guide
- **ARCHITECTURE.txt** - System architecture
- **QUICK_START.txt** - Original quick start
- **TESTING_CHECKLIST.txt** - Test scenarios

---

## 🎯 What's Working Now

### ✅ Face Authentication
- Real-time camera preview
- FaceNet 512-D embeddings
- FAISS similarity search
- Cosine similarity matching
- Persistent storage
- Supabase logging

### ✅ Voice Authentication
- Microphone capture
- MFCC 80-D features
- FAISS similarity search
- Audio playback preview
- Persistent storage
- Supabase logging

### ✅ Backend Integration
- FastAPI endpoints
- Real ML models
- Error handling
- Service initialization
- Logging

### ✅ Frontend Integration
- Camera/mic permissions
- Live preview
- API calls
- Error handling
- User feedback

---

## 🆘 Need Help?

1. **Check logs**: Backend terminal shows detailed logs
2. **Run test**: `python backend/test_setup.py`
3. **Verify services**: Check http://localhost:8000 for health status
4. **Browser console**: Check for frontend errors
5. **Read guides**: FIX_SUMMARY.md and FACE_VOICE_FIX_GUIDE.md

---

## ✅ Success Indicators

When everything is working, you should see:

**Backend Terminal**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Face service initialized
INFO:     Voice service initialized
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Frontend Browser**:
- Camera preview appears instantly
- Voice recording UI responsive
- No console errors
- Successful enrollment/verification

**Supabase Dashboard**:
- Logs table populated with events
- Timestamps accurate
- Confidence scores recorded

---

**Ready to start? Run `.\backend\setup.bat` now!** 🚀
