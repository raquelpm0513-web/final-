import fs from 'fs';

let html = fs.readFileSync('producto.html', 'utf8');

// 1. Fix the broken insertion around initPortalBackNavigation in if (!p)
html = html.replace(
  "if (typeof initPortalBackNavigation === 'function') }; // end renderProductView      window.renderProductView();      initPortalBackNavigation();",
  "if (typeof initPortalBackNavigation === 'function') initPortalBackNavigation();"
);

// 2. Also remove any double wrapping if present
html = html.replace(/window\.renderProductView = function\(targetProdId\) \{[\s\S]*?const urlParams = new URLSearchParams/, "const urlParams = new URLSearchParams");

// 3. Now do the proper clean wrapping of the IIFE
// Find (function() {
// and wrap it cleanly:
const iifeStart = html.indexOf("(function() {");
const iifeEnd = html.indexOf("initRealPhotoUploader();");

if (iifeStart !== -1 && iifeEnd !== -1) {
  // Replace (function() { with function renderProductView
  html = html.replace("(function() {", `window.renderProductView = function(targetProdId) {
      const urlParams = new URLSearchParams(window.location.search);
      let prodId = targetProdId || urlParams.get('id') || urlParams.get('producto') || urlParams.get('product');
      window.currentProductId = prodId;`);

  // Remove the old urlParams definition inside the function
  html = html.replace("const urlParams = new URLSearchParams(window.location.search);\n      let prodId = urlParams.get('id') || urlParams.get('producto') || urlParams.get('product');\n", "");

  // Close renderProductView before initPortalBackNavigation at end of container render
  html = html.replace(
    "initPortalBackNavigation();\n      initRealPhotoUploader();\n      initSpectronicUploader();\n      initGradeQaUploader();\n      initSpaceOarVueUploader();\n    })();",
    `initPortalBackNavigation();
    }; // end renderProductView
    window.renderProductView();`
  );
}

// 4. Do not wipe user uploads on load!
html = html.replace(
  "function initRealPhotoUploader() {      ['device', 'flatdeck', 'fulgrip', 'biomarc_restore_official_photo'].forEach(key => {        try {          localStorage.removeItem('real_photo_' + key);          localStorage.removeItem(key);        } catch(e) {}      });    }",
  "function initRealPhotoUploader() {}"
);

fs.writeFileSync('producto.html', html, 'utf8');
fs.writeFileSync('dist/producto.html', html, 'utf8');
console.log('Fixed renderProductView function wrapping successfully!');
