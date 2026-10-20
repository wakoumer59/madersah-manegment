const fs = require('node:fs');
let c = fs.readFileSync('src/pages/admin/AttendancePage.tsx', 'utf8');
c = c.replaceAll('\\\\${', '${');
fs.writeFileSync('src/pages/admin/AttendancePage.tsx', c);
console.log('done');