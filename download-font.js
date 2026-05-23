const https = require('https');
const fs = require('fs');

https.get('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf', (res) => {
  if (res.statusCode !== 200 && res.statusCode !== 302 && res.statusCode !== 301) {
    console.error('Failed', res.statusCode);
    return;
  }
  
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (res2) => {
      handleResponse(res2);
    });
  } else {
    handleResponse(res);
  }
});

function handleResponse(res) {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const b64 = Buffer.concat(chunks).toString('base64');
    fs.writeFileSync('electron/handlers/Roboto-Regular.js', 'export const RobotoRegularBase64 = "' + b64 + '";\n');
    console.log('Done');
  });
}
