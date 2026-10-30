/**
 * export.js — Generación de los 3 formatos de descarga exigidos:
 * JSON (datos estructurados), Excel (misma estructura documental del
 * formato oficial RD-PR03-FT05) y PDF (reporte con membrete Codere).
 *
 * Requiere, cargadas antes en el HTML:
 *   - data/checklist.js  (DOCUMENT_META, GENERAL_INFO_FIELDS, CHECKLIST_SECTIONS,
 *                          EXTINTORES_ITEMS, TIPOS_EXTINTORES)
 *   - xlsx.full.min.js    (SheetJS, variable global XLSX)
 *   - html2pdf.bundle.min.js (variable global html2pdf)
 */

(function () {
  "use strict";

  function sanitizeFilename(s) {
    return (s || "inspeccion")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function baseName(inspection) {
    const sala = sanitizeFilename(inspection.sala || (inspection.general && inspection.general.nombre_establecimiento) || "sala");
    const fecha = (inspection.general && inspection.general.fecha_revision) || new Date().toISOString().slice(0, 10);
    return `${DOCUMENT_META.codigo}_${sala}_${fecha}`;
  }

  // ---------------------------------------------------------------
  // Helpers comunes para recorrer todos los ítems de checklist
  // ---------------------------------------------------------------
  function flattenAllItems() {
    const rows = [];
    CHECKLIST_SECTIONS.forEach((section) => {
      rows.push({ type: "section", text: section.titulo });
      section.grupos.forEach((grupo) => {
        if (grupo.subtitulo) rows.push({ type: "group", text: grupo.subtitulo });
        grupo.items.forEach((item) => rows.push({ type: "item", item, key: "item_" + item.n }));
      });
    });
    rows.push({ type: "section", text: "E. EQUIPOS DE CONTROL DE INCENDIOS — EXTINTORES" });
    EXTINTORES_ITEMS.forEach((item) => rows.push({ type: "item", item, key: "ext_" + item.n, noNA: true }));
    return rows;
  }

  // =================================================================
  // 1) EXPORTAR JSON
  // =================================================================
  function exportJSON(inspection) {
    const general = {};
    GENERAL_INFO_FIELDS.forEach((f) => {
      general[f.id] = { label: f.label, valor: inspection.general[f.id] || "" };
    });

    const checklist = [];
    CHECKLIST_SECTIONS.forEach((section) => {
      section.grupos.forEach((grupo) => {
        grupo.items.forEach((item) => {
          const st = inspection.items["item_" + item.n] || {};
          checklist.push({
            numero: item.n,
            seccion: section.titulo,
            grupo: grupo.subtitulo || null,
            pregunta: item.texto,
            respuesta: st.resp || "",
            observaciones: st.obs || "",
            campoAdicional: item.extra ? { etiqueta: item.extra.label, valor: (st.extra || {})[item.extra.id] || "" } : null,
          });
        });
      });
    });

    const extintores = EXTINTORES_ITEMS.map((item) => {
      const st = inspection.items["ext_" + item.n] || {};
      return {
        numero: item.n,
        pregunta: item.texto,
        respuesta: st.resp || "",
        observaciones: st.obs || "",
        campoAdicional: item.extra ? { etiqueta: item.extra.label, valor: (st.extra || {})[item.extra.id] || "" } : null,
      };
    });

    const tiposExtintores = TIPOS_EXTINTORES.map((tipo, idx) => ({
      tipo,
      ...((inspection.extTable && inspection.extTable[idx]) || { capacidad: "", cantidad: "", obs: "" }),
    }));

    const out = {
      documento: DOCUMENT_META,
      inspeccion: {
        id: inspection.id,
        estado: inspection.estado,
        sala: inspection.sala,
        creadoEn: inspection.createdAt,
        actualizadoEn: inspection.updatedAt,
      },
      informacionGeneral: general,
      checklist,
      extintoresPreguntas: extintores,
      extintoresTipos: tiposExtintores,
      planMejoramiento109: inspection.planMejoramiento || "",
      criteriosEvaluacion: {
        fechaEvaluacion: inspection.fechaEvaluacion || "",
        establecimientoCumple: inspection.cumpleGeneral || "",
        responsableSala: inspection.responsableSala || "",
        cargoResponsable: inspection.cargoResponsable || "",
      },
      exportadoEn: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    downloadBlob(blob, baseName(inspection) + ".json");
    window.showToast && window.showToast("JSON exportado.");
  }

  // =================================================================
  // 2) EXPORTAR EXCEL (misma estructura documental)
  // =================================================================
  function exportExcel(inspection) {
    const aoa = [];
    aoa.push([DOCUMENT_META.nombreFormato]);
    aoa.push([`Código: ${DOCUMENT_META.codigo}`, `Versión: ${DOCUMENT_META.version}`, `Vigencia: ${DOCUMENT_META.vigencia}`]);
    aoa.push([]);
    aoa.push(["A. INFORMACIÓN GENERAL"]);
    GENERAL_INFO_FIELDS.forEach((f) => {
      aoa.push([f.label, inspection.general[f.id] || ""]);
    });
    aoa.push([]);

    CHECKLIST_SECTIONS.forEach((section) => {
      aoa.push([section.titulo]);
      aoa.push(["N°", "Ítem", "SI", "NO", "NA", "Observaciones", "Dato adicional"]);
      section.grupos.forEach((grupo) => {
        if (grupo.subtitulo) aoa.push([grupo.subtitulo]);
        grupo.items.forEach((item) => {
          const st = inspection.items["item_" + item.n] || {};
          const extraVal = item.extra ? `${item.extra.label}: ${(st.extra || {})[item.extra.id] || ""}` : "";
          aoa.push([
            item.n,
            item.texto,
            st.resp === "SI" ? "X" : "",
            st.resp === "NO" ? "X" : "",
            st.resp === "NA" ? "X" : "",
            st.obs || "",
            extraVal,
          ]);
        });
      });
      aoa.push([]);
    });

    aoa.push(["E. EQUIPOS DE CONTROL DE INCENDIOS — EXTINTORES"]);
    aoa.push(["N°", "Ítem", "SI", "NO", "Observaciones", "Dato adicional"]);
    EXTINTORES_ITEMS.forEach((item) => {
      const st = inspection.items["ext_" + item.n] || {};
      const extraVal = item.extra ? `${item.extra.label}: ${(st.extra || {})[item.extra.id] || ""}` : "";
      aoa.push([item.n, item.texto, st.resp === "SI" ? "X" : "", st.resp === "NO" ? "X" : "", st.obs || "", extraVal]);
    });
    aoa.push([]);
    aoa.push(["108. Tipos de extintores instalados"]);
    aoa.push(["Tipo", "Capacidad", "Cantidad", "Observaciones"]);
    TIPOS_EXTINTORES.forEach((tipo, idx) => {
      const row = (inspection.extTable && inspection.extTable[idx]) || {};
      aoa.push([tipo, row.capacidad || "", row.cantidad || "", row.obs || ""]);
    });
    aoa.push([]);

    aoa.push(["F. PLAN DE MEJORAMIENTO"]);
    aoa.push(["109.", inspection.planMejoramiento || ""]);
    aoa.push([]);

    aoa.push(["G. CRITERIOS DE EVALUACIÓN"]);
    aoa.push(["110. Fecha de revisión (evaluación)", inspection.fechaEvaluacion || ""]);
    aoa.push(["111. El establecimiento reúne los requisitos básicos de protección", inspection.cumpleGeneral || ""]);
    aoa.push(["112. Responsable de atender la autoinspección", inspection.responsableSala || ""]);
    aoa.push(["113. Cargo / Rol", inspection.cargoResponsable || ""]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 60 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 35 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BMA");
    XLSX.writeFile(wb, baseName(inspection) + ".xlsx");
    window.showToast && window.showToast("Excel exportado.");
  }

  // =================================================================
  // 3) EXPORTAR PDF (reporte con membrete Codere, incluye fotos)
  // =================================================================
  function buildPdfHtml(inspection, photoCache) {
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const TD = "border:1px solid #ddd;padding:4px 6px;";
    const TH = "border:1px solid #ddd;padding:4px 6px;background:#f4f4f4;text-align:left;";
    const TR = "page-break-inside:avoid;break-inside:avoid;";

    function photosHtmlFor(key) {
      const list = (photoCache && photoCache[key]) || [];
      if (!list.length) return "";
      const imgs = list.map((p) => `<img src="${p.url}" style="width:90px;height:90px;object-fit:cover;border:1px solid #ccc;border-radius:4px;margin:2px" />`).join("");
      return `<div style="margin-top:4px">${imgs}</div>`;
    }

    function respBadge(resp) {
      if (!resp) return '<span style="color:#b35c00;font-weight:700">PENDIENTE</span>';
      const color = resp === "SI" ? "#1e8e3e" : resp === "NO" ? "#c5221f" : "#777";
      return `<span style="color:${color};font-weight:700">${resp}</span>`;
    }

    let itemsHtml = "";
    CHECKLIST_SECTIONS.forEach((section) => {
      itemsHtml += `<div style="background:#141414;color:#fff;padding:6px 10px;margin-top:14px;border-left:4px solid #D5001C;font-weight:700;font-size:12px">${esc(section.titulo)}</div>`;
      section.grupos.forEach((grupo) => {
        if (grupo.subtitulo) {
          itemsHtml += `<div style="font-size:10.5px;font-weight:700;color:#9E0015;margin:8px 0 2px;text-transform:uppercase">${esc(grupo.subtitulo)}</div>`;
        }
        grupo.items.forEach((item) => {
          const key = "item_" + item.n;
          const st = inspection.items[key] || {};
          const extraVal = item.extra ? ` <em>(${esc(item.extra.label)}: ${esc((st.extra || {})[item.extra.id] || "—")})</em>` : "";
          itemsHtml += `
            <div style="padding:4px 0;border-bottom:1px solid #e4e4e4;font-size:10.5px;page-break-inside:avoid;break-inside:avoid">
              <strong>${item.n}.</strong> ${esc(item.texto)}${extraVal} — ${respBadge(st.resp)}
              ${st.obs ? `<div style="color:#555;margin-top:2px">Obs: ${esc(st.obs)}</div>` : ""}
              ${photosHtmlFor(key)}
            </div>`;
        });
      });
    });

    itemsHtml += `<div style="background:#141414;color:#fff;padding:6px 10px;margin-top:14px;border-left:4px solid #D5001C;font-weight:700;font-size:12px">E. EQUIPOS DE CONTROL DE INCENDIOS — EXTINTORES</div>`;
    EXTINTORES_ITEMS.forEach((item) => {
      const key = "ext_" + item.n;
      const st = inspection.items[key] || {};
      const extraVal = item.extra ? ` <em>(${esc(item.extra.label)}: ${esc((st.extra || {})[item.extra.id] || "—")})</em>` : "";
      itemsHtml += `
        <div style="padding:4px 0;border-bottom:1px solid #e4e4e4;font-size:10.5px;page-break-inside:avoid;break-inside:avoid">
          <strong>${item.n}.</strong> ${esc(item.texto)}${extraVal} — ${respBadge(st.resp)}
          ${st.obs ? `<div style="color:#555;margin-top:2px">Obs: ${esc(st.obs)}</div>` : ""}
          ${photosHtmlFor(key)}
        </div>`;
    });

    let extTableRows = "";
    TIPOS_EXTINTORES.forEach((tipo, idx) => {
      const row = (inspection.extTable && inspection.extTable[idx]) || {};
      if (!row.capacidad && !row.cantidad && !row.obs) return;
      extTableRows += `<tr style="${TR}"><td style="${TD}">${esc(tipo)}</td><td style="${TD}">${esc(row.capacidad)}</td><td style="${TD}">${esc(row.cantidad)}</td><td style="${TD}">${esc(row.obs)}</td></tr>`;
    });

    const generalRows = GENERAL_INFO_FIELDS.map(
      (f) => `<tr style="${TR}"><td style="${TD}font-weight:600;width:55%">${esc(f.label)}</td><td style="${TD}">${esc(inspection.general[f.id] || "—")}</td></tr>`
    ).join("");

    return `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#141414;padding:24px;width:712px">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #D5001C;padding-bottom:10px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;background:#D5001C;border-radius:8px;color:#fff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center">C</div>
            <div>
              <div style="font-weight:800;font-size:14px">CODERE COLOMBIA</div>
              <div style="font-size:10px;color:#666">Autoinspección de Seguridad Humana y Protección Contra Incendios</div>
            </div>
          </div>
          <div style="font-size:9.5px;text-align:right;color:#666">
            Formato base: <strong>${DOCUMENT_META.codigo}</strong><br/>
            Versión ${DOCUMENT_META.version} · Vigencia ${DOCUMENT_META.vigencia}
          </div>
        </div>

        <h2 style="font-size:14px;margin:0 0 10px">${esc(inspection.sala || "Sala sin nombre")}</h2>

        <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:10px">
          ${generalRows}
        </table>

        ${itemsHtml}

        ${extTableRows ? `
        <div style="font-size:10.5px;font-weight:700;margin-top:10px">108. Tipos de extintores instalados</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px">
          <thead><tr><th style="${TH}">Tipo</th><th style="${TH}">Capacidad</th><th style="${TH}">Cantidad</th><th style="${TH}">Observaciones</th></tr></thead>
          <tbody>${extTableRows}</tbody>
        </table>` : ""}

        <div style="margin-top:14px;font-size:10.5px"><strong>F. Plan de mejoramiento (109):</strong><br/>${esc(inspection.planMejoramiento) || "—"}</div>

        <div style="margin-top:10px;font-size:10.5px">
          <strong>G. Criterios de evaluación</strong><br/>
          110. Fecha de evaluación: ${esc(inspection.fechaEvaluacion) || "—"}<br/>
          111. ¿Reúne requisitos básicos?: ${respBadge(inspection.cumpleGeneral)}<br/>
          112. Responsable: ${esc(inspection.responsableSala) || "—"} — 113. Cargo: ${esc(inspection.cargoResponsable) || "—"}
        </div>

        ${photosHtmlFor("general") ? `<div style="margin-top:10px;font-size:10.5px"><strong>Registro fotográfico general:</strong>${photosHtmlFor("general")}</div>` : ""}

        <div style="margin-top:20px;font-size:8.5px;color:#999;border-top:1px solid #e4e4e4;padding-top:8px">
          Documento interno de autoinspección Codere Colombia, basado en el formato oficial ${DOCUMENT_META.codigo} de la ${DOCUMENT_META.entidad}.
          No sustituye el Concepto Técnico oficial emitido por Bomberos Bogotá. Generado el ${new Date().toLocaleString("es-CO")}.
        </div>
      </div>
    `;
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function exportPDF(inspection, photoCache) {
    // Forzar scroll a 0,0 y esperar dos frames de layout: si la exportación
    // se dispara justo después de que la app re-renderizó todo el formulario
    // (al marcar un ítem SI/NO/NA), html2canvas puede capturar una página en
    // blanco al calcular el recorte sobre un documento con layout "sucio".
    window.scrollTo(0, 0);
    await nextFrame();

    const holder = document.createElement("div");
    holder.className = "pdf-render-root";
    holder.innerHTML = buildPdfHtml(inspection, photoCache);
    document.body.appendChild(holder);
    await nextFrame();

    const opt = {
      margin: 0,
      filename: baseName(inspection) + ".pdf",
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
      // Solo modo "css": el modo "legacy" de html2pdf.js produce páginas en
      // blanco con este contenido (confirmado en pruebas). Los ítems y filas
      // llevan `break-inside:avoid` en línea para no cortarse entre páginas.
      pagebreak: { mode: ["css"] },
    };

    html2pdf()
      .set(opt)
      .from(holder)
      .save()
      .then(() => {
        document.body.removeChild(holder);
        window.showToast && window.showToast("PDF exportado.");
      })
      .catch((err) => {
        document.body.removeChild(holder);
        console.error(err);
        alert("No se pudo generar el PDF: " + err.message);
      });
  }

  window.ExportTools = { exportJSON, exportExcel, exportPDF };
})();
