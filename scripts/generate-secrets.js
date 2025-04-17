#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a secure random string for JWT secret
function generateJwtSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// Create or update .env.production file with new JWT secret
function updateEnvFile() {
  const envPath = path.join(process.cwd(), '.env.production');
  const newSecret = generateJwtSecret();
  
  try {
    let envContent = '';
    
    // Read existing file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace JWT_SECRET if it exists
      if (envContent.includes('JWT_SECRET=')) {
        envContent = envContent.replace(
          /JWT_SECRET=["']?[^"'\n]*["']?/,
          `JWT_SECRET="${newSecret}"`
        );
      } else {
        // Add JWT_SECRET if it doesn't exist
        envContent += `\nJWT_SECRET="${newSecret}"\n`;
      }
    } else {
      // Create new file with JWT_SECRET
      envContent = `# Environment Configuration\nJWT_SECRET="${newSecret}"\n`;
    }
    
    // Write updated content back to file
    fs.writeFileSync(envPath, envContent);
    console.log('✅ JWT secret generated and saved to .env.production');
    console.log(`Generated JWT_SECRET: ${newSecret}`);
  } catch (error) {
    console.error('Error updating .env.production file:', error);
    process.exit(1);
  }
}

// Execute the function
updateEnvFile(); 