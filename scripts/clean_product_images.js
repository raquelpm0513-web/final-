import fs from 'fs';

let content = fs.readFileSync('producto.html', 'utf8');

// 1. Replace the productDeviceImageHtml section
const startDevice = content.indexOf('// Fotografía Oficial del Dispositivo (Imagen 1 que el usuario pasó tal cual)');
const endDevice = content.indexOf('// TABLAS TÉCNICAS (Modelos y Series Oficiales)');

if (startDevice === -1 || endDevice === -1) {
  console.error('Could not find productDeviceImageHtml bounds');
  process.exit(1);
}

const newDeviceCode = `// Fotografía Oficial del Dispositivo (Imagen 1 que el usuario pasó tal cual)
      let productDeviceImageHtml = "";
      if (p.images && p.images.length > 0 && p.images[0] && p.images[0].src) {
        const devImg = p.images[0];
        const isHyperForce = p.id === 'fulbright-hyper-force';
        const isLunarSPro = p.id === 'fulbright-lunar-s-pro';
        const isLunarS = p.id === 'fulbright-lunar-s';
        const isLunarUPro = p.id === 'fulbright-lunar-u-pro';
        const isLunarU = p.id === 'fulbright-lunar-u';
        const cachedPhoto = isHyperForce 
          ? localStorage.getItem('hyperforce_official_photo') 
          : (isLunarSPro ? localStorage.getItem('lunars_pro_official_photo') : (isLunarS ? localStorage.getItem('lunars_official_photo') : (isLunarUPro ? localStorage.getItem('lunaru_pro_official_photo') : (isLunarU ? localStorage.getItem('lunaru_official_photo') : null))));
        const initialSrc = cachedPhoto || devImg.src;
        if (initialSrc) {
          productDeviceImageHtml = \`
          <!-- FOTOGRAFÍA OFICIAL DEL DISPOSITIVO (IMAGEN 1) -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print-shadow-none space-y-4" id="product-device-card">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-[#001F3F] ring-4 ring-slate-100"></span>
                <div>
                  <h3 class="text-xl font-black text-[#001F3F] tracking-tight">\${devImg.title || (p.name + " · Dispositivo Quirúrgico")}</h3>
                  <p class="text-xs text-slate-500 font-sans">\${devImg.description || "Fotografía oficial del dispositivo"}</p>
                </div>
              </div>
              <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                Fotografía Oficial del Producto
              </span>
            </div>
            <div id="device-image-wrapper" class="w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50/70 rounded-xl border border-slate-200/80 overflow-hidden relative">
              <img id="img-device" src="\${initialSrc}" alt="\${devImg.alt || p.name}" onerror="this.onerror=null; const c=document.getElementById('product-device-card'); if(c) c.style.display='none';" class="w-full max-h-80 sm:max-h-96 object-contain drop-shadow-sm transition-transform duration-300 hover:scale-[1.01]" />
            </div>
          </div>
        \`;
        }
      }
      `;

content = content.substring(0, startDevice) + newDeviceCode + content.substring(endDevice);

// 2. Fix reload table image condition in renderSingleTable
content = content.replace(
  /\$\{\(t\.imageSrc \|\| isHyperForce \|\| isLunarSPro \|\| isLunarS \|\| isLunarUPro \|\| isLunarU\) \? `[\s\S]*?<!-- FOTOGRAFÍA OFICIAL DE RECARGAS TAL CUAL -->[\s\S]*?<\/div>\s*<\/div>\s*` : is3dTile \? `/,
  `\${(initialReloadSrc) ? \`
                <!-- FOTOGRAFÍA OFICIAL DE RECARGAS TAL CUAL -->
                <div class="space-y-2.5" id="reload-img-block-\${t.id || reloadKey}">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full \${t.hasAntiSlippery ? "bg-teal-600" : "bg-blue-600"}"></span>
                      <span class="text-xs font-mono font-bold uppercase tracking-wider text-[#001F3F]">\${t.imageTitle || ("Fotografía Oficial de Recargas · " + t.name)}</span>
                    </div>
                    <span class="text-[11px] font-mono font-bold \${t.hasAntiSlippery ? "text-teal-800 bg-teal-50 border border-teal-200" : "text-blue-800 bg-blue-50 border border-blue-200"} px-2.5 py-0.5 rounded-full w-fit">
                      \${t.imageBadge || (rowsList.length + " Códigos de Color")}
                    </span>
                  </div>
                  <div id="reload-wrapper-\${t.id || reloadKey}" class="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-4 sm:p-6 flex flex-col items-center justify-center relative">
                    <img id="img-\${t.id || reloadKey}" src="\${initialReloadSrc}" alt="\${t.name}" onerror="this.onerror=null; const blk=document.getElementById('reload-img-block-\${t.id || reloadKey}'); if(blk) blk.style.display='none';" class="w-full max-h-72 object-contain hover:scale-[1.01] transition-transform duration-300" />
                  </div>
                </div>
              \` : is3dTile ? \``
);

// 3. Fix trocar series image condition in renderSeriesCard
content = content.replace(
  /\$\{\(s\.imageSrc \|\| initialSeriesSrc\) \? `[\s\S]*?<!-- FOTOGRAFÍA OFICIAL DE LA SERIE DE TRÓCARES -->[\s\S]*?<\/div>\s*<\/div>\s*` : ''\}/,
  `\${(initialSeriesSrc) ? \`
              <!-- FOTOGRAFÍA OFICIAL DE LA SERIE DE TRÓCARES -->
              <div class="space-y-2.5" id="trocar-img-block-\${s.id}">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full \${s.id === 'mini' ? 'bg-indigo-600' : (s.id === 'bags' ? 'bg-teal-600' : 'bg-[#001F3F]')}"></span>
                    <span class="text-xs font-mono font-bold uppercase tracking-wider text-[#001F3F]">\${s.imageTitle || ("Fotografía Oficial · " + s.title)}</span>
                  </div>
                  \${s.imageBadge ? \`
                    <span class="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full w-fit">
                      \${s.imageBadge}
                    </span>
                  \` : ''}
                </div>
                <div id="trocar-wrapper-\${s.id}" class="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-4 sm:p-6 flex flex-col items-center justify-center relative">
                  <img id="img-trocar-\${s.id}" src="\${initialSeriesSrc}" alt="\${s.title}" onerror="this.onerror=null; const blk=document.getElementById('trocar-img-block-\${s.id}'); if(blk) blk.style.display='none';" class="w-full max-h-72 object-contain hover:scale-[1.01] transition-transform duration-300" />
                </div>
              </div>
            \` : ''}`
);

fs.writeFileSync('producto.html', content, 'utf8');
console.log('producto.html updated cleanly!');
