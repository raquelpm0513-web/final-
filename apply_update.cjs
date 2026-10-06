const fs = require("fs");
let html = fs.readFileSync("/producto.html", "utf8");

// 1. Update renderSingleTable and reloadsHtml
const oldReloadsStart = html.indexOf("// Compatible Reloads Table HTML");
const oldReloadsEnd = html.indexOf("// Window reference for modal", oldReloadsStart);

if (oldReloadsStart === -1 || oldReloadsEnd === -1) {
  console.error("Could not find reloads block in producto.html");
  process.exit(1);
}

const newReloadsBlock = `// Compatible Reloads Table HTML
      let reloadsHtml = "";
      if (p.compatibleReloads) {
        const r = p.compatibleReloads;
        const defaultLegends = [
          { name: "Grey", bgClass: "bg-[#6B7280] text-white" },
          { name: "White", bgClass: "bg-white text-slate-800 border border-slate-300" },
          { name: "Blue", bgClass: "bg-[#3B82F6] text-white" },
          { name: "Gold", bgClass: "bg-[#EAB308] text-slate-900 font-bold" },
          { name: "Green", bgClass: "bg-[#10B981] text-white" },
          { name: "Black", bgClass: "bg-black text-white" }
        ];

        const getLegendPills = (customLegends) => (customLegends || r.legendColors || defaultLegends).map(c => \`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold \${c.bgClass}">\${c.name}</span>\`).join("");
        const hasRowsCol = !!r.hasRows;

        // Visual cartridge preview (as shown in official brochures)
        const renderCartridgeSvg = (colorName, isAntiSlippery) => {
          const colors = {
            Grey: { body: "#71717A", stroke: "#52525B", cap: "#A1A1AA", text: "#71717A", holes: "#3F3F46" },
            White: { body: "#F8FAFC", stroke: "#CBD5E1", cap: "#E2E8F0", text: "#475569", holes: "#94A3B8" },
            Blue: { body: "#2563EB", stroke: "#1D4ED8", cap: "#93C5FD", text: "#2563EB", holes: "#1E40AF" },
            Gold: { body: "#D97706", stroke: "#B45309", cap: "#FDE68A", text: "#D97706", holes: "#92400E" },
            Green: { body: "#059669", stroke: "#047857", cap: "#A7F3D0", text: "#059669", holes: "#065F46" },
            Black: { body: "#18181B", stroke: "#09090B", cap: "#71717A", text: "#18181B", holes: "#000000" },
            Tan: { body: "#854D0E", stroke: "#713F12", cap: "#CA8A04", text: "#854D0E", holes: "#451A03" },
            Purple: { body: "#8B5CF6", stroke: "#7C3AED", cap: "#C4B5FD", text: "#7C3AED", holes: "#5B21B6" }
          };
          const c = colors[colorName] || { body: "#64748B", stroke: "#475569", cap: "#94A3B8", text: "#334155", holes: "#1E293B" };
          const gripPattern = isAntiSlippery 
            ? \`<path d="M12 6h86M12 10h86M12 14h86" stroke="\${c.holes}" stroke-width="0.9" stroke-dasharray="1 3.5" opacity="0.95"/>\`
            : \`<path d="M12 7h86M12 13h86" stroke="\${c.holes}" stroke-width="0.75" stroke-dasharray="2 3.5" opacity="0.6"/>\`;

          return \`
            <div class="flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all text-center">
              <svg viewBox="0 0 125 22" class="w-full max-w-[140px] h-5 sm:h-6 drop-shadow-2xs" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="2" width="108" height="18" rx="4" fill="\${c.body}" stroke="\${c.stroke}" stroke-width="1.2"/>
                <rect x="106" y="5" width="14" height="12" rx="2" fill="\${c.cap}" stroke="#475569" stroke-width="0.8"/>
                <line x1="8" y1="11" x2="100" y2="11" stroke="\${c.holes}" stroke-width="1.2" stroke-linecap="round"/>
                \${gripPattern}
              </svg>
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full" style="background-color: \${c.body}; border: \${colorName === "White" ? "1px solid #CBD5E1" : "none"};"></span>
                <span class="text-[11px] font-extrabold uppercase tracking-wider" style="color: \${c.text}">\${colorName}</span>
              </div>
            </div>
          \`;
        };

        const renderSingleTable = (t, showCardHeader = true) => {
          const rowsList = t.rows || [];
          const hasClosedCol = rowsList.some(row => !!row.closedHeight);
          const paletteLabel = t.cartridgeHeader || r.cartridgeHeader || "Modelos y Colores Disponibles:";
          const legendHtml = getLegendPills(t.legendColors);

          return \`
            <div class="reload-type-card bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print-shadow-none space-y-6" data-type-id="\${t.id || "single"}">
              \${showCardHeader ? \`
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div class="flex items-center gap-3">
                    <span class="w-3 h-3 rounded-full \${t.hasAntiSlippery ? "bg-teal-500 ring-4 ring-teal-100" : "bg-[#006DFF] ring-4 ring-blue-100"}"></span>
                    <div>
                      <h3 class="text-xl font-black text-[#001F3F] tracking-tight">\${t.name}</h3>
                      <p class="text-xs text-slate-500 font-sans">\${t.tagline || t.techTitle || "Plataforma oficial de recargas"}</p>
                    </div>
                  </div>
                  \${t.badge ? \`
                    <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black \${t.hasAntiSlippery ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-blue-50 text-blue-700 border border-blue-200"} w-fit">
                      \${t.badge}
                    </span>
                  \` : ""}
                </div>
              \` : ""}

              \${t.highlightNote ? \`
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-50 via-cyan-50/70 to-emerald-50 border border-teal-200/90 text-teal-900 p-4 rounded-2xl shadow-2xs">
                  <div class="flex items-center gap-2.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 animate-pulse"></span>
                    <p class="text-xs sm:text-sm font-black tracking-tight text-teal-800 font-sans">
                      \${t.highlightNote}
                    </p>
                  </div>
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-teal-600 text-white text-[11px] font-mono tracking-wider font-extrabold shadow-xs shrink-0 self-start sm:self-auto">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 8h16M4 12h16M4 16h16"/></svg>
                    <span>SUPERFICIE ANTI-SLIPPERY</span>
                  </div>
                </div>
              \` : ""}

              <!-- Visual Cartridge Palette Preview -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">\${paletteLabel}</span>
                  <span class="text-[11px] font-mono font-bold text-slate-500">\${rowsList.length} modelos de recargas</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                  \${rowsList.map(rItem => renderCartridgeSvg(rItem.color, t.hasAntiSlippery)).join("")}
                </div>
              </div>

              <!-- Tech Summary Banner -->
              <div class="bg-slate-50/90 rounded-xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div class="max-w-xl">
                  <p class="text-xs font-bold text-[#001F3F]">\${t.techTitle || "Tecnología de Recargas"}</p>
                  <p class="text-xs text-slate-500 leading-relaxed">\${t.techDesc || "Especificaciones de compresión tisular para sutura y corte motorizado."}</p>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  \${legendHtml}
                </div>
              </div>

              <!-- Table -->
              <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-100 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#001F3F] border-b border-slate-200">
                      <th class="py-3.5 px-4 sm:px-6 w-36">Color</th>
                      \${hasRowsCol ? \`<th class="py-3.5 px-4 sm:px-6 text-center w-24">\${r.rowsColHeader || "Filas"}</th>\` : ""}
                      <th class="py-3.5 px-4 sm:px-6">\${r.tissueColHeader || "Tipo de Tejido"}</th>
                      <th class="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">\${r.openHeightColHeader || "Altura Grapa Abierta (mm)"}</th>
                      \${hasClosedCol ? '<th class="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">Altura Grapa Cerrada (mm)</th>' : ""}
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
                    \${rowsList.map(row => {
                      let badge = "";
                      if (row.color === "Grey") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-[#6B7280] text-white shadow-2xs">Grey</span>';
                      } else if (row.color === "White") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-white text-slate-800 border border-slate-300 shadow-2xs">White</span>';
                      } else if (row.color === "Blue") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-[#3B82F6] text-white shadow-2xs">Blue</span>';
                      } else if (row.color === "Gold") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-[#EAB308] text-slate-900 shadow-2xs">Gold</span>';
                      } else if (row.color === "Green") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-[#10B981] text-white shadow-2xs">Green</span>';
                      } else if (row.color === "Black") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-black text-white shadow-2xs">Black</span>';
                      } else if (row.color === "Tan") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-[#854D0E] text-white shadow-2xs">Tan</span>';
                      } else if (row.color === "Purple") {
                        badge = '<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-[#8B5CF6] text-white shadow-2xs">Purple</span>';
                      } else {
                        badge = \`<span class="inline-flex items-center justify-center w-24 py-1 rounded-md text-xs font-bold bg-slate-700 text-white shadow-2xs">\${row.color}</span>\`;
                      }
                      const rowsCell = hasRowsCol ? \`<td class="py-3.5 px-4 sm:px-6 text-center font-mono font-bold text-slate-700">\${row.rowsCount || "6"}</td>\` : "";
                      const closedCell = hasClosedCol ? \`<td class="py-3.5 px-4 sm:px-6 text-center font-mono font-bold text-blue-700">\${row.closedHeight || "-"}</td>\` : "";
                      return \`
                        <tr class="hover:bg-blue-50/40 transition-colors">
                          <td class="py-3.5 px-4 sm:px-6 font-semibold">\${badge}</td>
                          \${rowsCell}
                          <td class="py-3.5 px-4 sm:px-6 font-semibold text-slate-800">\${row.tissue}</td>
                          <td class="py-3.5 px-4 sm:px-6 text-center font-mono font-bold text-[#001F3F]">\${row.openHeight}</td>
                          \${closedCell}
                        </tr>
                      \`;
                    }).join("")}
                  </tbody>
                </table>
              </div>

              \${t.modelsTable ? \`
                <div class="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#001F3F] uppercase tracking-wide font-mono">\${t.modelsTable.title || "Modelos y Códigos"}</span>
                    \${t.modelsTable.footnote ? \`<span class="text-[11px] font-mono text-slate-500">\${t.modelsTable.footnote}</span>\` : ""}
                  </div>
                  <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table class="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr class="bg-slate-100 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#001F3F] border-b border-slate-200">
                          \${t.modelsTable.headers.map(h => \`<th class="py-2.5 px-4">\${h}</th>\`).join("")}
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        \${t.modelsTable.rows.map(rowItem => \`
                          <tr class="hover:bg-slate-50/70 transition-colors">
                            \${rowItem.cols ? rowItem.cols.map((c, i) => \`<td class="py-2 px-4 \${i === 0 ? "font-mono font-bold text-[#001F3F]" : "text-slate-700 font-semibold"}">\${c}</td>\`).join("") : ""}
                          </tr>
                        \`).join("")}
                      </tbody>
                    </table>
                  </div>
                </div>
              \` : ""}

              <p class="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <span class="text-blue-600 font-bold">ℹ</span>
                <span>\${t.footerNote || r.footerNote || "Especificaciones oficiales de recargas del fabricante."}</span>
              </p>
            </div>
          \`;
        };

        if (r.types && r.types.length > 0) {
          // Both reload types are displayed fixed (no tabs)
          reloadsHtml = \`
            <div class="space-y-6" id="reloads-section-container">
              <!-- General Header (Fixed, no tabs) -->
              <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print-shadow-none">
                <div class="space-y-1">
                  <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full bg-[#00A896]"></span>
                    <h2 class="text-lg sm:text-xl font-extrabold text-[#001F3F] uppercase tracking-wide font-mono">\${r.title || "Recargas de Grapas Compatibles"}</h2>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-600">
                    Catálogo de recargas estructurado en <strong>2 tipos</strong> compatibles: <strong>Flat-deck Reloads</strong> y <strong>FulGrip Reloads</strong> (tecnología anti-slippery).
                  </p>
                </div>
              </div>
              <!-- Render Both Reload Types (Both Fixed) -->
              <div class="space-y-6" id="reload-cards-wrapper">
                \${r.types.map(t => renderSingleTable(t, true)).join("")}
              </div>
            </div>
          \`;
        } else {
          // Standard single reload table (e.g. THORAPLER or Lunar S Pro Stepwise)
          reloadsHtml = renderSingleTable({
            id: r.id || "single",
            name: r.subtitle || r.title || "Recargas Compatibles",
            tagline: r.tagline || r.techTitle || r.title,
            badge: r.badge || r.subtitle,
            techTitle: r.techTitle,
            techDesc: r.techDesc,
            footerNote: r.footerNote,
            legendColors: r.legendColors,
            cartridgeHeader: r.cartridgeHeader,
            hasAntiSlippery: r.hasAntiSlippery || false,
            highlightNote: r.highlightNote,
            rows: r.rows || [],
            modelsTable: r.modelsTable
          }, true);
        }
      }
      `;

html = html.substring(0, oldReloadsStart) + newReloadsBlock + html.substring(oldReloadsEnd);

// 2. Update trocarSeriesHtml
const oldTrocarStart = html.indexOf("// TABLAS TÉCNICAS (Modelos");
const oldTrocarEnd = html.indexOf("// Specs HTML generation", oldTrocarStart);

if (oldTrocarStart === -1 || oldTrocarEnd === -1) {
  console.error("Could not find trocarSeries block in producto.html");
  process.exit(1);
}

const newTrocarBlock = `// TABLAS TÉCNICAS (Modelos y Series Oficiales)
      let trocarSeriesHtml = "";
      const rawSeriesList = p.productSeries || p.trocarSeries;
      const seriesList = rawSeriesList ? rawSeriesList.filter(s => {
        if (p.compatibleReloads) {
          const sid = (s.id || "").toLowerCase();
          const stitle = (s.title || "").toLowerCase();
          if (sid.includes("reload") || sid.includes("stepwise") || sid.includes("flat-deck") || sid.includes("fulgrip") || sid.includes("recargas") || stitle.includes("reload") || stitle.includes("recargas")) {
            return false;
          }
        }
        return true;
      }) : null;

      if (seriesList && seriesList.length > 0) {
        const renderSeriesCard = (s) => \`
          <div class="trocar-series-card bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print-shadow-none space-y-6" data-series-id="\${s.id}">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-[#00A896] ring-4 ring-teal-100"></span>
                <div>
                  <h3 class="text-xl font-black text-[#001F3F] tracking-tight">\${s.title}</h3>
                  <p class="text-xs text-slate-500 font-sans">\${s.tagline || ""}</p>
                </div>
              </div>
              \${s.badge ? \`
                <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-700 border border-teal-200 w-fit">
                  \${s.badge}
                </span>
              \` : ""}
            </div>
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
                            \`}
                          </tr>
                        \`).join("")}
                      </tbody>
                    </table>
                  </div>
                  \${sec.footnote ? \`
                    <p class="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <span class="text-teal-600 font-bold">ℹ</span>
                      <span>\${sec.footnote}</span>
                    </p>
                  \` : ""}
                </div>
              \`).join("")}
            </div>
          </div>
        \`;

        if (seriesList.length === 1) {
          // Single series (e.g. Device models table) -> render card directly without tabs
          trocarSeriesHtml = \`
            <div class="space-y-6" id="trocar-series-container">
              <div class="space-y-6" id="trocar-series-wrapper">
                \${renderSeriesCard(seriesList[0])}
              </div>
            </div>
          \`;
        } else {
          // Multiple series (e.g. Trocars with 7 series) -> render tabs
          trocarSeriesHtml = \`
            <div class="space-y-6" id="trocar-series-container">
              <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm print-shadow-none space-y-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#001F3F] shrink-0"></span>
                    <h2 class="text-base sm:text-lg font-extrabold text-[#001F3F] uppercase tracking-wide font-mono">
                      Tablas de Modelos y Especificaciones
                    </h2>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-600">
                    \${p.seriesTagline || "Tablas oficiales de modelos y especificaciones según folleto."}
                  </p>
                </div>
                <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2" id="trocar-tab-buttons">
                  <button type="button" onclick="setTrocarSeriesFilter('all')" id="tab-trocar-all" class="px-3.5 py-1.5 rounded-xl bg-[#001F3F] text-white text-xs font-bold shadow-xs cursor-pointer transition-all border border-transparent">
                    Todas las Series (\${seriesList.length})
                  </button>
                  \${seriesList.map((s, idx) => \`
                    <button type="button" onclick="setTrocarSeriesFilter('\${s.id}')" id="tab-trocar-\${s.id}" class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#001F3F] text-xs font-bold cursor-pointer transition-all border border-slate-200">
                      \${idx + 1}. \${s.title.replace("DISPOSABLE ENDOSCOPIC ", "")}
                    </button>
                  \`).join("")}
                </div>
              </div>
              <div class="space-y-6" id="trocar-series-wrapper">
                \${seriesList.map(s => renderSeriesCard(s)).join("")}
              </div>
            </div>
          \`;
        }
      }
      `;

html = html.substring(0, oldTrocarStart) + newTrocarBlock + html.substring(oldTrocarEnd);

fs.writeFileSync("/producto.html", html, "utf8");
console.log("SUCCESSFULLY UPDATED /producto.html");
