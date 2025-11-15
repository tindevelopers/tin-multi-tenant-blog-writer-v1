#!/usr/bin/env node

/**
 * Script to replace console.log/error/warn/debug with logger utility
 * Usage: node scripts/replace-console-logs.js [file-pattern]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const loggerImport = "import { logger } from '@/utils/logger';";

// Patterns to replace
const replacements = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug(',
    comment: '// Replaced console.log with logger.debug'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    comment: '// Replaced console.error with logger.error'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    comment: '// Replaced console.warn with logger.warn'
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    comment: '// Replaced console.debug with logger.debug'
  },
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let hasLoggerImport = content.includes("from '@/utils/logger'") || content.includes('from "@/utils/logger"');

    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }

    // Add logger import if needed and file was modified
    if (modified && !hasLoggerImport) {
      // Find the last import statement
      const importRegex = /^import\s+.*$/gm;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        content = content.slice(0, insertIndex) + '\n' + loggerImport + content.slice(insertIndex);
      } else {
        // No imports, add at the top
        content = loggerImport + '\n' + content;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Processed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFiles(dir, pattern = /\.(ts|tsx|js|jsx)$/) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          walk(fullPath);
        }
      } else if (pattern.test(entry)) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// Main execution
const targetDir = process.argv[2] || 'src';
const files = findFiles(targetDir);

console.log(`Found ${files.length} files to process...\n`);

let processed = 0;
for (const file of files) {
  if (processFile(file)) {
    processed++;
  }
}

console.log(`\n✅ Processed ${processed} files`);

