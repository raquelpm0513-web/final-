import fs from 'fs';

let html = fs.readFileSync('producto.html', 'utf8');

const targetStr = `      const catalogDataElement = document.getElementById('catalog-data');
      const catalog = JSON.parse(catalogDataElement.textContent);
          
      const urlParams = new URLSearchParams(window.location.search);
      let prodId = targetProdId || urlParams.get('id') || urlParams.get('producto') || urlParams.get('product');
      window.currentProductId = prodId;`;

const replaceStr = `      const catalogDataElement = document.getElementById('catalog-data');
      const catalog = JSON.parse(catalogDataElement.textContent);`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  console.log('Replaced exact match successfully!');
} else {
  // Try line by line index
  const idx = html.indexOf("window.renderProductView = function(targetProdId) {");
  const idx2 = html.indexOf("if (!prodId || !catalog[prodId]) {", idx);
  const chunk = html.substring(idx, idx2);
  console.log('Chunk between start and if (!prodId):', chunk);
  const cleanChunk = `window.renderProductView = function(targetProdId) {
      const urlParams = new URLSearchParams(window.location.search);
      let prodId = targetProdId || urlParams.get('id') || urlParams.get('producto') || urlParams.get('product');
      window.currentProductId = prodId;
      const catalogDataElement = document.getElementById('catalog-data');
      const catalog = JSON.parse(catalogDataElement.textContent);
      `;
  html = html.substring(0, idx) + cleanChunk + html.substring(idx2);
  console.log('Cleaned chunk successfully!');
}

fs.writeFileSync('producto.html', html, 'utf8');
fs.writeFileSync('dist/producto.html', html, 'utf8');
