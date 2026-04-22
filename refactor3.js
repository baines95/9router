const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src/app/(dashboard)');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Remove shadow-none
  content = content.replace(/\bshadow-none\b/g, '');
  
  // 2. Fix the borders typo from last time
  content = content.replace(/\bborder-(green|emerald|teal)-[0-9]{3}\/[0-9]+\b/g, 'border-primary/20');
  content = content.replace(/\bborder-(yellow|amber)-[0-9]{3}\/[0-9]+\b/g, 'border-border/50');
  content = content.replace(/\bborder-(red|rose)-[0-9]{3}\/[0-9]+\b/g, 'border-destructive/20');

  // Clean up multiple spaces
  content = content.replace(/  +/g, ' ');
  // Clean up trailing spaces before quote
  content = content.replace(/ "/g, '"');
  content = content.replace(/" /g, '"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
