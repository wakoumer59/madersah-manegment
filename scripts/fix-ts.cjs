const fs = require('node:fs');
const c = fs.readFileSync('src/pages/admin/AttendancePage.tsx', 'utf8');
let fixed = c.replace(/\\\\\$\{/g, '${');
fs.writeFileSync('src/pages/admin/AttendancePage.tsx', fixed);
console.log('AttendancePage fixed');
const s = fs.readFileSync('src/services/attendanceService.ts', 'utf8');
let fixedS = s.replace(/  child,\n/g, '').replace(/  runTransaction,\n/g, '').replace(/  startAfter,\n/g, '');
fs.writeFileSync('src/services/attendanceService.ts', fixedS);
console.log('attendanceService fixed');