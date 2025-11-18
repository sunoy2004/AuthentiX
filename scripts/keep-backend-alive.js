import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Function to check if backend is running
async function isBackendRunning() {
  try {
    // Check if port 8000 is in use (backend)
    const { stdout } = await execAsync('netstat -an | grep :8000');
    return stdout.length > 0;
  } catch (error) {
    return false;
  }
}

// Function to start backend
async function startBackend() {
  try {
    console.log('Starting backend server...');
    // Start backend in background
    exec('cd backend && python main.py &');
    console.log('Backend server started');
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}

// Function to keep backend alive
async function keepAlive() {
  const running = await isBackendRunning();
  
  if (!running) {
    console.log('Backend is not running. Starting it now...');
    await startBackend();
  } else {
    console.log('Backend is running normally');
  }
  
  // Check every 5 minutes
  setTimeout(keepAlive, 5 * 60 * 1000);
}

// Start the keep alive process
keepAlive().catch(console.error);