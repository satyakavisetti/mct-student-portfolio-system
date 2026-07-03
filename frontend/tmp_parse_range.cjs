const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const file = path.join(__dirname, 'src/pages/CoordinatorReportCards.jsx');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
const start = 560;
const end = 839;
const snippet = lines.slice(start - 1, end).join('\n');
const wrapper = `const X = () => (\n${snippet}\n);`;
try {
  parser.parse(wrapper, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Range parsed successfully');
} catch (err) {
  console.log('Range parse error:', err.message);
  if (err.loc) {
    console.log('Line', err.loc.line, 'Column', err.loc.column);
    const wrapLines = wrapper.split(/\r?\n/);
    const startLine = Math.max(1, err.loc.line - 10);
    const endLine = Math.min(wrapLines.length, err.loc.line + 10);
    for (let i = startLine; i <= endLine; i++) {
      console.log(`${i}: ${wrapLines[i-1]}`);
    }
  }
}
