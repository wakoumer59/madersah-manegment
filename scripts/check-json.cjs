const fs = require('fs');
try {
  const c = fs.readFileSync('firebase/database.rules.json', 'utf8');
  JSON.parse(c);
  console.log('VALID JSON');
} catch (e) {
  console.log('INVALID JSON:', e.message);
}