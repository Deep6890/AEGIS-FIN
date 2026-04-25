import fs from 'fs';
import path from 'path';

const files = [
  "BalanceSheet.jsx", "Companies.jsx", "Correlation.jsx", 
  "Dashboard.jsx", "MacroOverlay.jsx", "RiskEngine.jsx", "Sectors.jsx"
];

files.forEach(f => {
  const p = path.join("src/pages", f);
  let content = fs.readFileSync(p, 'utf8');
  
  // Fix text-white
  content = content.replace(/text-white/g, "text-neutral-900 dark:text-white");
  
  // Fix bg-white alphas
  content = content.replace(/bg-white\/\[0\.02\]/g, "bg-neutral-900/[0.02] dark:bg-white/[0.02]");
  content = content.replace(/bg-white\/\[0\.03\]/g, "bg-neutral-900/[0.03] dark:bg-white/[0.03]");
  content = content.replace(/bg-white\/\[0\.04\]/g, "bg-neutral-900/[0.04] dark:bg-white/[0.04]");
  content = content.replace(/bg-white\/\[0\.05\]/g, "bg-neutral-900/[0.05] dark:bg-white/[0.05]");
  content = content.replace(/bg-white\/\[0\.06\]/g, "bg-neutral-900/[0.06] dark:bg-white/[0.06]");
  content = content.replace(/bg-white\/\[0\.08\]/g, "bg-neutral-900/[0.08] dark:bg-white/[0.08]");
  
  // Fix border-white alphas
  content = content.replace(/border-white\/\[0\.05\]/g, "border-neutral-900/[0.05] dark:border-white/[0.05]");
  content = content.replace(/border-white\/\[0\.06\]/g, "border-neutral-900/[0.06] dark:border-white/[0.06]");
  content = content.replace(/border-white\/\[0\.08\]/g, "border-neutral-900/[0.08] dark:border-white/[0.08]");
  content = content.replace(/border-white\/\[0\.1\]/g, "border-neutral-900/[0.1] dark:border-white/[0.1]");
  content = content.replace(/border-white\/\[0\.12\]/g, "border-neutral-900/[0.12] dark:border-white/[0.12]");
  
  // Fix double darks that might have occurred from naive replace
  content = content.replace(/dark:text-neutral-900 dark:text-white/g, "dark:text-white");
  
  fs.writeFileSync(p, content);
});

console.log("Done");
