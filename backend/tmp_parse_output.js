const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'AppData', 'Roaming', 'Code', 'copilot-terminal-output', 'copilot-terminal-output-f5787ae8-32ee-48d9-9100-69426793510b.txt');
try {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (/Current streak:|Max streak:|Active days:|Database payload|GraphQL response|Playwright response|Merged profile|"maxStreak"|"currentStreak"|"activeDays"|"topicStatistics"/.test(line)) {
      console.log(line);
    }
  }
} catch (err) {
  console.error(err);
}
