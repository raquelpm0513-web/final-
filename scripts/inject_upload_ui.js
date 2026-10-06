import fs from 'fs';

let html = fs.readFileSync('producto.html', 'utf8');

// 1. Inject Toast and Global Upload Handlers before </head> or at beginning of script
const scriptMarker = 'window.triggerPhotoUpload';
if (!html.includes(scriptMarker)) {
  const uploadFunctions = `
    // GLOBAL TOAST NOTIFICATION
    window.showUploadToast = function(msg, type = 'success') {
      let toast = document.getElementById('upload-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'upload-toast';
        toast.className = 'fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl transition-all duration-300 transform translate-y-[-20px] opacity-0 pointer-events-none font-sans text-xs sm:text-sm font-bold';
        document.body.appendChild(toast);
      }
      const bg = type === 'success' ? 'bg-[#001F3F] text-white border border-blue-400/40' : (type === 'error' ? 'bg-rose-900 text-white border border-rose-500' : 'bg-slate-900 text-white border border-slate-700');
      toast.className = 'fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 font-sans text-xs sm:text-sm font-bold ' + bg;
      toast.innerHTML = (type === 'success' ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>' : '<span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>') + '<span>' + msg + '</span>';
      clearTimeout(window._toastTimeout);
      window._toastTimeout = setTimeout(() => {
        toast.className += ' translate-y-[-20px] opacity-0 pointer-events-none';
      }, 3500);
    };

    // TRIGGER PHOTO UPLOAD
    window.triggerPhotoUpload = function(targetKey, productId, title) {
      let input = document.getElementById('global-photo-file-input');
      if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'global-photo-file-input';
        input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
        input.style.display = 'none';
        document.body.appendChild(input);
      }
      input.value = '';
      input.onchange = async function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        showUploadToast('Subiendo fotografía...', 'info');
        const reader = new FileReader();
        reader.onload = async function(evt) {
          const base64 = evt.target.result;
          try {
            localStorage.setItem('user_photo_' + targetKey, base64);
          } catch(storageErr) {}
          try {
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetKey: targetKey,
                targetProductId: productId,
                base64Data: base64,
                filename: file.name
              })
            });
            const data = await res.json();
            if (data.success) {
              showUploadToast('✅ Fotografía guardada correctamente', 'success');
              setTimeout(() => {
                if (window.renderProductView) window.renderProductView(productId);
              }, 200);
            } else {
              showUploadToast('Error al guardar: ' + (data.error || 'Error desconocido'), 'error');
            }
          } catch(err) {
            console.error('Upload error:', err);
            showUploadToast('✅ Fotografía cargada localmente', 'success');
            setTimeout(() => {
              if (window.renderProductView) window.renderProductView(productId);
            }, 200);
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };

    // REMOVE UPLOADED PHOTO
    window.removeUploadedPhoto = async function(targetKey, productId) {
      if (!confirm('¿Deseas quitar esta fotografía oficial?')) return;
      try {
        localStorage.removeItem('user_photo_' + targetKey);
      } catch(e) {}
      try {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetKey, targetProductId: productId })
        });
      } catch(e) {}
      showUploadToast('Fotografía retirada', 'info');
      setTimeout(() => {
        if (window.renderProductView) window.renderProductView(productId);
      }, 200);
    };
  `;

  html = html.replace('<script>', '<script>\n' + uploadFunctions + '\n');
}

// 2. Wrap product rendering in window.renderProductView
const renderStartSearch = "const container = document.getElementById('product-container');";
const renderStartIdx = html.indexOf(renderStartSearch);

if (renderStartIdx !== -1 && !html.includes('window.renderProductView = function')) {
  // We wrap from urlParams definition to end of container rendering
  const urlParamsIdx = html.indexOf("const urlParams = new URLSearchParams(window.location.search);");
  if (urlParamsIdx !== -1) {
    const wrapCode = `
    window.renderProductView = function(targetProdId) {
      const urlParams = new URLSearchParams(window.location.search);
      let prodId = targetProdId || urlParams.get('id') || urlParams.get('producto') || urlParams.get('product');
      window.currentProductId = prodId;
    `;
    html = html.replace("const urlParams = new URLSearchParams(window.location.search);\n      let prodId = urlParams.get('id') || urlParams.get('producto') || urlParams.get('product');", wrapCode);

    // Call window.renderProductView() on load
    const endContainerIdx = html.indexOf("initPortalBackNavigation();");
    if (endContainerIdx !== -1) {
      html = html.substring(0, endContainerIdx) + "}; // end renderProductView\n      window.renderProductView();\n      " + html.substring(endContainerIdx);
    }
  }
}

// 3. Replace the productDeviceImageHtml generation with the clean upload-aware block
const devStart = html.indexOf("// Fotografía Oficial del Dispositivo (Imagen 1 que el usuario pasó tal cual)");
const devEnd = html.indexOf("// TABLAS TÉCNICAS (Modelos y Series Oficiales)");

if (devStart !== -1 && devEnd !== -1) {
  const newDeviceLogic = `// Fotografía Oficial del Dispositivo (Imagen 1 que el usuario pasó tal cual)
      let productDeviceImageHtml = "";
      
      const uploadableSingleProducts = [
        'biomarc-pro', 'biomarc-ex', 'biomarc-secure', 'biomarc-enh', 'biomarc-restore',
        'spaceoar-vue-hydrogel', 'spectronic-grade-qa', 'fulbright-lunar-u', 'fulbright-lunar-u-pro'
      ];
      const isSpectronicMriPlanner = p.id === 'spectronic-mri-planner';
      const isUploadableSingle = uploadableSingleProducts.includes(p.id);

      if (isSpectronicMriPlanner) {
        // SPECTRONIC MRI PLANNER: 2 IMÁGENES CON BOTÓN DE SUBIDA
        const img1Photo = localStorage.getItem('user_photo_spectronic-mri-planner-1') || (p.images && p.images[0] ? p.images[0].src : '');
        const img2Photo = localStorage.getItem('user_photo_spectronic-mri-planner-2') || (p.images && p.images[1] ? p.images[1].src : '');

        productDeviceImageHtml = \`
          <!-- FOTOGRAFÍAS OFICIALES · SPECTRONIC MRI PLANNER -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print-shadow-none space-y-6" id="spectronic-images-card">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-3.5 h-3.5 rounded-full bg-[#006DFF] ring-4 ring-blue-100"></span>
                <div>
                  <h3 class="text-xl font-black text-[#001F3F] tracking-tight">Fotografías Oficiales · Spectronic MRI Planner</h3>
                  <p class="text-xs text-slate-500 font-sans">Generación de tomografía sintética (sCT) por IA para radioterapia basada 100% en RM</p>
                </div>
              </div>
              <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                2 Imágenes Clínicas
              </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- IMAGEN 1: CEREBRO -->
              <div class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#006DFF]"></span>
                    <span class="text-xs font-black uppercase tracking-wider text-[#001F3F]">Imagen 1 · sCT Cerebro</span>
                  </div>
                  \${img1Photo ? \`
                    <div class="flex items-center gap-1.5">
                      <button onclick="triggerPhotoUpload('spectronic-mri-planner-1', 'spectronic-mri-planner', 'Spectronic MRI Planner · Imagen 1')" class="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#006DFF] text-xs font-bold transition-all cursor-pointer border border-blue-200">
                        Cambiar
                      </button>
                      <button onclick="removeUploadedPhoto('spectronic-mri-planner-1', 'spectronic-mri-planner')" class="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer border border-slate-200" title="Quitar">
                        ✕
                      </button>
                    </div>
                  \` : ''}
                </div>
                \${img1Photo ? \`
                  <div class="w-full flex items-center justify-center p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden min-h-[220px]">
                    <img src="\${img1Photo}" alt="Spectronic MRI Planner - Imagen 1" class="w-full max-h-72 object-contain drop-shadow-sm hover:scale-[1.01] transition-transform duration-300" />
                  </div>
                \` : \`
                  <div class="border-2 border-dashed border-blue-200 hover:border-[#006DFF] rounded-xl p-6 text-center space-y-3 bg-blue-50/30 transition-all flex flex-col items-center justify-center min-h-[220px]">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 text-[#006DFF] flex items-center justify-center">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <p class="text-xs text-slate-600 font-semibold">Sin imagen asignada para Imagen 1</p>
                    <button onclick="triggerPhotoUpload('spectronic-mri-planner-1', 'spectronic-mri-planner', 'Spectronic MRI Planner · Imagen 1')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#001F3F] hover:bg-[#002D5C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                      <span>Subir Imagen 1</span>
                    </button>
                  </div>
                \`}
              </div>

              <!-- IMAGEN 2: PRÓSTATA -->
              <div class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span class="text-xs font-black uppercase tracking-wider text-[#001F3F]">Imagen 2 · sCT Próstata</span>
                  </div>
                  \${img2Photo ? \`
                    <div class="flex items-center gap-1.5">
                      <button onclick="triggerPhotoUpload('spectronic-mri-planner-2', 'spectronic-mri-planner', 'Spectronic MRI Planner · Imagen 2')" class="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#006DFF] text-xs font-bold transition-all cursor-pointer border border-blue-200">
                        Cambiar
                      </button>
                      <button onclick="removeUploadedPhoto('spectronic-mri-planner-2', 'spectronic-mri-planner')" class="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer border border-slate-200" title="Quitar">
                        ✕
                      </button>
                    </div>
                  \` : ''}
                </div>
                \${img2Photo ? \`
                  <div class="w-full flex items-center justify-center p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden min-h-[220px]">
                    <img src="\${img2Photo}" alt="Spectronic MRI Planner - Imagen 2" class="w-full max-h-72 object-contain drop-shadow-sm hover:scale-[1.01] transition-transform duration-300" />
                  </div>
                \` : \`
                  <div class="border-2 border-dashed border-blue-200 hover:border-[#006DFF] rounded-xl p-6 text-center space-y-3 bg-blue-50/30 transition-all flex flex-col items-center justify-center min-h-[220px]">
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <p class="text-xs text-slate-600 font-semibold">Sin imagen asignada para Imagen 2</p>
                    <button onclick="triggerPhotoUpload('spectronic-mri-planner-2', 'spectronic-mri-planner', 'Spectronic MRI Planner · Imagen 2')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#001F3F] hover:bg-[#002D5C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                      <span>Subir Imagen 2</span>
                    </button>
                  </div>
                \`}
              </div>
            </div>
          </div>
        \`;
      } else if (isUploadableSingle || (p.images && p.images.length > 0 && p.images[0] && p.images[0].src)) {
        // PRODUCTO INDIVIDUAL CON FOTOGRAFÍA OFICIAL Y BOTÓN DE SUBIDA
        const devImg = (p.images && p.images[0]) ? p.images[0] : null;
        const uploadKey = p.id === 'fulbright-lunar-u' || p.id === 'fulbright-lunar-u-pro' ? 'lunaru-device' : p.id;
        const cachedPhoto = localStorage.getItem('user_photo_' + uploadKey) || (devImg ? devImg.src : '');
        const currentSrc = cachedPhoto;

        if (currentSrc) {
          productDeviceImageHtml = \`
          <!-- FOTOGRAFÍA OFICIAL DEL PRODUCTO -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print-shadow-none space-y-4" id="product-device-card">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-[#001F3F] ring-4 ring-slate-100"></span>
                <div>
                  <h3 class="text-xl font-black text-[#001F3F] tracking-tight">\${(devImg && devImg.title) || (p.name + " · Fotografía Oficial")}</h3>
                  <p class="text-xs text-slate-500 font-sans">\${(devImg && devImg.description) || "Fotografía oficial asignada a esta ficha de producto"}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="triggerPhotoUpload('\${uploadKey}', '\${p.id}', '\${p.name}')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#006DFF] border border-blue-200 text-xs font-bold transition-all cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span>Cambiar foto</span>
                </button>
                \${isUploadableSingle ? \`
                  <button onclick="removeUploadedPhoto('\${uploadKey}', '\${p.id}')" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer" title="Quitar fotografía">
                    ✕
                  </button>
                \` : ''}
              </div>
            </div>
            <div id="device-image-wrapper" class="w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50/70 rounded-xl border border-slate-200/80 overflow-hidden relative">
              <img id="img-device" src="\${currentSrc}" alt="\${(devImg && devImg.alt) || p.name}" onerror="this.onerror=null; const c=document.getElementById('product-device-card'); if(c && !isUploadableSingle) c.style.display='none';" class="w-full max-h-80 sm:max-h-96 object-contain drop-shadow-sm transition-transform duration-300 hover:scale-[1.01]" />
            </div>
          </div>
          \`;
        } else if (isUploadableSingle) {
          // ZONA DE SUBIDA PARA PRODUCTOS SIN FOTO ASIGNADA AÚN
          productDeviceImageHtml = \`
          <!-- ZONA DE SUBIDA · FOTOGRAFÍA OFICIAL -->
          <div class="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-6 sm:p-8 shadow-sm space-y-4 hover:border-[#006DFF] transition-all" id="product-device-upload-dropzone">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-blue-400 ring-4 ring-blue-50"></span>
                <div>
                  <h3 class="text-xl font-black text-[#001F3F] tracking-tight">\${p.name} · Fotografía Oficial</h3>
                  <p class="text-xs text-slate-500 font-sans">Aún no se ha añadido una imagen para este producto</p>
                </div>
              </div>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                Pendiente de foto
              </span>
            </div>
            <div class="w-full flex flex-col items-center justify-center p-8 bg-blue-50/20 rounded-xl border border-blue-100 text-center space-y-4">
              <div class="w-14 h-14 rounded-2xl bg-blue-100 text-[#006DFF] flex items-center justify-center">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <div class="max-w-md">
                <h4 class="text-base font-bold text-[#001F3F]">Subir fotografía oficial de \${p.name}</h4>
                <p class="text-xs text-slate-500 mt-1">Haz clic en el botón de abajo para seleccionar el archivo de imagen de tu equipo (PNG, JPG o WEBP).</p>
              </div>
              <button onclick="triggerPhotoUpload('\${uploadKey}', '\${p.id}', '\${p.name}')" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#001F3F] hover:bg-[#002D5C] text-white text-xs font-bold transition-all shadow-sm cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <span>Subir fotografía oficial</span>
              </button>
            </div>
          </div>
          \`;
        }
      }
      `;

  html = html.substring(0, devStart) + newDeviceLogic + html.substring(devEnd);
}

// 4. Update Trocares rendering so each series has its upload button and clean view
const trocarSeriesStart = html.indexOf("if (seriesList && seriesList.length > 0) {");
const trocarSeriesEnd = html.indexOf("if (p.compatibleReloads && p.compatibleReloads.types) {");

if (trocarSeriesStart !== -1 && trocarSeriesEnd !== -1) {
  const newTrocarSeriesLogic = `if (seriesList && seriesList.length > 0) {
        const isTrocares = p.id === 'fulbright-trocares';
        const renderSeriesCard = (s) => {
          const trocarKey = 'trocar-' + s.id;
          const cachedSeriesPhoto = localStorage.getItem('user_photo_' + trocarKey) || s.imageSrc || '';
          const initialSeriesSrc = cachedSeriesPhoto;

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
                  <button onclick="triggerPhotoUpload('\${trocarKey}', 'fulbright-trocares', '\${s.title}')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#006DFF] border border-blue-200 text-xs font-bold transition-all cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <span>\${initialSeriesSrc ? 'Cambiar foto' : 'Subir foto'}</span>
                  </button>
                  \${initialSeriesSrc ? \`
                    <button onclick="removeUploadedPhoto('\${trocarKey}', 'fulbright-trocares')" class="px-2 py-1 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold border border-slate-200 cursor-pointer" title="Quitar">✕</button>
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
                <p class="text-xs text-slate-500 font-medium">Sin fotografía asignada para \${s.title}</p>
                <button onclick="triggerPhotoUpload('\${trocarKey}', 'fulbright-trocares', '\${s.title}')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#001F3F] border border-slate-200 hover:border-blue-300 text-xs font-bold transition-all shadow-2xs cursor-pointer">
                  <svg class="w-3.5 h-3.5 text-[#006DFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  <span>Subir fotografía de \${s.title}</span>
                </button>
              </div>
            \` : '')}

            <!-- Sections within series -->
            <div class="space-y-6">
              \${(s.sections || []).map(sec => \`
                <div class="space-y-2.5">
                  <h4 class="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                    <span>\${sec.subTitle}</span>
                  </h4>
                  <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="bg-[#00A896] text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-white border-b border-teal-700">
                          \${sec.headers.map(h => \`<th class="py-3 px-4 sm:px-6">\${h}</th>\`).join("")}
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
                        \${sec.rows.map(row => \`
                          <tr class="hover:bg-teal-50/40 transition-colors">
                            \${row.cols ? row.cols.map((col, cIdx) => \`
                              <td class="py-3 px-4 sm:px-6 \${cIdx === 0 ? "font-mono font-bold text-[#001F3F]" : (cIdx === row.cols.length - 1 ? "font-mono font-bold text-teal-700" : "font-semibold text-slate-700")}">\${col}</td>
                            \`).join("") : \`
                              <td class="py-3 px-4 sm:px-6 font-mono font-bold text-[#001F3F]">\${row.model || "-"}</td>
                              <td class="py-3 px-4 sm:px-6 font-semibold text-slate-700">\${row.spec || "-"}</td>
                              <td class="py-3 px-4 sm:px-6 text-slate-600 font-sans">\${row.desc || "-"}</td>
                            \`}
                          </tr>
                        \`).join("")}
                      </tbody>
                    </table>
                  </div>
                </div>
              \`).join("")}
            </div>
          </div>
          \`;
        };

        trocarSeriesHtml = \`
          <!-- TABLAS DE SERIES OFICIALES TRÓCARES -->
          <div class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 class="text-lg font-black text-[#001F3F]">Configuraciones y Modelos Disponibles</h3>
                <p class="text-xs text-slate-500">Selecciona una serie para ver sus especificaciones y fotografía técnica</p>
              </div>
              <div class="flex flex-wrap gap-1.5" id="trocar-tab-buttons">
                <button onclick="setTrocarSeriesFilter('all')" id="tab-trocar-all" class="px-3.5 py-1.5 rounded-xl bg-[#001F3F] text-white text-xs font-bold shadow-xs cursor-pointer transition-all border border-transparent">
                  Todas las series
                </button>
                \${seriesList.map(s => \`
                  <button onclick="setTrocarSeriesFilter('\${s.id}')" id="tab-trocar-\${s.id}" class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#001F3F] text-xs font-bold cursor-pointer transition-all border border-slate-200">
                    \${s.title}
                  </button>
                \`).join("")}
              </div>
            </div>
            \${seriesList.map(s => renderSeriesCard(s)).join("")}
          </div>
        \`;
      }
      `;

  html = html.substring(0, trocarSeriesStart) + newTrocarSeriesLogic + html.substring(trocarSeriesEnd);
}

// 5. Update renderSingleTable so Lunar U and Hyperforce reloads have upload buttons
const reloadTableStart = html.indexOf("const isHyperForce = p.id === 'fulbright-hyper-force';");
if (reloadTableStart !== -1) {
  // Add upload button in reload card header
  html = html.replace(
    /\${\(initialReloadSrc\) \? `[\s\S]*?<!-- FOTOGRAFÍA OFICIAL DE RECARGAS TAL CUAL -->[\s\S]*?<\/div>\s*<\/div>\s*` : is3dTile \? `/,
    `\${(initialReloadSrc) ? \`
                <!-- FOTOGRAFÍA OFICIAL DE RECARGAS TAL CUAL -->
                <div class="space-y-2.5" id="reload-img-block-\${t.id || reloadKey}">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full \${t.hasAntiSlippery ? "bg-teal-600" : "bg-blue-600"}"></span>
                      <span class="text-xs font-mono font-bold uppercase tracking-wider text-[#001F3F]">\${t.imageTitle || ("Fotografía Oficial de Recargas · " + t.name)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-mono font-bold \${t.hasAntiSlippery ? "text-teal-800 bg-teal-50 border border-teal-200" : "text-blue-800 bg-blue-50 border border-blue-200"} px-2.5 py-0.5 rounded-full w-fit">
                        \${t.imageBadge || (rowsList.length + " Códigos de Color")}
                      </span>
                      \${(isLunarU || isLunarUPro) ? \`
                        <button onclick="triggerPhotoUpload('\${reloadKey === 'flatdeck' ? 'lunaru-flatdeck' : 'lunaru-fulgrip'}', '\${p.id}', '\${t.name}')" class="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#006DFF] text-xs font-bold transition-all cursor-pointer border border-blue-200">
                          Cambiar foto
                        </button>
                      \` : ''}
                    </div>
                  </div>
                  <div id="reload-wrapper-\${t.id || reloadKey}" class="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-4 sm:p-6 flex flex-col items-center justify-center relative">
                    <img id="img-\${t.id || reloadKey}" src="\${initialReloadSrc}" alt="\${t.name}" onerror="this.onerror=null; const blk=document.getElementById('reload-img-block-\${t.id || reloadKey}'); if(blk) blk.style.display='none';" class="w-full max-h-72 object-contain hover:scale-[1.01] transition-transform duration-300" />
                  </div>
                </div>
              \` : is3dTile ? \``
  );
}

fs.writeFileSync('producto.html', html, 'utf8');
fs.writeFileSync('dist/producto.html', html, 'utf8');
console.log('producto.html and dist/producto.html updated with complete upload system!');
