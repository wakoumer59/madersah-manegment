const fs = require('fs');
const c = fs.readFileSync('firebase/database.rules.json', 'utf8');
try {
  JSON.parse(c);
  console.log('VALID JSON');
} catch (e) {
  console.log('INVALID JSON:', e.message);
}
console.log('Has default deny:', c.includes('.read": false'));
console.log('Has users:', c.includes('"users"'));
console.log('Has tests:', c.includes('"tests"'));
console.log('Has materials:', c.includes('"materials"'));
console.log('Has attendance:', c.includes('"attendance"'));
console.log('Has _questions:', c.includes('"_questions"'));
console.log('Has _results:', c.includes('"_results"'));