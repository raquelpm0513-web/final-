import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure policy PDF and rendered page PNGs exist
try {
  const policyPdfPath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
  const page1Path = path.join(__dirname, 'assets', 'page-1.png');
  if (!fs.existsSync(policyPdfPath) || !fs.existsSync(page1Path)) {
    console.log('Generating missing policy document & pages during build...');
    execSync('node scripts/build_official_policy.js', { stdio: 'inherit', cwd: __dirname });
  }
} catch(err) {
  console.error('Notice: Auto-generating policy failed in build:', err.message);
}

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy assets directory if it exists
const assetsSrc = path.join(__dirname, 'assets');
const assetsDist = path.join(distDir, 'assets');
if (fs.existsSync(assetsSrc)) {
  fs.cpSync(assetsSrc, assetsDist, { recursive: true });
}

// Copy html and asset files to dist
const files = fs.readdirSync(__dirname);
for (const file of files) {
  if (file === 'dist' || file === 'node_modules') continue;
  const ext = path.extname(file).toLowerCase();
  if (['.html', '.svg', '.png', '.jpg', '.jpeg', '.pdf', '.webp', '.ico'].includes(ext)) {
    fs.copyFileSync(path.join(__dirname, file), path.join(distDir, file));
  }
}

console.log('Build completed successfully. Static assets copied to dist/.');
