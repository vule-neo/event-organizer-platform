const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/environments/environment.prod.ts');

const envConfigFile = `export const environment = {
  production: true,
  googleMapsApiKey: '${process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY_DEV || ''}',
  apiUrl: '${process.env.API_URL || process.env.API_URL_DEV || ''}',
  apiBase: '${process.env.API_BASE || process.env.API_BASE_DEV || ''}'
};
`;

console.log('Generating environment.prod.ts...');
fs.writeFileSync(targetPath, envConfigFile);
console.log(`Output generated at ${targetPath}`);
