const { execSync } = require('child_process');
const fs = require('fs');

// Build the web app first
console.log('Building web app...');
execSync('npm run build', { stdio: 'inherit' });

// Check if capacitor is installed
try {
  execSync('npx cap --version', { stdio: 'ignore' });
} catch (error) {
  console.log('Installing Capacitor CLI...');
  execSync('npm install @capacitor/cli --save-dev', { stdio: 'inherit' });
}

// Initialize Capacitor if not already done
if (!fs.existsSync('android')) {
  console.log('Initializing Capacitor for Android...');
  execSync('npx cap init', { stdio: 'inherit' });
}

// Add Android platform
console.log('Adding Android platform...');
execSync('npx cap add android', { stdio: 'inherit' });

// Copy web assets to native platforms
console.log('Copying web assets to native platforms...');
execSync('npx cap copy', { stdio: 'inherit' });

// Sync project
console.log('Syncing project...');
execSync('npx cap sync', { stdio: 'inherit' });

console.log('Mobile app build complete!');
console.log('To open Android Studio, run: npx cap open android');