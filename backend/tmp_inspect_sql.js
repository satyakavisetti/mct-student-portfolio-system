const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'services', 'codingSyncService.js');
const text = fs.readFileSync(file, 'utf8');
const section = text.split('INSERT INTO coding_profiles (', 2)[1];
const columnsSection = section.split(') VALUES', 2)[0];
const valuesSection = section.split('VALUES (', 2)[1].split(')', 2)[0];
const columns = columnsSection.split(',').map((item) => item.trim());
const values = valuesSection.split(',').map((item) => item.trim());
console.log('columns', columns.length);
console.log('values', values.length);
columns.forEach((col, idx) => {
  console.log(`${idx + 1}: ${col} -> ${values[idx] ?? '<missing>'}`);
});
