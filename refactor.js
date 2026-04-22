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

  // 1. Remove shadows
  content = content.replace(/\bshadow-(sm|md|lg|xl|2xl|inner|\[.*?\])\b/g, '');
  
  // 2. Replace font-black and font-bold
  content = content.replace(/\bfont-black\b/g, 'font-semibold');
  content = content.replace(/\bfont-bold\b/g, 'font-medium');

  // 3. Borders
  // Replace border-border (that is not followed by /something) with border-border/50
  content = content.replace(/\bborder-border(?!\/)/g, 'border-border/50');

  // 4. Hardcoded colors -> semantic
  // text-red-* -> text-destructive
  content = content.replace(/\btext-red-[0-9]{3}\b/g, 'text-destructive');
  content = content.replace(/\bbg-red-[0-9]{3}\/[0-9]+\b/g, 'bg-destructive/10');
  
  // green/emerald/teal -> primary
  content = content.replace(/\btext-(green|emerald|teal)-[0-9]{3}\b/g, 'text-primary');
  content = content.replace(/\bbg-(green|emerald|teal)-[0-9]{3}\/[0-9]+\b/g, 'bg-primary/10');
  content = content.replace(/\border-(green|emerald|teal)-[0-9]{3}\/[0-9]+\b/g, 'border-primary/20');
  
  // blue/purple/indigo -> primary or muted
  content = content.replace(/\btext-(blue|purple|indigo)-[0-9]{3}\b/g, 'text-primary');
  content = content.replace(/\bbg-(blue|purple|indigo)-[0-9]{3}\/[0-9]+\b/g, 'bg-primary/10');
  content = content.replace(/\border-(blue|purple|indigo)-[0-9]{3}\/[0-9]+\b/g, 'border-primary/20');

  // orange/yellow/amber -> warning/muted-foreground
  content = content.replace(/\btext-(orange|yellow|amber)-[0-9]{3}\b/g, 'text-muted-foreground');
  content = content.replace(/\bbg-(orange|yellow|amber)-[0-9]{3}\/[0-9]+\b/g, 'bg-muted/30');
  content = content.replace(/\border-(orange|yellow|amber)-[0-9]{3}\/[0-9]+\b/g, 'border-border/50');

  // Clean up multiple spaces that might result from removal
  content = content.replace(/  +/g, ' ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
