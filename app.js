/**
 * app.js — Lógica de interfaz: construye el formulario a partir de
 * data/checklist.js, maneja el estado en memoria, fotos (IndexedDB vía
 * storage.js) y delega las exportaciones a export.js.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------
  // Estado en memoria de la inspección actual
  // ---------------------------------------------------------------
  let current = createEmptyInspection();
  let photoCache = {}; // itemKey -> [{id, url}]
  let hiddenFileTarget = null;

  function createEmptyInspection() {
    return {
      id: null,
      sala: "",
      estado: "borrador", // borrador | completa
      general: {},
      items: {},     // itemKey -> { resp: 'SI'|'NO'|'NA', obs: '', extra: {} }
      extintores: {},
      extTable: TIPOS_EXTINTORES.map(() => ({ capacidad: "", cantidad: "", obs: "" })),
      planMejoramiento: "",
      fechaEvaluacion: "",
      cumpleGeneral: "",
      responsableSala: "",
      cargoResponsable: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function itemKey(prefix, n) {
    return prefix + "_" + n;
  }

  // ---------------------------------------------------------------
  // Render: metadatos de encabezado
  // ---------------------------------------------------------------
  function renderMeta() {
    document.getElementById("metaCodigo").textContent = DOCUMENT_META.codigo;
    document.getElementById("metaVersion").textContent = DOCUMENT_META.version;
    document.getElementById("metaVigencia").textContent = DOCUMENT_META.vigencia;
  }

  // ---------------------------------------------------------------
  // Render: campos generales (sección A + conflicto de intereses)
  // ---------------------------------------------------------------
  function renderGeneralFields() {
    const container = document.getElementById("generalFields");
    container.innerHTML = "";
    GENERAL_INFO_FIELDS.forEach((f) => {
      const wrap = document.createElement("div");
      wrap.className = "field" + (f.type === "textarea" || f.type === "sino" ? " full" : "");
      const label = document.createElement("label");
      label.textContent = f.label;
      wrap.appendChild(label);

      if (f.type === "sino") {
        const grp = document.createElement("div");
        grp.className = "sino-group";
        ["SI", "NO"].forEach((opt) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = opt;
          b.addEventListener("click", () => {
            current.general[f.id] = opt;
            renderGeneralFields();
          });
          if (current.general[f.id] === opt) b.classList.add("sel-" + opt);
          grp.appendChild(b);
        });
        wrap.appendChild(grp);
      } else if (f.type === "textarea") {
        const ta = document.createElement("textarea");
        ta.rows = 2;
        ta.value = current.general[f.id] || "";
        ta.addEventListener("input", () => (current.general[f.id] = ta.value));
        wrap.appendChild(ta);
      } else {
        const input = document.createElement("input");
        input.type = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
        input.value = current.general[f.id] || "";
        input.addEventListener("input", () => (current.general[f.id] = input.value));
        wrap.appendChild(input);
      }
      container.appendChild(wrap);
    });
  }

  // ---------------------------------------------------------------
  // Render: fila genérica de ítem SI/NO/NA
  // ---------------------------------------------------------------
  function buildItemRow(item, opts) {
    opts = opts || {};
    const key = itemKey(opts.prefix || "item", item.n);
    if (!current.items[key]) current.items[key] = { resp: "", obs: "", extra: {} };
    const state = current.items[key];

    const row = document.createElement("div");
    row.className = "item-row";

    const num = document.createElement("div");
    num.className = "item-num";
    num.textContent = item.n;
    row.appendChild(num);

    const body = document.createElement("div");
    body.className = "item-body";

    const text = document.createElement("div");
    text.className = "item-text";
    text.textContent = item.texto;
    body.appendChild(text);

    if (!item.onlyNumeric) {
      const grp = document.createElement("div");
      grp.className = "sino-group";
      const options = opts.noNA ? ["SI", "NO"] : ["SI", "NO", "NA"];
      options.forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = opt;
        if (state.resp === opt) b.classList.add("sel-" + opt);
        b.addEventListener("click", () => {
          state.resp = state.resp === opt ? "" : opt;
          renderAll(false);
        });
        grp.appendChild(b);
      });
      body.appendChild(grp);
    }

    if (item.extra) {
      const ef = document.createElement("div");
      ef.className = "extra-field";
      const lbl = document.createElement("label");
      lbl.textContent = item.extra.label + ":";
      ef.appendChild(lbl);
      if (item.extra.type === "select") {
        const sel = document.createElement("select");
        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "—";
        sel.appendChild(blank);
        item.extra.options.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o;
          opt.textContent = o;
          if (state.extra[item.extra.id] === o) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener("change", () => (state.extra[item.extra.id] = sel.value));
        ef.appendChild(sel);
      } else {
        const inp = document.createElement("input");
        inp.type = item.extra.type === "number" ? "number" : "text";
        inp.value = state.extra[item.extra.id] || "";
        inp.addEventListener("input", () => (state.extra[item.extra.id] = inp.value));
        ef.appendChild(inp);
      }
      body.appendChild(ef);
    }

    const obs = document.createElement("input");
    obs.className = "obs-input";
    obs.placeholder = "Observaciones...";
    obs.value = state.obs || "";
    obs.addEventListener("input", () => (state.obs = obs.value));
    body.appendChild(obs);

    const thumbs = document.createElement("div");
    thumbs.className = "thumb-strip";
    thumbs.id = "thumbs_" + key;
    body.appendChild(thumbs);

    row.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const photoBtn = document.createElement("button");
    photoBtn.type = "button";
    photoBtn.className = "photo-btn";
    photoBtn.title = "Adjuntar fotografía";
    photoBtn.textContent = "📷";
    photoBtn.addEventListener("click", () => triggerPhotoPicker(key));
    actions.appendChild(photoBtn);
    const cnt = document.createElement("div");
    cnt.className = "photo-count";
    cnt.id = "count_" + key;
    actions.appendChild(cnt);
    row.appendChild(actions);

    refreshThumbs(key);

    return row;
  }

  // ---------------------------------------------------------------
  // Render: secciones B–D (y subgrupos de E salvo extintores)
  // ---------------------------------------------------------------
  function renderChecklistSections() {
    const container = document.getElementById("checklistSections");
    container.innerHTML = "";
    CHECKLIST_SECTIONS.forEach((section) => {
      const card = document.createElement("div");
      card.className = "card";
      const title = document.createElement("div");
      title.className = "section-title";
      title.textContent = section.titulo;
      card.appendChild(title);

      section.grupos.forEach((grupo) => {
        if (grupo.subtitulo) {
          const gt = document.createElement("div");
          gt.className = "group-title";
          gt.textContent = grupo.subtitulo;
          card.appendChild(gt);
        }
        grupo.items.forEach((item) => {
          card.appendChild(buildItemRow(item, { prefix: "item" }));
        });
      });

      container.appendChild(card);
    });
  }

  // ---------------------------------------------------------------
  // Render: extintores (94–107) + tabla 108
  // ---------------------------------------------------------------
  function renderExtintores() {
    const container = document.getElementById("extintoresItems");
    container.innerHTML = "";
    EXTINTORES_ITEMS.forEach((item) => {
      container.appendChild(buildItemRow(item, { prefix: "ext", noNA: true }));
    });

    const tbody = document.getElementById("extTableBody");
    tbody.innerHTML = "";
    TIPOS_EXTINTORES.forEach((tipo, idx) => {
      const row = current.extTable[idx] || { capacidad: "", cantidad: "", obs: "" };
      current.extTable[idx] = row;
      const tr = document.createElement("tr");

      const tdTipo = document.createElement("td");
      tdTipo.textContent = tipo;
      tr.appendChild(tdTipo);

      ["capacidad", "cantidad", "obs"].forEach((field) => {
        const td = document.createElement("td");
        const inp = document.createElement("input");
        inp.value = row[field] || "";
        inp.placeholder = field === "obs" ? "Observaciones" : "";
        inp.addEventListener("input", () => (row[field] = inp.value));
        td.appendChild(inp);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // ---------------------------------------------------------------
  // Render: sección G (cumple general) + fotos generales
  // ---------------------------------------------------------------
  function renderSectionG() {
    document.getElementById("fechaEvaluacion").value = current.fechaEvaluacion || "";
    document.getElementById("fechaEvaluacion").oninput = (e) => (current.fechaEvaluacion = e.target.value);

    document.getElementById("planMejoramiento").value = current.planMejoramiento || "";
    document.getElementById("planMejoramiento").oninput = (e) => (current.planMejoramiento = e.target.value);

    document.getElementById("responsableSala").value = current.responsableSala || "";
    document.getElementById("responsableSala").oninput = (e) => (current.responsableSala = e.target.value);

    document.getElementById("cargoResponsable").value = current.cargoResponsable || "";
    document.getElementById("cargoResponsable").oninput = (e) => (current.cargoResponsable = e.target.value);

    const grp = document.getElementById("cumpleGeneral");
    grp.innerHTML = "";
    ["SI", "NO"].forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = opt;
      if (current.cumpleGeneral === opt) b.classList.add("sel-" + opt);
      b.addEventListener("click", () => {
        current.cumpleGeneral = current.cumpleGeneral === opt ? "" : opt;
        renderSectionG();
      });
      grp.appendChild(b);
    });

    refreshThumbs("general");
  }

  // ---------------------------------------------------------------
  // Fotos
  // ---------------------------------------------------------------
  function triggerPhotoPicker(key) {
    hiddenFileTarget = key;
    document.getElementById("generalPhotoInput").click();
  }

  async function refreshThumbs(key) {
    const stripId = key === "general" ? "generalPhotoStrip" : "thumbs_" + key;
    const strip = document.getElementById(stripId);
    if (!strip) return;
    if (!current.id) {
      strip.innerHTML = "";
      return;
    }
    const all = photoCache[key];
    if (!all) return; // se cargará con loadPhotosForInspection
    strip.innerHTML = "";
    all.forEach((p) => {
      const d = document.createElement("div");
      d.className = "thumb";
      const img = document.createElement("img");
      img.src = p.url;
      d.appendChild(img);
      const rm = document.createElement("button");
      rm.className = "rm";
      rm.textContent = "✕";
      rm.addEventListener("click", async (e) => {
        e.stopPropagation();
        await Storage.deletePhoto(p.id);
        photoCache[key] = photoCache[key].filter((x) => x.id !== p.id);
        refreshThumbs(key);
        updatePhotoCount(key);
      });
      d.appendChild(rm);
      strip.appendChild(d);
    });
    updatePhotoCount(key);
  }

  function updatePhotoCount(key) {
    const el = document.getElementById("count_" + key);
    if (!el) return;
    const n = (photoCache[key] || []).length;
    el.textContent = n > 0 ? n + " foto" + (n > 1 ? "s" : "") : "";
    const btn = el.parentElement.querySelector(".photo-btn");
    if (btn) btn.classList.toggle("has-photos", n > 0);
  }

  async function loadPhotosForInspection(inspectionId) {
    photoCache = {};
    if (!inspectionId) return;
    const photos = await Storage.listPhotos(inspectionId);
    photos.forEach((p) => {
      const url = URL.createObjectURL(p.blob);
      if (!photoCache[p.itemKey]) photoCache[p.itemKey] = [];
      photoCache[p.itemKey].push({ id: p.id, url });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("generalPhotoInput").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length || !hiddenFileTarget) return;
      if (!current.id) {
        await persist(); // asegurar que existe un id antes de guardar fotos
      }
      for (const f of files) {
        const id = await Storage.savePhoto(current.id, hiddenFileTarget, f, { name: f.name });
        const url = URL.createObjectURL(f);
        if (!photoCache[hiddenFileTarget]) photoCache[hiddenFileTarget] = [];
        photoCache[hiddenFileTarget].push({ id, url });
      }
      refreshThumbs(hiddenFileTarget);
      e.target.value = "";
    });

    document.getElementById("btnAddGeneralPhoto").addEventListener("click", () => triggerPhotoPicker("general"));
  });

  // ---------------------------------------------------------------
  // Resumen (semáforo de cumplimiento)
  // ---------------------------------------------------------------
  function renderSummary() {
    const bar = document.getElementById("summaryBar");
    let si = 0, no = 0, na = 0, pend = 0, total = 0;
    Object.values(current.items).forEach((it) => {
      total++;
      if (it.resp === "SI") si++;
      else if (it.resp === "NO") no++;
      else if (it.resp === "NA") na++;
      else pend++;
    });
    bar.innerHTML = "";
    const stats = [
      { label: "Cumple (SI)", val: si, cls: "ok" },
      { label: "No cumple (NO)", val: no, cls: "bad" },
      { label: "No aplica", val: na, cls: "na" },
      { label: "Pendientes", val: pend, cls: "pending" },
    ];
    stats.forEach((s) => {
      const d = document.createElement("div");
      d.className = "stat " + s.cls;
      d.innerHTML = `<div class="num">${s.val}</div><div class="lbl">${s.label}</div>`;
      bar.appendChild(d);
    });
  }

  // ---------------------------------------------------------------
  // Guardado / carga
  // ---------------------------------------------------------------
  async function persist() {
    current.sala = current.general.nombre_establecimiento || current.general.razon_social || "Sin nombre";
    current.id = await Storage.saveInspection(current);
    return current.id;
  }

  async function handleSave(markComplete) {
    if (markComplete) current.estado = "completa";
    await persist();
    showToast(markComplete ? "Inspección marcada como completa y guardada." : "Borrador guardado.");
    renderHistory();
  }

  function resetForm() {
    current = createEmptyInspection();
    photoCache = {};
    renderAll(true);
    switchView("viewForm");
  }

  async function openInspection(id) {
    const insp = await Storage.getInspection(id);
    if (!insp) return;
    current = Object.assign(createEmptyInspection(), insp);
    await loadPhotosForInspection(current.id);
    renderAll(true);
    switchView("viewForm");
  }

  // ---------------------------------------------------------------
  // Historial
  // ---------------------------------------------------------------
  async function renderHistory() {
    const list = document.getElementById("historyList");
    const all = await Storage.listInspections();
    if (!all.length) {
      list.innerHTML = '<div class="empty-state">Aún no hay inspecciones guardadas en este dispositivo.</div>';
      return;
    }
    list.innerHTML = "";
    all.forEach((insp) => {
      const row = document.createElement("div");
      row.className = "history-item";
      const date = insp.updatedAt ? new Date(insp.updatedAt).toLocaleString("es-CO") : "";
      row.innerHTML = `
        <div class="history-main">
          <h3>${escapeHtml(insp.sala || "Sin nombre")} <span class="badge ${insp.estado}">${insp.estado === "completa" ? "Completa" : "Borrador"}</span></h3>
          <p>Actualizado: ${date} · Dirección: ${escapeHtml((insp.general && insp.general.direccion) || "—")}</p>
        </div>
      `;
      const actions = document.createElement("div");
      actions.className = "history-actions";

      const openBtn = document.createElement("button");
      openBtn.className = "btn btn-outline";
      openBtn.textContent = "Abrir";
      openBtn.addEventListener("click", () => openInspection(insp.id));
      actions.appendChild(openBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "Eliminar";
      delBtn.addEventListener("click", async () => {
        if (confirm("¿Eliminar esta inspección y sus fotos? Esta acción no se puede deshacer.")) {
          await Storage.deleteInspection(insp.id);
          renderHistory();
        }
      });
      actions.appendChild(delBtn);

      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------------------------------------------------------
  // Navegación de pestañas
  // ---------------------------------------------------------------
  function switchView(id) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === id));
    if (id === "viewHistory") renderHistory();
  }

  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.addEventListener("click", () => switchView(b.dataset.view));
  });

  // ---------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------
  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  window.showToast = showToast;

  // ---------------------------------------------------------------
  // Render general
  // ---------------------------------------------------------------
  function renderAll(resetPhotos) {
    renderMeta();
    renderGeneralFields();
    renderChecklistSections();
    renderExtintores();
    renderSectionG();
    renderSummary();
  }

  // ---------------------------------------------------------------
  // Botones principales
  // ---------------------------------------------------------------
  document.getElementById("btnNew").addEventListener("click", () => {
    if (confirm("¿Crear una nueva inspección? Si tienes cambios sin guardar en la actual, se perderán.")) {
      resetForm();
    }
  });
  document.getElementById("btnSave").addEventListener("click", () => handleSave(false));
  document.getElementById("btnExportJson").addEventListener("click", () => window.ExportTools.exportJSON(current));
  document.getElementById("btnExportExcel").addEventListener("click", () => window.ExportTools.exportExcel(current));
  document.getElementById("btnExportPdf").addEventListener("click", async () => {
    await persist();
    window.ExportTools.exportPDF(current, photoCache);
  });

  // ---------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------
  (async function init() {
    await Storage.init();
    renderAll(true);
    renderHistory();
  })();
})();
