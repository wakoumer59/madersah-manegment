const fs = require('fs');
const c = fs.readFileSync('firebase/database.rules.json', 'utf8');

// Check parenthesis balance in each line
const lines = c.split('\n');
lines.forEach((line, i) => {
  const open = (line.match(/\(/g) || []).length;
  const close = (line.match(/\)/g) || []).length;
  if (open !== close) {
    console.log(`Line ${i + 1}: open=${open} close=${close} diff=${open - close}`);
    console.log(`  Length: ${line.length}`);
    // Show context around the issue
    if (Math.abs(open - close) > 0) {
      console.log(`  Content: ${line.substring(0, 100)}...`);
    }
  }
});
console.log('Done checking');