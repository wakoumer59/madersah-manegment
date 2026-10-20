const fs = require('fs');

// Fix AttendancePage.tsx - fix template literal interpolation
let c = fs.readFileSync('src/pages/admin/AttendancePage.tsx', 'utf8');
c = c.replace(/\\\\\$\{/g, '${');
fs.writeFileSync('src/pages/admin/AttendancePage.tsx', c);

// Fix attendanceService.ts - remove unused imports
let s = fs.readFileSync('src/services/attendanceService.ts', 'utf8');
s = s.replace(/  child,\n/g, '');
s = s.replace(/  runTransaction,\n/g, '');
s = s.replace(/  startAfter,\n/g, '');
fs.writeFileSync('src/services/attendanceService.ts', s);

console.log('done');