const fs = require('fs');

const modalCode = `function SecurityPolicyModal({ isOpen, onClose, policyStatus, onRefreshStatus }) {
  const [currentPage, setCurrentPage] = P.useState(1);
  const [viewMode, setViewMode] = P.useState('continuous');
  const [zoom, setZoom] = P.useState(1.0);
  const [uploading, setUploading] = P.useState(false);
  const [uploadError, setUploadError] = P.useState('');
  const [uploadSuccess, setUploadSuccess] = P.useState(false);
  const [dragOver, setDragOver] = P.useState(false);
  const [confirmDelete, setConfirmDelete] = P.useState(false);
  const [showUploader, setShowUploader] = P.useState(false);
  const [activeVisiblePage, setActiveVisiblePage] = P.useState(1);

  const modalFileInputRef = P.useRef(null);
  const scrollViewportRef = P.useRef(null);
  const modalOverlayRef = P.useRef(null);

  const hasDoc = Boolean(policyStatus && policyStatus.exists);
  const totalPages = Math.max(1, (policyStatus && policyStatus.pageCount) || 1);

  const pageUrls = (policyStatus && policyStatus.pages && policyStatus.pages.length > 0)
    ? policyStatus.pages
    : Array.from({ length: totalPages }, (_, i) => \`/assets/page-\${i + 1}.png?v=\${(policyStatus && policyStatus.updatedAt) || Date.now()}\`);

  const activePageUrl = pageUrls[Math.min(currentPage - 1, pageUrls.length - 1)] || '/assets/page-1.png';

  P.useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setUploadError('');
      setConfirmDelete(false);
      setShowUploader(false);
      setCurrentPage(1);
      setActiveVisiblePage(1);

      // Ensure viewport starts at the top
      setTimeout(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTop = 0;
        }
      }, 50);

      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  // Native wheel handler to guarantee mouse wheel and trackpad scroll always work
  P.useEffect(() => {
    if (!isOpen) return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const onWheel = (e) => {
      viewport.scrollTop += e.deltaY;
    };

    viewport.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      viewport.removeEventListener('wheel', onWheel);
    };
  }, [isOpen]);

  // Keyboard navigation
  P.useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      const viewport = scrollViewportRef.current;
      if (!viewport) return;

      if (e.key === 'ArrowDown') {
        viewport.scrollTop += 150;
      } else if (e.key === 'ArrowUp') {
        viewport.scrollTop -= 150;
      } else if (e.key === 'PageDown' || e.key === ' ') {
        viewport.scrollTop += 500;
      } else if (e.key === 'PageUp') {
        viewport.scrollTop -= 500;
      } else if (e.key === 'Home') {
        viewport.scrollTop = 0;
      } else if (e.key === 'End') {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleScroll = (e) => {
    const target = e.currentTarget;
    if (viewMode === 'continuous') {
      const scrollPos = target.scrollTop + 200;
      for (let i = 1; i <= totalPages; i++) {
        const el = document.getElementById('policy-page-' + i);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveVisiblePage(i);
            break;
          }
        }
      }
    }
  };

  const scrollToTop = () => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollByAmount = (amount) => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollBy({ top: amount, behavior: 'smooth' });
    }
  };

  const scrollToPage = (pageNum) => {
    if (viewMode === 'continuous') {
      const el = document.getElementById('policy-page-' + pageNum);
      if (el && scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({ top: el.offsetTop - 15, behavior: 'smooth' });
        setActiveVisiblePage(pageNum);
      }
    } else {
      setCurrentPage(pageNum);
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext)) || file.type.includes('pdf') || file.type.includes('image');
    if (!isValid) {
      setUploadError('Por favor selecciona un archivo PDF (.pdf), imagen (.png, .jpg, .webp) o documento (.docx)');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await fetch('/api/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, filename: file.name })
          });
          const data = await res.json();
          if (data.success) {
            setUploadSuccess(true);
            setShowUploader(false);
            if (onRefreshStatus) await onRefreshStatus();
            setTimeout(() => setUploadSuccess(false), 4000);
          } else {
            setUploadError(data.error || 'No se pudo guardar el documento.');
          }
        } catch (err) {
          setUploadError('Error al subir: ' + err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError('Error al leer el archivo: ' + err.message);
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDelete = async () => {
    try {
      setUploading(true);
      const res = await fetch('/api/delete-policy', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setConfirmDelete(false);
        setShowUploader(true);
        if (onRefreshStatus) await onRefreshStatus();
      } else {
        setUploadError(data.error || 'No se pudo eliminar el documento.');
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadPdf = () => {
    const link = document.createElement('a');
    link.href = '/download-politica-seguridad';
    link.download = 'POLÍTICA DE SEGURIDAD.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInNewTab = () => {
    window.open('/politica-de-seguridad-ens.pdf', '_blank');
  };

  const scaledMaxWidth = Math.round(860 * zoom);

  return u.jsxDEV('div', {
    ref: modalOverlayRef,
    className: 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md',
    style: { zIndex: 9999 },
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); },
    children: [
      u.jsxDEV('input', {
        type: 'file',
        ref: modalFileInputRef,
        accept: '.pdf,application/pdf,image/png,image/jpeg,image/webp,.docx',
        className: 'hidden',
        onChange: handleFileChange
      }, void 0, !1),
      u.jsxDEV('div', {
        className: 'relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100',
        style: {
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        },
        children: [
          // Custom scrollbar CSS
          u.jsxDEV('style', {
            children: \`
              #policy-document-scroll-viewport {
                scrollbar-width: thin;
                scrollbar-color: #00BFBF #0f172a;
              }
              #policy-document-scroll-viewport::-webkit-scrollbar {
                width: 12px;
                height: 12px;
              }
              #policy-document-scroll-viewport::-webkit-scrollbar-track {
                background: #0f172a;
                border-radius: 8px;
              }
              #policy-document-scroll-viewport::-webkit-scrollbar-thumb {
                background: #00BFBF;
                border-radius: 8px;
                border: 2px solid #0f172a;
              }
              #policy-document-scroll-viewport::-webkit-scrollbar-thumb:hover {
                background: #00e5e5;
              }
            \`
          }, void 0, !1),

          // Header (ALWAYS VISIBLE AT TOP)
          u.jsxDEV('div', {
            className: 'bg-[#001F3F] border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 shrink-0 select-none',
            children: [
              u.jsxDEV('div', {
                className: 'flex items-center gap-3 min-w-0',
                children: [
                  u.jsxDEV('div', {
                    className: 'w-10 h-10 rounded-xl bg-gradient-to-br from-[#004080] to-[#00BFBF] flex items-center justify-center shadow-md shrink-0',
                    children: u.jsxDEV('svg', {
                      className: 'w-5 h-5 text-white',
                      fill: 'none',
                      stroke: 'currentColor',
                      viewBox: '0 0 24 24',
                      children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
                    }, void 0, !1)
                  }, void 0, !1),
                  u.jsxDEV('div', {
                    className: 'min-w-0',
                    children: [
                      u.jsxDEV('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          u.jsxDEV('span', { className: 'text-[10px] sm:text-[11px] font-mono uppercase text-[#00BFBF] font-extrabold tracking-wider', children: 'DOCUMENTO OFICIAL' }, void 0, !1),
                          hasDoc ? u.jsxDEV('span', { className: 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono hidden sm:inline-block', children: \`\${totalPages} PÁGINAS\` }, void 0, !1) : null
                        ]
                      }, void 0, !0),
                      u.jsxDEV('h3', {
                        className: 'text-sm sm:text-base font-black text-white truncate',
                        children: 'Política de Seguridad de la Información (ENS)'
                      }, void 0, !1)
                    ]
                  }, void 0, !0)
                ]
              }, void 0, !0),
              u.jsxDEV('div', {
                className: 'flex items-center gap-2 shrink-0',
                children: [
                  hasDoc ? u.jsxDEV('button', {
                    onClick: openInNewTab,
                    className: 'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors',
                    title: 'Abrir documento en pestaña nueva',
                    children: [
                      u.jsxDEV('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' }) }, void 0, !1),
                      u.jsxDEV('span', { children: 'Pestaña nueva' }, void 0, !1)
                    ]
                  }, void 0, !0) : null,
                  u.jsxDEV('button', {
                    onClick: onClose,
                    className: 'p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer',
                    title: 'Cerrar ventana',
                    children: u.jsxDEV('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' }) }, void 0, !1)
                  }, void 0, !1)
                ]
              }, void 0, !0)
            ]
          }, void 0, !0),

          // Upload notification banner
          uploadSuccess ? u.jsxDEV('div', {
            className: 'bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-inner shrink-0',
            children: [
              u.jsxDEV('div', { className: 'flex items-center gap-2', children: [
                u.jsxDEV('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' }) }, void 0, !1),
                u.jsxDEV('span', { children: '¡Documento subido y procesado con éxito!' }, void 0, !1)
              ] }, void 0, !0),
              u.jsxDEV('button', { onClick: () => setUploadSuccess(false), className: 'text-white/80 hover:text-white cursor-pointer', children: '×' }, void 0, !1)
            ]
          }, void 0, !0) : null,

          // Upload error banner
          uploadError ? u.jsxDEV('div', {
            className: 'bg-red-600/90 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-inner shrink-0',
            children: [
              u.jsxDEV('div', { className: 'flex items-center gap-2', children: [
                u.jsxDEV('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }) }, void 0, !1),
                u.jsxDEV('span', { children: uploadError }, void 0, !1)
              ] }, void 0, !0),
              u.jsxDEV('button', { onClick: () => setUploadError(''), className: 'text-white/80 hover:text-white cursor-pointer', children: '×' }, void 0, !1)
            ]
          }, void 0, !0) : null,

          // Secondary Toolbar (ALWAYS VISIBLE BELOW HEADER)
          (hasDoc && !showUploader) ? u.jsxDEV('div', {
            className: 'bg-slate-800/95 border-b border-slate-700/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shrink-0 select-none',
            children: [
              // Left: View Mode Toggle & Navigation
              u.jsxDEV('div', {
                className: 'flex items-center gap-2 sm:gap-3 flex-wrap',
                children: [
                  totalPages > 1 ? u.jsxDEV('div', {
                    className: 'bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 flex items-center shadow-xs',
                    children: [
                      u.jsxDEV('button', {
                        onClick: () => setViewMode('continuous'),
                        className: \`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer \${viewMode === 'continuous' ? 'bg-[#00BFBF] text-[#001F3F] shadow-sm' : 'text-slate-300 hover:text-white'}\`,
                        children: 'Todas las páginas (Scroll)'
                      }, void 0, !1),
                      u.jsxDEV('button', {
                        onClick: () => setViewMode('single'),
                        className: \`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer \${viewMode === 'single' ? 'bg-[#00BFBF] text-[#001F3F] shadow-sm' : 'text-slate-300 hover:text-white'}\`,
                        children: 'Página por página'
                      }, void 0, !1)
                    ]
                  }, void 0, !0) : null,

                  // Page selector
                  totalPages > 1 ? u.jsxDEV('div', {
                    className: 'flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px]',
                    children: [
                      u.jsxDEV('span', { className: 'text-slate-400 font-mono hidden sm:inline', children: 'Saltar a:' }, void 0, !1),
                      u.jsxDEV('select', {
                        value: viewMode === 'continuous' ? activeVisiblePage : currentPage,
                        onChange: (e) => scrollToPage(Number(e.target.value)),
                        className: 'bg-transparent text-[#00BFBF] font-mono text-[11px] font-bold border-0 cursor-pointer focus:outline-none',
                        children: Array.from({ length: totalPages }, (_, i) => u.jsxDEV('option', {
                          value: i + 1,
                          className: 'bg-slate-900 text-white',
                          children: \`Página \${i + 1} de \${totalPages}\`
                        }, \`opt-page-\${i + 1}\`, !1, { fileName: '/app/applet/src/components/SecurityPolicyModal.tsx', lineNumber: 180 + i, columnNumber: 27 }, this))
                      }, void 0, !0)
                    ]
                  }, void 0, !0) : null
                ]
              }, void 0, !0),

              // Scroll navigation buttons (Up / Down)
              u.jsxDEV('div', {
                className: 'flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700',
                children: [
                  u.jsxDEV('button', {
                    onClick: () => scrollByAmount(-400),
                    className: 'p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold',
                    title: 'Desplazar hacia arriba',
                    children: [
                      u.jsxDEV('svg', { className: 'w-3.5 h-3.5 text-[#00BFBF]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5', d: 'M5 15l7-7 7-7' }) }, void 0, !1),
                      u.jsxDEV('span', { className: 'hidden md:inline', children: 'Arriba' }, void 0, !1)
                    ]
                  }, void 0, !0),
                  u.jsxDEV('span', { className: 'text-slate-600 px-0.5', children: '|' }, void 0, !1),
                  u.jsxDEV('button', {
                    onClick: () => scrollByAmount(400),
                    className: 'p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold',
                    title: 'Desplazar hacia abajo',
                    children: [
                      u.jsxDEV('span', { className: 'hidden md:inline', children: 'Abajo' }, void 0, !1),
                      u.jsxDEV('svg', { className: 'w-3.5 h-3.5 text-[#00BFBF]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5', d: 'M19 9l-7 7-7-7' }) }, void 0, !1)
                    ]
                  }, void 0, !0)
                ]
              }, void 0, !0),

              // Right: Zoom controls & actions
              u.jsxDEV('div', {
                className: 'flex items-center gap-2',
                children: [
                  // Zoom controls
                  u.jsxDEV('div', {
                    className: 'flex items-center gap-1 bg-slate-900/90 px-1.5 py-1 rounded-lg border border-slate-700',
                    children: [
                      u.jsxDEV('button', {
                        onClick: () => setZoom(z => Math.max(0.65, +(z - 0.15).toFixed(2))),
                        className: 'p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer',
                        title: 'Alejar',
                        children: u.jsxDEV('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 12H4' }) }, void 0, !1)
                      }, void 0, !1),
                      u.jsxDEV('span', { className: 'font-mono text-[11px] min-w-[42px] text-center font-bold text-[#00BFBF]', children: \`\${Math.round(zoom * 100)}%\` }, void 0, !1),
                      u.jsxDEV('button', {
                        onClick: () => setZoom(z => Math.min(1.6, +(z + 0.15).toFixed(2))),
                        className: 'p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer',
                        title: 'Acercar',
                        children: u.jsxDEV('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4v16m8-8H4' }) }, void 0, !1)
                      }, void 0, !1),
                      u.jsxDEV('button', {
                        onClick: () => setZoom(1.0),
                        className: 'p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer ml-0.5',
                        title: 'Restablecer escala (100%)',
                        children: u.jsxDEV('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' }) }, void 0, !1)
                      }, void 0, !1)
                    ]
                  }, void 0, !0),

                  // Upload / Change button
                  u.jsxDEV('button', {
                    onClick: () => modalFileInputRef.current && modalFileInputRef.current.click(),
                    className: 'px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5',
                    title: 'Subir otra versión o cambiar formato (PDF, PNG, JPG, DOCX)',
                    children: [
                      u.jsxDEV('svg', { className: 'w-3.5 h-3.5 text-[#00BFBF]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' }) }, void 0, !1),
                      u.jsxDEV('span', { className: 'hidden sm:inline', children: 'Cambiar archivo' }, void 0, !1)
                    ]
                  }, void 0, !0),

                  // Delete button
                  confirmDelete ? u.jsxDEV('div', {
                    className: 'flex items-center gap-1',
                    children: [
                      u.jsxDEV('button', {
                        onClick: handleDelete,
                        className: 'px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer',
                        children: '¿Borrar?'
                      }, void 0, !1),
                      u.jsxDEV('button', {
                        onClick: () => setConfirmDelete(false),
                        className: 'px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition-colors cursor-pointer',
                        children: 'No'
                      }, void 0, !1)
                    ]
                  }, void 0, !0) : u.jsxDEV('button', {
                    onClick: () => setConfirmDelete(true),
                    className: 'p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer',
                    title: 'Eliminar documento actual',
                    children: u.jsxDEV('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }) }, void 0, !1)
                  }, void 0, !1)
                ]
              }, void 0, !0)
            ]
          }, void 0, !0) : null,

          // Main Content Viewport (EXPLICIT FLEX-1 AND OVERFLOW-Y-AUTO)
          (hasDoc && !showUploader) ? u.jsxDEV('div', {
            ref: scrollViewportRef,
            id: 'policy-document-scroll-viewport',
            onScroll: handleScroll,
            className: 'w-full p-3 sm:p-6 lg:p-8 bg-slate-950/90 flex flex-col items-center justify-start relative select-text',
            style: {
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            },
            children: [
              viewMode === 'continuous' ? (
                // Continuous Mode: All 12 pages stacked naturally, scrollable from top to bottom
                u.jsxDEV('div', {
                  style: { maxWidth: \`\${scaledMaxWidth}px\`, width: '100%' },
                  className: 'space-y-8 flex flex-col items-center pb-16',
                  children: pageUrls.map((url, idx) => u.jsxDEV('div', {
                    id: \`policy-page-\${idx + 1}\`,
                    className: 'bg-white rounded-xl sm:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3 sm:p-5 border border-slate-300 w-full relative',
                    children: [
                      u.jsxDEV('div', {
                        className: 'flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 text-[11px] font-mono text-slate-600',
                        children: [
                          u.jsxDEV('span', { className: 'font-bold text-[#001F3F] flex items-center gap-2', children: [
                            u.jsxDEV('span', { className: 'w-2 h-2 rounded-full bg-[#00BFBF]' }, void 0, !1),
                            'POLÍTICA DE SEGURIDAD DE LA INFORMACIÓN — ENS'
                          ] }, void 0, !0),
                          u.jsxDEV('span', { className: 'bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full font-bold shadow-xs', children: \`Página \${idx + 1} de \${totalPages}\` }, void 0, !1)
                        ]
                      }, void 0, !0),
                      u.jsxDEV('img', {
                        src: url,
                        alt: \`Página \${idx + 1} de \${totalPages}\`,
                        className: 'w-full h-auto rounded block shadow-xs',
                        loading: idx < 2 ? 'eager' : 'lazy'
                      }, void 0, !1),
                      u.jsxDEV('div', {
                        className: 'mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2 text-[10px] text-slate-500 font-mono',
                        children: [
                          u.jsxDEV('span', { children: 'FIMECORP International S.L. • Documento Oficial' }, void 0, !1),
                          u.jsxDEV('div', {
                            className: 'flex items-center gap-2',
                            children: [
                              u.jsxDEV('span', { className: 'font-bold', children: \`Pág. \${idx + 1} / \${totalPages}\` }, void 0, !1),
                              idx < totalPages - 1 ? u.jsxDEV('button', {
                                onClick: () => scrollToPage(idx + 2),
                                className: 'px-2 py-0.5 rounded bg-slate-100 hover:bg-[#00BFBF] hover:text-[#001F3F] text-slate-700 transition-colors cursor-pointer font-sans font-bold flex items-center gap-1',
                                children: [
                                  u.jsxDEV('span', { children: 'Siguiente' }, void 0, !1),
                                  u.jsxDEV('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' }) }, void 0, !1)
                                ]
                              }, void 0, !0) : null
                            ]
                          }, void 0, !0)
                        ]
                      }, void 0, !0)
                    ]
                  }, \`policy-page-item-\${idx + 1}\`, !0, { fileName: '/app/applet/src/components/SecurityPolicyModal.tsx', lineNumber: 250 + idx, columnNumber: 21 }, this))
                }, void 0, !1)
              ) : (
                // Single Page Mode
                u.jsxDEV('div', {
                  style: { maxWidth: \`\${scaledMaxWidth}px\`, width: '100%' },
                  className: 'flex flex-col items-center pb-8',
                  children: u.jsxDEV('div', {
                    className: 'bg-white rounded-xl sm:rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.65)] p-3 sm:p-5 border border-slate-300 w-full relative',
                    children: [
                      u.jsxDEV('div', {
                        className: 'flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 text-[11px] font-mono text-slate-600',
                        children: [
                          u.jsxDEV('span', { className: 'font-bold text-[#001F3F] flex items-center gap-2', children: [
                            u.jsxDEV('span', { className: 'w-2 h-2 rounded-full bg-[#00BFBF]' }, void 0, !1),
                            'POLÍTICA DE SEGURIDAD — ENS'
                          ] }, void 0, !0),
                          u.jsxDEV('span', { className: 'bg-[#001F3F] text-white px-2.5 py-0.5 rounded-full font-bold text-[10px]', children: \`Página \${currentPage} de \${totalPages}\` }, void 0, !1)
                        ]
                      }, void 0, !0),
                      u.jsxDEV('img', {
                        src: activePageUrl,
                        alt: \`Página \${currentPage} de \${totalPages}\`,
                        className: 'w-full h-auto rounded block shadow-xs',
                        loading: 'eager'
                      }, void 0, !1),
                      u.jsxDEV('div', {
                        className: 'mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono',
                        children: [
                          u.jsxDEV('span', { children: 'FIMECORP International S.L. • Documento Oficial' }, void 0, !1),
                          u.jsxDEV('span', { children: \`Pág. \${currentPage} / \${totalPages}\` }, void 0, !1)
                        ]
                      }, void 0, !0)
                    ]
                  }, void 0, !0)
                }, void 0, !1)
              ),

              // Floating Controls Bar (Sticky inside viewport)
              u.jsxDEV('div', {
                className: 'sticky bottom-4 z-30 flex items-center gap-2 bg-slate-900/95 border border-[#00BFBF]/40 backdrop-blur-md px-3.5 py-2 rounded-full shadow-2xl mt-4 select-none',
                children: [
                  u.jsxDEV('button', {
                    onClick: () => scrollByAmount(-350),
                    className: 'p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer',
                    title: 'Desplazar arriba',
                    children: u.jsxDEV('svg', { className: 'w-4 h-4 text-[#00BFBF]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5', d: 'M5 15l7-7 7-7' }) }, void 0, !1)
                  }, void 0, !1),
                  u.jsxDEV('span', {
                    className: 'font-mono text-xs font-bold text-white px-2',
                    children: viewMode === 'continuous' ? \`Pág. \${activeVisiblePage} / \${totalPages}\` : \`Pág. \${currentPage} / \${totalPages}\`
                  }, void 0, !1),
                  u.jsxDEV('button', {
                    onClick: () => scrollByAmount(350),
                    className: 'p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer',
                    title: 'Desplazar abajo',
                    children: u.jsxDEV('svg', { className: 'w-4 h-4 text-[#00BFBF]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5', d: 'M19 9l-7 7-7-7' }) }, void 0, !1)
                  }, void 0, !1),
                  u.jsxDEV('div', { className: 'w-px h-4 bg-slate-700 mx-1' }, void 0, !1),
                  u.jsxDEV('button', {
                    onClick: scrollToTop,
                    className: 'px-2.5 py-1 rounded-full bg-[#00BFBF] hover:bg-[#00e5e5] text-[#001F3F] text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1',
                    title: 'Volver a la primera página',
                    children: [
                      u.jsxDEV('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5', d: 'M5 10l7-7m0 0l7 7m-7-7v18' }) }, void 0, !1),
                      u.jsxDEV('span', { children: 'Inicio' }, void 0, !1)
                    ]
                  }, void 0, !0)
                ]
              }, void 0, !0)
            ]
          }, void 0, !0) : (
            // Upload Dropzone State
            u.jsxDEV('div', {
              className: 'w-full p-6 sm:p-12 overflow-y-auto flex items-center justify-center bg-slate-950/70 select-none',
              style: { flex: '1 1 0%', minHeight: 0 },
              onDragOver: (e) => { e.preventDefault(); setDragOver(true); },
              onDragLeave: (e) => { e.preventDefault(); setDragOver(false); },
              onDrop: handleDrop,
              children: u.jsxDEV('div', {
                className: [
                  'max-w-xl w-full p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-5',
                  dragOver ? 'border-[#00BFBF] bg-[#00BFBF]/10 scale-[1.02]' : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                ].join(' '),
                children: [
                  u.jsxDEV('div', {
                    className: 'w-20 h-20 rounded-2xl bg-gradient-to-br from-[#004080] to-[#00BFBF]/30 border border-[#00BFBF]/40 flex items-center justify-center text-[#00BFBF] shadow-lg shadow-[#00BFBF]/10',
                    children: uploading ? u.jsxDEV('svg', {
                      className: 'w-10 h-10 animate-spin text-[#00BFBF]',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      children: [
                        u.jsxDEV('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }, void 0, !1),
                        u.jsxDEV('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8v8H4z' }, void 0, !1)
                      ]
                    }, void 0, !0) : u.jsxDEV('svg', {
                      className: 'w-10 h-10',
                      fill: 'none',
                      stroke: 'currentColor',
                      viewBox: '0 0 24 24',
                      children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.8', d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' })
                    }, void 0, !1)
                  }, void 0, !1),
                  u.jsxDEV('div', {
                    className: 'space-y-2',
                    children: [
                      u.jsxDEV('h4', { className: 'text-lg font-bold text-white', children: uploading ? 'Guardando y procesando documento...' : 'Subir Política de Seguridad' }, void 0, !1),
                      u.jsxDEV('p', {
                        className: 'text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed',
                        children: 'Arrastra y suelta tu archivo aquí o haz clic en el botón inferior para seleccionarlo desde tu equipo.'
                      }, void 0, !1),
                      u.jsxDEV('div', {
                        className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-[#00BFBF]',
                        children: 'Formatos admitidos: PDF (.pdf), Imágenes (PNG, JPG, WEBP) o Word (.docx)'
                      }, void 0, !1)
                    ]
                  }, void 0, !0),
                  u.jsxDEV('button', {
                    onClick: () => modalFileInputRef.current && modalFileInputRef.current.click(),
                    disabled: uploading,
                    className: 'px-6 py-3 rounded-xl bg-gradient-to-r from-[#004080] to-[#00BFBF] hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#00BFBF]/20 cursor-pointer transition-all flex items-center gap-2',
                    children: [
                      u.jsxDEV('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4v16m8-8H4' }) }, void 0, !1),
                      u.jsxDEV('span', { children: 'Seleccionar archivo' }, void 0, !1)
                    ]
                  }, void 0, !0),
                  hasDoc ? u.jsxDEV('button', {
                    onClick: () => setShowUploader(false),
                    className: 'text-xs text-slate-400 hover:text-white underline cursor-pointer mt-1',
                    children: 'Volver al documento actual'
                  }, void 0, !1) : null
                ]
              }, void 0, !0)
            }, void 0, !1)
          ),

          // Footer (ALWAYS VISIBLE AT BOTTOM)
          u.jsxDEV('div', {
            className: 'bg-[#001F3F] p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 select-none',
            children: [
              u.jsxDEV('div', {
                className: 'text-xs text-slate-300 font-sans flex items-center gap-2 text-center sm:text-left',
                children: [
                  u.jsxDEV('span', { className: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0' }, void 0, !1),
                  u.jsxDEV('span', {
                    children: [
                      'Documento oficial de Política de Seguridad • ',
                      u.jsxDEV('strong', { className: 'text-white', children: 'Fimecorp S.L.' }, void 0, !1),
                      hasDoc ? \` (\${totalPages} \${totalPages === 1 ? 'página' : 'páginas'})\` : ''
                    ]
                  }, void 0, !0)
                ]
              }, void 0, !0),
              u.jsxDEV('div', {
                className: 'flex items-center gap-2.5 w-full sm:w-auto justify-end',
                children: [
                  hasDoc ? u.jsxDEV('button', {
                    onClick: downloadPdf,
                    className: 'px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors',
                    title: 'Descargar documento oficial en formato PDF',
                    children: [
                      u.jsxDEV('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }) }, void 0, !1),
                      u.jsxDEV('span', { children: 'Descargar PDF' }, void 0, !1)
                    ]
                  }, void 0, !0) : null,
                  hasDoc ? u.jsxDEV('button', {
                    onClick: () => window.print(),
                    className: 'px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors',
                    children: [
                      u.jsxDEV('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: u.jsxDEV('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' }) }, void 0, !1),
                      u.jsxDEV('span', { children: 'Imprimir' }, void 0, !1)
                    ]
                  }, void 0, !0) : null,
                  u.jsxDEV('button', {
                    onClick: onClose,
                    className: 'px-5 py-2 bg-[#00BFBF] hover:bg-[#00a3a3] text-[#001F3F] font-black rounded-xl text-xs transition-colors cursor-pointer shadow-md',
                    children: 'Cerrar'
                  }, void 0, !1)
                ]
              }, void 0, !0)
            ]
          }, void 0, !0)
        ]
      }, void 0, !0)
    ]
  }, void 0, !0);
}`;

// Validate syntax
try {
  new Function(modalCode);
  console.log('modalCode syntax is 100% valid!');
} catch (e) {
  console.error('Syntax error in modalCode:', e);
  process.exit(1);
}

// Update files
const targets = [
  'assets/index-v1788893591132.js',
  'dist/assets/index-v1788893591132.js'
];

targets.forEach(targetPath => {
  const code = fs.readFileSync(targetPath, 'utf8');
  const secStart = code.indexOf('function SecurityPolicyModal(');
  const f8Start = code.indexOf('function $8(');

  if (secStart === -1 || f8Start === -1) {
    console.error('Could not find boundaries in', targetPath);
    process.exit(1);
  }

  const updatedCode = code.slice(0, secStart) + modalCode + code.slice(f8Start);
  fs.writeFileSync(targetPath, updatedCode, 'utf8');
  console.log('Successfully updated modal in:', targetPath);
});
