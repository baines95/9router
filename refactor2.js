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

  // 1. Remove shadow-xs
  content = content.replace(/\bshadow-xs\b/g, '');
  
  // 2. Replace solid colors
  content = content.replace(/\bbg-(green|emerald|teal)-500(?!\/)\b/g, 'bg-primary');
  content = content.replace(/\bbg-(red|rose)-500(?!\/)\b/g, 'bg-destructive');
  content = content.replace(/\btext-(green|emerald|teal)-500(?!\/)\b/g, 'text-primary');
  content = content.replace(/\btext-(red|rose)-500(?!\/)\b/g, 'text-destructive');

  // 3. Borders
  content = content.replace(/\border-(green|emerald|teal)-[0-9]{3}\/[0-9]+\b/g, 'border-primary/20');
  content = content.replace(/\border-(yellow|amber)-[0-9]{3}\/[0-9]+\b/g, 'border-border/50');
  content = content.replace(/\border-(red|rose)-[0-9]{3}\/[0-9]+\b/g, 'border-destructive/20');
  
  // Clean up multiple spaces
  content = content.replace(/  +/g, ' ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
