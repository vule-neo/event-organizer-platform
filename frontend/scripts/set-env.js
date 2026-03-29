const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/environments/environment.prod.ts');

const envConfigFile = `export const environment = {
  production: true,
  googleMapsApiKey: '${process.env.GOOGLE_MAPS_API_KEY || ''}',
  apiUrl: '${process.env.API_URL || ''}',
  apiBase: '${process.env.API_BASE || ''}'
};
`;

console.log('Generating environment.prod.ts...');
fs.writeFileSync(targetPath, envConfigFile);
console.log(`Output generated at ${targetPath}`);
