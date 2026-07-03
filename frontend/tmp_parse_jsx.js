const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const file = path.join(__dirname, 'src/pages/CoordinatorReportCards.jsx');
const code = fs.readFileSync(file, 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Parsed successfully');
} catch (err) {
  console.log('Parse error:', err.message);
  if (err.loc) {
    console.log('Line', err.loc.line, 'Column', err.loc.column);
    const lines = code.split(/\r?\n/);
    const start = Math.max(1, err.loc.line - 10);
    const end = Math.min(lines.length, err.loc.line + 10);
    for (let i = start; i <= end; i++) {
      console.log(`${i}: ${lines[i-1]}`);
    }
  }
}
