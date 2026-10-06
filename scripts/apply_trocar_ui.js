import fs from 'fs';

let html = fs.readFileSync('producto.html', 'utf8');

const oldRenderStart = "const renderSeriesCard = (s) => {";
const oldRenderEnd = "<!-- Sections within series -->";

const sIdx = html.indexOf(oldRenderStart);
const eIdx = html.indexOf(oldRenderEnd);

if (sIdx === -1 || eIdx === -1) {
  console.error("Bounds not found");
  process.exit(1);
}

const newRenderCode = `const renderSeriesCard = (s) => {
          const trocarKey = 'trocar-' + s.id;
          const cachedSeriesPhoto = isTrocares ? (localStorage.getItem('user_photo_' + trocarKey) || localStorage.getItem('trocar_' + s.id + '_photo')) : null;
          const initialSeriesSrc = cachedSeriesPhoto || s.imageSrc || '';

          return \`
          <div class="trocar-series-card bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print-shadow-none space-y-6" data-series-id="\${s.id}" id="series-card-\${s.id}">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-3.5 h-3.5 rounded-full \${s.id === 'mini' ? 'bg-indigo-600 ring-4 ring-indigo-100' : (s.id === 'flagship' ? 'bg-[#001F3F] ring-4 ring-slate-100' : 'bg-teal-600 ring-4 ring-teal-100')}"></span>
                <div>
                  <h3 class="text-xl sm:text-2xl font-black text-[#001F3F] tracking-tight">\${s.title}</h3>
                  <p class="text-xs sm:text-sm text-slate-500 font-sans">\${s.tagline || ""}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                \${s.badge ? \`
                  <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black \${s.id === 'mini' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-teal-50 text-teal-700 border border-teal-200'} w-fit">
                    \${s.badge}
                  </span>
                \` : ""}
                \${isTrocares ? \`
                  <button onclick="triggerPhotoUpload('\${trocarKey}', 'fulbright-trocares', '\${s.title}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#006DFF] border border-blue-200 text-xs font-bold transition-all cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <span>\${initialSeriesSrc ? 'Cambiar foto' : 'Subir foto'}</span>
                  </button>
                  \${initialSeriesSrc ? \`
                    <button onclick="removeUploadedPhoto('\${trocarKey}', 'fulbright-trocares')" class="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold border border-slate-200 cursor-pointer" title="Quitar fotografía">✕</button>
                  \` : ''}
                \` : ''}
              </div>
            </div>

            <!-- FOTOGRAFÍA OFICIAL DE LA SERIE DE TRÓCARES -->
            \${initialSeriesSrc ? \`
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
            \` : (isTrocares ? \`
              <!-- ZONA DE SUBIDA OPCIONAL TRÓCAR -->
              <div class="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center bg-slate-50/50 flex flex-col items-center justify-center space-y-2.5 transition-all">
                <p class="text-xs text-slate-500 font-medium">Sin fotografía oficial asignada para \${s.title}</p>
                <button onclick="triggerPhotoUpload('\${trocarKey}', 'fulbright-trocares', '\${s.title}')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-[#001F3F] border border-slate-200 hover:border-blue-300 text-xs font-bold transition-all shadow-2xs cursor-pointer">
                  <svg class="w-3.5 h-3.5 text-[#006DFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  <span>Subir fotografía de \${s.title}</span>
                </button>
              </div>
            \` : '')}

            `;

html = html.substring(0, sIdx) + newRenderCode + html.substring(eIdx);

fs.writeFileSync('producto.html', html, 'utf8');
fs.writeFileSync('dist/producto.html', html, 'utf8');
console.log('Successfully updated trocarSeries rendering!');
