import fetch from 'node-fetch';

async function testBackend() {
  try {
    console.log('Testing backend health...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:8000/');
    const healthData = await healthResponse.json();
    
    console.log('Health Check:', healthData);
    
    if (healthData.status === 'healthy') {
      console.log('✅ Backend is healthy');
    } else {
      console.log('❌ Backend health check failed');
    }
    
    // Test CORS
    const corsResponse = await fetch('http://localhost:8000/', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    console.log('CORS Status:', corsResponse.status);
    
    if (corsResponse.status === 200) {
      console.log('✅ CORS is properly configured');
    } else {
      console.log('❌ CORS configuration issue');
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.log('Please ensure the backend is running on port 8000');
  }
}

testBackend();