import fs from 'fs';
import path from 'path';

// --- 1. UPDATE SERVER.JS ---
let server = fs.readFileSync('server.js', 'utf8');

const uploadStart = server.indexOf("app.post('/api/upload-image'");
const uploadEnd = server.indexOf("// Policy file status endpoint");

if (uploadStart === -1 || uploadEnd === -1) {
  console.error("Could not find upload route in server.js");
  process.exit(1);
}

const newServerRoutes = `app.post('/api/upload-image', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { filename, base64Data, targetKey, targetProductId } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data' });
    }
    const base64Clean = base64Data.replace(/^data:image\\/\\w+;base64,/, '');
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
      'trocar-flagship': 'assets/trocar-flagship.png',
      'trocar-mini': 'assets/trocar-mini.png',
      'trocar-bags': 'assets/trocar-bags.png'
    };

    const mainTarget = keyMap[targetKey] || (targetKey ? \`assets/\${targetKey}.png\` : 'assets/uploaded.png');
    targets.push(mainTarget);
    targets.push('dist/' + mainTarget);

    if (filename) {
      const safeFilename = path.basename(filename);
      targets.push(\`assets/\${safeFilename}\`, \`dist/assets/\${safeFilename}\`);
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
      const match = html.match(/<script id="catalog-data" type="application\\/json">([\\s\\S]*?)<\\/script>/);
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
        html = html.replace(match[0], '<script id="catalog-data" type="application/json">\\n' + newJson + '\\n</script>');
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
      'trocar-flagship': 'assets/trocar-flagship.png',
      'trocar-mini': 'assets/trocar-mini.png',
      'trocar-bags': 'assets/trocar-bags.png',
      'lunaru-device': 'assets/lunaru-device.png',
      'lunaru-flatdeck': 'assets/lunaru-flatdeck-reloads.png',
      'lunaru-fulgrip': 'assets/lunaru-fulgrip-reloads.png'
    };
    const mainTarget = keyMap[targetKey] || (targetKey ? \`assets/\${targetKey}.png\` : null);
    if (mainTarget) {
      [mainTarget, 'dist/' + mainTarget].forEach(t => {
        const full = path.join(__dirname, t);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      });
    }

    const cleanHtmlCatalog = (htmlPath) => {
      if (!fs.existsSync(htmlPath)) return;
      let html = fs.readFileSync(htmlPath, 'utf8');
      const match = html.match(/<script id="catalog-data" type="application\\/json">([\\s\\S]*?)<\\/script>/);
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
        html = html.replace(match[0], '<script id="catalog-data" type="application/json">\\n' + newJson + '\\n</script>');
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

`;

server = server.substring(0, uploadStart) + newServerRoutes + server.substring(uploadEnd);
fs.writeFileSync('server.js', server, 'utf8');
console.log('server.js updated with enhanced upload & delete routes!');
