import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// API route to upload and persist real product photos
app.post('/api/upload-image', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { filename, base64Data, targetKey, targetProductId } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data' });
    }
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const targets = [];

    const keyMap = {
      'device': 'assets/hyperforce-device.png',
      'flatdeck': 'assets/hyperforce-flatdeck-reloads.png',
      'flat-deck': 'assets/hyperforce-flatdeck-reloads.png',
      'fulgrip': 'assets/hyperforce-fulgrip-reloads.png',
      'ful-grip': 'assets/hyperforce-fulgrip-reloads.png',
      'lunaru-device': 'assets/lunaru-device.png',
      'lunaru-flatdeck': 'assets/lunaru-flatdeck-reloads.png',
      'lunaru-fulgrip': 'assets/lunaru-fulgrip-reloads.png',
      'biomarc-pro': 'assets/biomarc-pro.png',
      'biomarc-ex': 'assets/biomarc-ex.png',
      'biomarc-secure': 'assets/biomarc-secure.png',
      'biomarc-enh': 'assets/biomarc-enh.png',
      'biomarc-restore': 'assets/biomarc-restore.png',
      'spaceoar-vue-hydrogel': 'assets/spaceoar-vue-hydrogel.png',
      'spectronic-mri-planner-1': 'assets/spectronic-mri-planner-1.png',
      'spectronic-mri-planner-2': 'assets/spectronic-mri-planner-2.png',
      'spectronic-grade-qa': 'assets/spectronic-grade-qa.png',
      'radsafe-1': 'assets/radsafe-1.png',
      'radsafe-2': 'assets/radsafe-2.png',
      'trocar-flagship': 'assets/trocar-flagship.png',
      'trocar-mini': 'assets/trocar-mini.png',
      'trocar-bags': 'assets/trocar-bags.png'
    };

    const mainTarget = keyMap[targetKey] || (targetKey ? `assets/${targetKey}.png` : 'assets/uploaded.png');
    targets.push(mainTarget);
    targets.push('dist/' + mainTarget);

    if (filename) {
      const safeFilename = path.basename(filename);
      targets.push(`assets/${safeFilename}`, `dist/assets/${safeFilename}`);
    }

    for (const t of targets) {
      const fullPath = path.join(__dirname, t);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, buffer);
    }

    // Persist into catalog JSON in producto.html & dist/producto.html
    const updateHtmlCatalog = (htmlPath) => {
      if (!fs.existsSync(htmlPath)) return;
      let html = fs.readFileSync(htmlPath, 'utf8');
      const match = html.match(/<script id="catalog-data" type="application\/json">([\s\S]*?)<\/script>/);
      if (!match) return;
      try {
        const catalog = JSON.parse(match[1]);
        const pId = targetProductId || targetKey;
        if (targetKey === 'trocar-flagship' || targetKey === 'trocar-mini' || targetKey === 'trocar-bags') {
          if (catalog['fulbright-trocares'] && catalog['fulbright-trocares'].trocarSeries) {
            const seriesId = targetKey.replace('trocar-', '');
            const s = catalog['fulbright-trocares'].trocarSeries.find(item => item.id === seriesId);
            if (s) s.imageSrc = mainTarget;
          }
        } else if (targetKey === 'spectronic-mri-planner-1') {
          if (catalog['spectronic-mri-planner']) {
            if (!catalog['spectronic-mri-planner'].images) catalog['spectronic-mri-planner'].images = [];
            catalog['spectronic-mri-planner'].images[0] = { id: 'img1', title: 'Spectronic MRI Planner - Imagen 1', src: mainTarget, alt: 'Spectronic MRI Planner' };
          }
        } else if (targetKey === 'spectronic-mri-planner-2') {
          if (catalog['spectronic-mri-planner']) {
            if (!catalog['spectronic-mri-planner'].images) catalog['spectronic-mri-planner'].images = [];
            catalog['spectronic-mri-planner'].images[1] = { id: 'img2', title: 'Spectronic MRI Planner - Imagen 2', src: mainTarget, alt: 'Spectronic MRI Planner' };
          }
        } else if (targetKey === 'radsafe-1') {
          const rId = 'radsafe-medical-ink';
          if (catalog[rId]) {
            if (!catalog[rId].images) catalog[rId].images = [];
            catalog[rId].images[0] = { id: 'img1', title: 'RadSafe® Medical Ink - Imagen 1', src: mainTarget, alt: 'RadSafe Medical Ink' };
          }
        } else if (targetKey === 'radsafe-2') {
          const rId = 'radsafe-medical-ink';
          if (catalog[rId]) {
            if (!catalog[rId].images) catalog[rId].images = [];
            catalog[rId].images[1] = { id: 'img2', title: 'RadSafe® Medical Ink - Imagen 2', src: mainTarget, alt: 'RadSafe Medical Ink' };
          }
        } else if (targetKey === 'lunaru-flatdeck' || targetKey === 'lunaru-fulgrip') {
          ['fulbright-lunar-u', 'fulbright-lunar-u-pro'].forEach(lid => {
            if (catalog[lid] && catalog[lid].compatibleReloads && catalog[lid].compatibleReloads.types) {
              const typeId = targetKey === 'lunaru-flatdeck' ? 'flat-deck' : 'fulgrip';
              const t = catalog[lid].compatibleReloads.types.find(item => item.id === typeId);
              if (t) t.imageSrc = mainTarget;
            }
          });
        } else if (catalog[pId]) {
          catalog[pId].images = [{
            id: 'img-' + targetKey,
            title: catalog[pId].name,
            src: mainTarget,
            alt: catalog[pId].name
          }];
        }
        const newJson = JSON.stringify(catalog, null, 2);
        html = html.replace(match[0], '<script id="catalog-data" type="application/json">\n' + newJson + '\n</script>');
        fs.writeFileSync(htmlPath, html, 'utf8');
      } catch (e) {
        console.error('Error updating catalog in ' + htmlPath, e);
      }
    };

    updateHtmlCatalog(path.join(__dirname, 'producto.html'));
    updateHtmlCatalog(path.join(__dirname, 'dist', 'producto.html'));

    return res.json({ success: true, targets, mainTarget });
  } catch (err) {
    console.error('Error saving uploaded image:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API route to delete an uploaded image
app.post('/api/delete-image', express.json(), (req, res) => {
  try {
    const { targetKey, targetProductId } = req.body;
    const keyMap = {
      'biomarc-pro': 'assets/biomarc-pro.png',
      'biomarc-ex': 'assets/biomarc-ex.png',
      'biomarc-secure': 'assets/biomarc-secure.png',
      'biomarc-enh': 'assets/biomarc-enh.png',
      'biomarc-restore': 'assets/biomarc-restore.png',
      'spaceoar-vue-hydrogel': 'assets/spaceoar-vue-hydrogel.png',
      'spectronic-mri-planner-1': 'assets/spectronic-mri-planner-1.png',
      'spectronic-mri-planner-2': 'assets/spectronic-mri-planner-2.png',
      'spectronic-grade-qa': 'assets/spectronic-grade-qa.png',
      'radsafe-1': 'assets/radsafe-1.png',
      'radsafe-2': 'assets/radsafe-2.png',
      'trocar-flagship': 'assets/trocar-flagship.png',
      'trocar-mini': 'assets/trocar-mini.png',
      'trocar-bags': 'assets/trocar-bags.png',
      'lunaru-device': 'assets/lunaru-device.png',
      'lunaru-flatdeck': 'assets/lunaru-flatdeck-reloads.png',
      'lunaru-fulgrip': 'assets/lunaru-fulgrip-reloads.png'
    };
    const mainTarget = keyMap[targetKey] || (targetKey ? `assets/${targetKey}.png` : null);
    if (mainTarget) {
      [mainTarget, 'dist/' + mainTarget].forEach(t => {
        const full = path.join(__dirname, t);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      });
    }

    const cleanHtmlCatalog = (htmlPath) => {
      if (!fs.existsSync(htmlPath)) return;
      let html = fs.readFileSync(htmlPath, 'utf8');
      const match = html.match(/<script id="catalog-data" type="application\/json">([\s\S]*?)<\/script>/);
      if (!match) return;
      try {
        const catalog = JSON.parse(match[1]);
        const pId = targetProductId || targetKey;
        if (targetKey === 'trocar-flagship' || targetKey === 'trocar-mini' || targetKey === 'trocar-bags') {
          if (catalog['fulbright-trocares'] && catalog['fulbright-trocares'].trocarSeries) {
            const seriesId = targetKey.replace('trocar-', '');
            const s = catalog['fulbright-trocares'].trocarSeries.find(item => item.id === seriesId);
            if (s) delete s.imageSrc;
          }
        } else if (targetKey === 'spectronic-mri-planner-1') {
          if (catalog['spectronic-mri-planner'] && catalog['spectronic-mri-planner'].images) {
            catalog['spectronic-mri-planner'].images[0] = null;
            catalog['spectronic-mri-planner'].images = catalog['spectronic-mri-planner'].images.filter(Boolean);
          }
        } else if (targetKey === 'spectronic-mri-planner-2') {
          if (catalog['spectronic-mri-planner'] && catalog['spectronic-mri-planner'].images) {
            catalog['spectronic-mri-planner'].images[1] = null;
            catalog['spectronic-mri-planner'].images = catalog['spectronic-mri-planner'].images.filter(Boolean);
          }
        } else if (catalog[pId]) {
          catalog[pId].images = [];
        }
        const newJson = JSON.stringify(catalog, null, 2);
        html = html.replace(match[0], '<script id="catalog-data" type="application/json">\n' + newJson + '\n</script>');
        fs.writeFileSync(htmlPath, html, 'utf8');
      } catch (e) {
        console.error('Error cleaning catalog in ' + htmlPath, e);
      }
    };

    cleanHtmlCatalog(path.join(__dirname, 'producto.html'));
    cleanHtmlCatalog(path.join(__dirname, 'dist', 'producto.html'));

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting image:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Policy file status endpoint
app.get('/api/policy-status', (req, res) => {
  const filePath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
  const exists = fs.existsSync(filePath);
  let size = 0;
  let pageCount = 0;
  let updatedAt = 0;
  let pages = [];
  if (exists) {
    try {
      const stat = fs.statSync(filePath);
      size = stat.size;
      updatedAt = stat.mtimeMs;
      const assetsDir = path.join(__dirname, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const pageFiles = files.filter(f => /^page-\d+\.png$/.test(f))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10);
            const numB = parseInt(b.replace(/\D/g, ''), 10);
            return numA - numB;
          });
        pageCount = pageFiles.length;
        pages = pageFiles.map(f => `/assets/${f}?v=${Math.floor(updatedAt)}`);
      }
    } catch(e) {}
  }
  res.json({ exists, size, pageCount, pages, updatedAt, url: exists ? '/politica-de-seguridad-ens.pdf' : null });
});

// Delete policy endpoint
app.post(['/api/delete-policy', '/api/delete-policy-pdf'], (req, res) => {
  try {
    const targets = [
      'POLÍTICA DE SEGURIDAD.pdf',
      'POLÍTICA DE SEGURIDAD.pdf',
      'politica-de-seguridad-ens.pdf',
      'Politica_de_Seguridad_ENS.pdf',
      'politica-seguridad.pdf',
      'assets/politica-de-seguridad-ens.pdf',
      'assets/Politica_de_Seguridad_ENS.pdf',
      'dist/POLÍTICA DE SEGURIDAD.pdf',
      'dist/POLÍTICA DE SEGURIDAD.pdf',
      'dist/politica-de-seguridad-ens.pdf',
      'dist/Politica_de_Seguridad_ENS.pdf',
      'dist/politica-seguridad.pdf',
      'dist/assets/politica-de-seguridad-ens.pdf',
      'dist/assets/Politica_de_Seguridad_ENS.pdf'
    ];
    for (const t of targets) {
      const p = path.join(__dirname, t);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    // Also remove page-*.png
    ['assets', 'dist/assets'].forEach(dir => {
      const dp = path.join(__dirname, dir);
      if (fs.existsSync(dp)) {
        fs.readdirSync(dp).filter(f => /^page-\d+\.png$/.test(f)).forEach(f => {
          try { fs.unlinkSync(path.join(dp, f)); } catch(e) {}
        });
      }
    });
    return res.json({ success: true, message: 'Documento eliminado correctamente' });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
});

// API route to upload and persist documents (PDF, PNG, JPG, WEBP, DOCX)
app.post(['/api/upload-pdf', '/api/upload-document'], express.json({ limit: '100mb' }), (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Falta base64Data' });
    }
    const safeFilename = filename ? path.basename(filename) : 'documento.pdf';
    const isImage = /\.(png|jpe?g|webp)$/i.test(safeFilename) || /^data:image\//i.test(base64Data);

    const base64Clean = base64Data
      .replace(/^data:[a-zA-Z0-9.\/-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    // Clean previous pages
    ['assets', 'dist/assets'].forEach(dir => {
      const dp = path.join(__dirname, dir);
      if (fs.existsSync(dp)) {
        fs.readdirSync(dp).filter(f => /^page-\d+\.png$/.test(f)).forEach(f => {
          try { fs.unlinkSync(path.join(dp, f)); } catch(e) {}
        });
      }
    });

    if (isImage) {
      // Save image directly as page 1
      const p1 = path.join(__dirname, 'assets', 'page-1.png');
      const p2 = path.join(__dirname, 'dist', 'assets', 'page-1.png');
      fs.writeFileSync(p1, buffer);
      fs.writeFileSync(p2, buffer);

      // Also save as politica-de-seguridad-ens.pdf
      const pdfPath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
      fs.writeFileSync(pdfPath, buffer);
      const distPdfPath = path.join(__dirname, 'dist', 'politica-de-seguridad-ens.pdf');
      fs.writeFileSync(distPdfPath, buffer);

      return res.json({
        success: true,
        pageCount: 1,
        pages: ['/assets/page-1.png'],
        size: buffer.length,
        url: '/politica-de-seguridad-ens.pdf'
      });
    }

    // Default: PDF document
    const targets = [
      'POLÍTICA DE SEGURIDAD.pdf',
      'POLÍTICA DE SEGURIDAD.pdf',
      'politica-de-seguridad-ens.pdf',
      'Politica_de_Seguridad_ENS.pdf',
      'politica-seguridad.pdf',
      'assets/politica-de-seguridad-ens.pdf',
      'assets/Politica_de_Seguridad_ENS.pdf',
      'dist/POLÍTICA DE SEGURIDAD.pdf',
      'dist/POLÍTICA DE SEGURIDAD.pdf',
      'dist/politica-de-seguridad-ens.pdf',
      'dist/Politica_de_Seguridad_ENS.pdf',
      'dist/politica-seguridad.pdf',
      'dist/assets/politica-de-seguridad-ens.pdf',
      'dist/assets/Politica_de_Seguridad_ENS.pdf'
    ];
    if (filename) {
      targets.push(safeFilename, `dist/${safeFilename}`, `assets/${safeFilename}`, `dist/assets/${safeFilename}`);
    }

    for (const t of targets) {
      const fullPath = path.join(__dirname, t);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, buffer);
    }

    // Render pages to PNG via Ghostscript
    const pdfPath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
    const outPattern = path.join(__dirname, 'assets', 'page-%d.png');
    const distAssetsDir = path.join(__dirname, 'dist', 'assets');
    
    try {
      execSync(`gs -dNOSAFER -dNOPAUSE -dBATCH -sDEVICE=png16m -r150 -sOutputFile="${outPattern}" "${pdfPath}"`, { stdio: 'ignore' });
      execSync(`cp "${path.join(__dirname, 'assets')}"/page-*.png "${distAssetsDir}/" 2>/dev/null || true`, { stdio: 'ignore' });
    } catch(gsErr) {
      console.log('Notice: gs render:', gsErr.message);
    }

    const assetsDir = path.join(__dirname, 'assets');
    const pageFiles = fs.readdirSync(assetsDir).filter(f => /^page-\d+\.png$/.test(f))
      .sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10));

    const pages = pageFiles.map(f => `/assets/${f}?v=${Date.now()}`);

    return res.json({
      success: true,
      count: targets.length,
      size: buffer.length,
      pageCount: pageFiles.length,
      pages,
      url: '/politica-de-seguridad-ens.pdf'
    });
  } catch (err) {
    console.error('Error saving uploaded document:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Download / Serve Política de Seguridad ENS PDF
const sendPdfWithFilename = (res, filePath, isDownload = false) => {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Archivo no encontrado',
      message: 'No se ha subido ningún documento de Política de Seguridad todavía.'
    });
  }
  const asciiFilename = 'POLITICA DE SEGURIDAD.pdf';
  const utf8Filename = encodeURIComponent('POLÍTICA DE SEGURIDAD.pdf');
  const dispositionType = isDownload ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${dispositionType}; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(filePath);
};

app.get([
  '/download-politica-seguridad',
  '/api/descargar-politica-seguridad',
  '/descargar-politica-seguridad'
], (req, res) => {
  const filePath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
  sendPdfWithFilename(res, filePath, true);
});

app.get([
  '/politica-de-seguridad-ens.pdf',
  '/Politica_de_Seguridad_ENS.pdf',
  '/politica-seguridad.pdf',
  '/POLÍTICA DE SEGURIDAD.pdf',
  '/POLÍTICA DE SEGURIDAD.pdf'
], (req, res) => {
  const filePath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
  const isDl = req.query.download === '1' || req.query.download === 'true';
  sendPdfWithFilename(res, filePath, isDl);
});

// Serve static assets directly and under /producto/assets
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));
app.use('/assets', (req, res) => {
  res.status(404).send('Asset not found');
});
app.use('/producto/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));
app.use('/producto/assets', (req, res) => {
  res.status(404).send('Asset not found');
});

// Serve static files (assets, images, html, pdf)
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  setHeaders: (res, path) => {
    if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Route for product page
app.get('/producto', (req, res) => {
  res.sendFile(path.join(__dirname, 'producto.html'));
});

// Single page application fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Auto-check and generate policy PDF and rendered pages if missing
try {
  const policyPdfPath = path.join(__dirname, 'politica-de-seguridad-ens.pdf');
  const page1Path = path.join(__dirname, 'assets', 'page-1.png');
  if (!fs.existsSync(policyPdfPath) || !fs.existsSync(page1Path)) {
    console.log('Policy document or pages missing on startup. Running generator...');
    execSync('node scripts/build_official_policy.js', { stdio: 'inherit', cwd: __dirname });
  }
} catch(err) {
  console.error('Notice: Auto-generating policy failed:', err.message);
}

app.listen(PORT, HOST, () => {
  console.log(`Fimecorp Portal running at http://${HOST}:${PORT}`);
});
