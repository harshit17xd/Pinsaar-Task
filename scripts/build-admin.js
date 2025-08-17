const { execSync } = require('child_process');
const path = require('path');

console.log('Building React admin interface...');

try {
  // Change to admin directory
  process.chdir(path.join(__dirname, '../admin'));
  
  // Install dependencies if node_modules doesn't exist
  if (!require('fs').existsSync('node_modules')) {
    console.log('Installing admin dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
  
  // Build the admin interface
  console.log('Building admin...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Admin build completed successfully!');
} catch (error) {
  console.error('Admin build failed:', error.message);
  process.exit(1);
}
