# ✨ **AuthentiX** — Next-Generation Multi-Modal Biometric Authentication

### **Face ID • Voice Recognition • Gesture Verification • IoT Sensor Integration • FAISS-Powered**

AuthentiX is a cutting-edge multi-factor biometric authentication platform that combines **face recognition**, **voice authentication**, **gesture pattern analysis**, and **IoT sensor data** into a single seamless user experience.
Built for modern security applications, AuthentiX uses **FAISS-based similarity search**, **deep learning embeddings**, and **real-time BLE sensor streaming** to deliver truly **next-gen authentication**.

<div align="center">
  <img src="https://img.shields.io/badge/AI-Powered-blueviolet?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/FAISS-Integrated-0099ff?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Voice%20Recognition-ECAPA--TDNN-orange?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Face%20Recognition-ArcFace-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/IoT-BLE%20Sensors-yellow?style=for-the-badge"/>
</div>

---

# 🚀 **Features**

### 🔹 **1. Multi-Modal Authentication**

AuthentiX supports four parallel authentication modes:

* **Face Recognition** (ArcFace / FaceNet embeddings)
* **Voice Authentication** (ECAPA-TDNN/x-vector)
* **Gesture Pattern Recognition** (LSTM on IMU sensor data)
* **PIN-based fallback**

All biometric data is converted into embeddings and matched using **FAISS similarity search**.

---

### 🔹 **2. Real-Time Face Preview + Recognition**

* Live camera streaming
* On-device frame preprocessing
* Backend embedding extraction
* FAISS-based identity matching
* Support for multiple face enrollments per user

---

### 🔹 **3. Voice Enrollment + Verification**

* Microphone streaming
* Audio normalization + MFCC extraction
* Deep neural network embedding generation
* FAISS similarity lookup

Perfect for hands-free authentication.

---

### 🔹 **4. Gesture Authentication (IMU → LSTM)**

AuthentiX uses IMU data (accelerometer + gyroscope) to learn user-specific gesture signatures with:

* LSTM-based embedding model
* Real-time gesture data capture
* Backend similarity scoring

---

### 🔹 **5. Arduino BLE IoT Sensor Integration**

The dashboard displays real-time sensor data via Bluetooth:

Supported modules:

* 🌡 **DHT22 — Temperature/Humidity**
* 🌫 **MQ135 — Air Quality**
* 💡 **BH1750 — Light Intensity**
* ⚙️ **MPU6050 — IMU**

All streamed via BLE and logged to Supabase.

---

### 🔹 **6. Secure Backend Architecture**

* Python FastAPI backend
* FAISS for scalable similarity search
* ONNX/Torch models for embedding extraction
* Supabase for user data, biometric data & authentication logs

---

### 🔹 **7. Beautiful Modern Frontend**

* ⚛ React + TypeScript
* 🎨 Tailwind CSS + custom components
* 🔐 Authentication dashboards
* 📊 Sensor visualization panels

---

# 🏛 **Project Structure**

```
AuthentiX/
├── backend/
│   ├── services/
│   │   ├── face_service.py
│   │   ├── voice_service.py
│   │   ├── gesture_service.py
│   ├── main.py
│   ├── requirements.txt
│
├── src/
│   ├── lib/
│   │   ├── biometricUtils.ts
│   ├── components/
│   ├── hooks/
│   ├── pages/
│
├── arduino/
│   ├── AuthentiX_BLE.ino
│
├── public/
└── README.md
```

---

# 🧠 **Tech Stack**

### **Frontend**

* React + TypeScript
* Tailwind CSS
* WebRTC Camera Streaming
* WebBluetooth API

### **Backend**

* Python FastAPI
* FAISS (IndexFlatL2)
* ONNX Runtime / PyTorch
* Librosa (audio preprocessing)

### **Machine Learning**

* ArcFace / FaceNet (Face Embeddings)
* ECAPA-TDNN / X-Vector (Voice Embeddings)
* LSTM (Gesture Embeddings)

### **Database**

* Supabase

  * embeddings tables
  * authentication logs
  * user metadata

### **IoT**

* Arduino BLE
* MPU6050, DHT22, MQ135, BH1750

---

# 🧩 **How AuthentiX Works**

### **1️⃣ User Enrollment**

User records:

* Face frames
* Voice samples
* Gesture IMU sequences
* (optional) PIN

Each sample → converted to ML embeddings → stored in **Supabase** → indexed via **FAISS**.

---

### **2️⃣ Authentication Flow**

During login:

1. User selects methods
2. System captures biometric data
3. Embeddings generated
4. FAISS finds nearest match
5. Confidence score calculated
6. Supabase logs authentication event
7. Dashboard shows verification result

---

# 🛠 **Setup Instructions**

### **Backend**

```
cd backend
pip install -r requirements.txt
python main.py
```

### **Frontend**

```
cd frontend
npm install
npm run dev
```

### **Arduino**

Upload `AuthentiX_BLE.ino` using Arduino IDE.
Ensure BLE is enabled & sensors are wired correctly.

---

# 📡 **Environment Variables**

Create a `.env` file:

```
SUPABASE_URL=
SUPABASE_KEY=
MODEL_PATH_FACE=
MODEL_PATH_VOICE=
MODEL_PATH_GESTURE=
```

---

# 📊 Supabase Schema Overview

### Biometric Tables:

* `face_embeddings`
* `voice_embeddings`
* `gesture_embeddings`

### Logging Table:

* `auth_logs`

### Sensor Logging:

* `environment_logs`

---

# 📸 **Screenshots**

### ⭐ Landing Page

<img width="1895" height="904" alt="image" src="https://github.com/user-attachments/assets/53932840-bb2c-4f44-b2cf-0abc4500a160" />


### 🔐 Authentication Dashboard

<img width="1913" height="903" alt="image" src="https://github.com/user-attachments/assets/6dc4cf8b-4fc6-45b2-8c0b-40db89ab0f0a" />


---

# 🚀 **Future Extensions**

* WebAuthn integration
* Gait recognition
* Thermal camera liveness detection
* TinyML on-device authentication (ESP32)

---

# 🤝 **Contributing**

Contributions are always welcome!
Feel free to:

* open issues
* create PRs
* suggest new biometric modules

---

# ⭐ **Show Your Support**

If you like this project, consider giving it a **star ⭐** on GitHub — it helps more people discover AuthentiX!
