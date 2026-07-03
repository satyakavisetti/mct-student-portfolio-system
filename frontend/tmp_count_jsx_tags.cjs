const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/pages/CoordinatorReportCards.jsx');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
const tagRegex = /<\/?([A-Za-z][A-Za-z0-9_]*)\b[^>]*>/g;
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let match;
  tagRegex.lastIndex = 0;
  while ((match = tagRegex.exec(line)) !== null) {
    const full = match[0];
    const tag = match[1];
    const isClose = full.startsWith('</');
    const selfClose = full.endsWith('/>');
    if (isClose) {
      const last = stack.pop();
      if (!last) {
        console.log('Unmatched close', tag, 'at', i+1, line.trim());
      } else if (last.tag !== tag) {
        console.log('Mismatched close', tag, 'expected', last.tag, 'at', i+1, line.trim());
      }
    } else if (!selfClose) {
      stack.push({tag, line:i+1, text:line.trim()});
    }
  }
}
console.log('Stack size', stack.length);
stack.slice(-20).forEach(x => console.log('left open', x.tag, 'at', x.line, x.text));
