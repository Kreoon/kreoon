import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  market_research?: any;
  competitor_analysis?: any;
  avatar_profiles?: any;
  sales_angles_data?: any;
  content_strategy?: any;
  content_calendar?: any;
  launch_strategy?: any;
  ideal_avatar?: string | null;
}

interface ProductResearchPdfData {
  product: Product;
  clientName?: string;
}

// ─── SAFE HELPERS ──────────────────────────────────────────────────────────────

/** Ensures value is always an array. Handles null, undefined, strings, objects. */
function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  if (typeof val === 'string') return val.trim() ? [val] : [];
  return [];
}

/** Safely extract text from various data structures */
function extractText(item: any, keys: string[]): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

/** Parse JSON safely */
function parseJson(data: any): any {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

/** Safe string accessor — handles objects by extracting meaningful text */
function safeStr(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val == null) return fallback;
  if (Array.isArray(val)) return val.map(v => safeStr(v)).filter(Boolean).join(', ') || fallback;
  if (typeof val === 'object') {
    // Try common text keys first
    const textKeys = ['text', 'description', 'name', 'title', 'message', 'value', 'label',
      'pain', 'desire', 'objection', 'insight', 'opportunity', 'threat', 'emotion',
      'factor', 'driver', 'action', 'win', 'risk', 'statement'];
    for (const k of textKeys) {
      if (typeof val[k] === 'string' && val[k].trim()) return val[k];
    }
    // Collect all string values from the object
    const parts = Object.values(val).filter(v => typeof v === 'string' && (v as string).trim()) as string[];
    if (parts.length > 0) return parts.join('. ');
    return fallback;
  }
  return fallback;
}

/** Render JTBD value — handles both string and object forms */
function renderJtbd(val: any): string {
  if (typeof val === 'string') return val;
  if (!val || typeof val !== 'object') return '';
  // Extract all meaningful string properties from the JTBD object
  const parts: string[] = [];
  const keys = ['description', 'statement', 'situation', 'desiredOutcome', 'currentAlternatives',
    'duringUse', 'afterUse', 'desiredStatus', 'belongingGroup', 'differentiateFrom'];
  for (const k of keys) {
    if (typeof val[k] === 'string' && val[k].trim()) parts.push(val[k]);
  }
  // Also handle array properties
  const arrayKeys = ['avoidFeelings', 'underlyingFears', 'hopesAndDreams', 'perceivedBy', 'avoidJudgments'];
  for (const k of arrayKeys) {
    const arr = safeArray(val[k]);
    if (arr.length > 0) parts.push(arr.join(', '));
  }
  return parts.join('. ') || '';
}

/** Escape HTML to prevent XSS */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── PDF GENERATOR ─────────────────────────────────────────────────────────────

export function generateProductResearchPdf({ product, clientName }: ProductResearchPdfData) {
  const rawMarketResearch = parseJson(product.market_research);
  // market_research stores { market_overview: {...}, jtbd: {...} } — unwrap
  const marketResearch = rawMarketResearch?.market_overview || rawMarketResearch;
  const competitorAnalysis = parseJson(product.competitor_analysis);
  const avatarProfiles = parseJson(product.avatar_profiles);
  const salesAnglesData = parseJson(product.sales_angles_data);
  const contentStrategy = parseJson(product.content_strategy);
  const contentCalendar = parseJson(product.content_calendar);
  const launchStrategy = parseJson(product.launch_strategy);

  // Parse JTBD — try ideal_avatar first, then market_research.jtbd as fallback
  let jtbdData: any = null;
  try {
    if (product.ideal_avatar && typeof product.ideal_avatar === 'string') {
      const parsed = JSON.parse(product.ideal_avatar);
      jtbdData = parsed?.jtbd || null;
    }
  } catch {
    jtbdData = null;
  }
  if (!jtbdData && rawMarketResearch?.jtbd) {
    jtbdData = rawMarketResearch.jtbd;
  }

  const generatedDate = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
  const productName = safeStr(product.name, 'Producto');

  // Track sections for TOC
  const tocEntries: { id: string; title: string; icon: string }[] = [];
  let sectionsHtml = '';

  function addSection(id: string, icon: string, title: string, content: string, pageBreak = true) {
    tocEntries.push({ id, title, icon });
    sectionsHtml += `
      <div class="section ${pageBreak ? 'page-break' : ''}" id="${id}">
        <div class="section-header">
          <span class="section-icon">${icon}</span>
          <h2>${title}</h2>
        </div>
        ${content}
      </div>
    `;
  }

  // ── SECTION: Executive Summary ──────────────────────────────────────────────
  const summary = contentStrategy?.executiveSummary;
  if (summary) {
    let content = '';

    // Opportunity Score
    const score = typeof summary.opportunityScore === 'number' ? summary.opportunityScore : null;
    if (score != null) {
      const scoreColor = score >= 8 ? '#22c55e' : score >= 6 ? '#f59e0b' : score >= 4 ? '#f97316' : '#ef4444';
      content += `<div style="display:flex;align-items:center;gap:16px;padding:16px;background:linear-gradient(135deg,${scoreColor}10,${scoreColor}05);border:2px solid ${scoreColor}30;border-radius:12px;margin-bottom:16px">
        <div style="width:64px;height:64px;border-radius:50%;background:${scoreColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0">${score}</div>
        <div><strong style="font-size:14px">Score de Oportunidad</strong><span style="color:#9ca3af;font-size:12px"> / 10</span>
        ${safeStr(summary.opportunityScoreJustification) ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280">${escapeHtml(summary.opportunityScoreJustification)}</p>` : ''}</div>
      </div>`;
    }

    if (safeStr(summary.marketSummary)) {
      content += `<div class="highlight-box green"><p>${escapeHtml(summary.marketSummary)}</p></div>`;
    }

    const keyInsights = safeArray(summary.keyInsights);
    if (keyInsights.length > 0) {
      content += `<h3>💡 Insights Estratégicos Clave</h3><div class="insights-grid">`;
      keyInsights.forEach((item: any, idx: number) => {
        const text = typeof item === 'string' ? item : safeStr(item?.insight);
        const importance = typeof item === 'object' ? safeStr(item?.importance) : '';
        const action = typeof item === 'object' ? safeStr(item?.action) : '';
        content += `
          <div class="insight-card">
            <div class="insight-number">${idx + 1}</div>
            <div class="insight-content">
              <strong>${escapeHtml(text)}</strong>
              ${importance ? `<p class="insight-detail"><span class="label">Por qué importa:</span> ${escapeHtml(importance)}</p>` : ''}
              ${action ? `<p class="insight-detail"><span class="label">Acción:</span> ${escapeHtml(action)}</p>` : ''}
            </div>
          </div>`;
      });
      content += `</div>`;
    }

    const psychDrivers = safeArray(summary.psychologicalDrivers);
    if (psychDrivers.length > 0) {
      content += `<h3>🧠 Drivers Psicológicos</h3>`;
      psychDrivers.forEach((item: any) => {
        const text = typeof item === 'string' ? item : safeStr(item?.driver);
        const why = typeof item === 'object' ? safeStr(item?.why) : '';
        const howToUse = typeof item === 'object' ? safeStr(item?.howToUse) : '';
        content += `<div style="padding:8px 12px;margin-bottom:8px;border-left:3px solid #7c3aed;background:#f5f3ff;border-radius:0 6px 6px 0">
          <strong style="color:#7c3aed">${escapeHtml(text)}</strong>
          ${why ? `<p style="margin:4px 0 0;font-size:11px;color:#6b7280"><b>Por qué:</b> ${escapeHtml(why)}</p>` : ''}
          ${howToUse ? `<p style="margin:2px 0 0;font-size:11px;color:#6b7280"><b>Cómo usarlo:</b> ${escapeHtml(howToUse)}</p>` : ''}
        </div>`;
      });
    }

    // Immediate Actions
    const actions = safeArray(summary.immediateActions);
    if (actions.length > 0) {
      content += `<h3>🚀 Acciones Inmediatas</h3>`;
      actions.forEach((item: any, idx: number) => {
        const text = typeof item === 'string' ? item : safeStr(item?.action);
        const howTo = typeof item === 'object' ? safeStr(item?.howTo) : '';
        const result = typeof item === 'object' ? safeStr(item?.expectedResult) : '';
        content += `<div style="padding:8px 12px;margin-bottom:8px;border-left:3px solid #22c55e;background:#f0fdf4;border-radius:0 6px 6px 0">
          <strong style="color:#16a34a">Acción ${idx + 1}:</strong> ${escapeHtml(text)}
          ${howTo ? `<p style="margin:4px 0 0;font-size:11px;color:#6b7280"><b>Cómo:</b> ${escapeHtml(howTo)}</p>` : ''}
          ${result ? `<p style="margin:2px 0 0;font-size:11px;color:#6b7280"><b>Resultado esperado:</b> ${escapeHtml(result)}</p>` : ''}
        </div>`;
      });
    }

    // Quick Wins & Risks side by side
    const quickWins = safeArray(summary.quickWins);
    const risks = safeArray(summary.risksToAvoid);
    if (quickWins.length > 0 || risks.length > 0) {
      content += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">`;
      if (quickWins.length > 0) {
        content += `<div><h3 style="margin-bottom:8px">⚡ Victorias Rápidas</h3>`;
        quickWins.forEach((item: any) => {
          const text = typeof item === 'string' ? item : safeStr(item?.win);
          const effort = typeof item === 'object' ? safeStr(item?.effort) : '';
          const impact = typeof item === 'object' ? safeStr(item?.impact) : '';
          content += `<div style="padding:8px;margin-bottom:6px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px">
            <p style="margin:0;font-size:12px">${escapeHtml(text)}</p>
            ${effort || impact ? `<div style="margin-top:4px;font-size:10px;color:#6b7280">${effort ? `<span style="background:#ccfbf1;padding:1px 6px;border-radius:3px;margin-right:4px">Esfuerzo: ${escapeHtml(effort)}</span>` : ''}${impact ? `<span style="background:#d1fae5;padding:1px 6px;border-radius:3px">Impacto: ${escapeHtml(impact)}</span>` : ''}</div>` : ''}
          </div>`;
        });
        content += `</div>`;
      }
      if (risks.length > 0) {
        content += `<div><h3 style="margin-bottom:8px">⚠️ Riesgos a Evitar</h3>`;
        risks.forEach((item: any) => {
          const text = typeof item === 'string' ? item : safeStr(item?.risk);
          const why = typeof item === 'object' ? safeStr(item?.why) : '';
          content += `<div style="padding:8px;margin-bottom:6px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px">
            <p style="margin:0;font-size:12px;font-weight:600;color:#dc2626">${escapeHtml(text)}</p>
            ${why ? `<p style="margin:2px 0 0;font-size:11px;color:#6b7280">${escapeHtml(why)}</p>` : ''}
          </div>`;
        });
        content += `</div>`;
      }
      content += `</div>`;
    }

    if (safeStr(summary.finalRecommendation)) {
      content += `
        <div class="recommendation-box">
          <div class="rec-header">🎯 Recomendación Final</div>
          <p>${escapeHtml(summary.finalRecommendation)}</p>
        </div>`;
    }

    addSection('executive-summary', '📊', 'Conclusión Ejecutiva', content, false);
  }

  // ── SECTION: Market Overview ────────────────────────────────────────────────
  if (marketResearch) {
    let content = '';

    // Key metrics grid
    const metrics: { icon: string; label: string; value: string }[] = [];
    if (safeStr(marketResearch.marketSize)) metrics.push({ icon: '📈', label: 'Tamaño del Mercado', value: marketResearch.marketSize });
    if (safeStr(marketResearch.growthTrend)) metrics.push({ icon: '📊', label: 'Tendencia de Crecimiento', value: marketResearch.growthTrend });
    if (safeStr(marketResearch.marketState)) metrics.push({ icon: '🏷️', label: 'Estado del Mercado', value: marketResearch.marketState });
    if (safeStr(marketResearch.awarenessLevel)) metrics.push({ icon: '🧠', label: 'Nivel de Conciencia', value: marketResearch.awarenessLevel });

    if (metrics.length > 0) {
      content += `<div class="metrics-grid">`;
      metrics.forEach(m => {
        content += `
          <div class="metric-card">
            <div class="metric-icon">${m.icon}</div>
            <div class="metric-label">${m.label}</div>
            <div class="metric-value">${escapeHtml(m.value)}</div>
          </div>`;
      });
      content += `</div>`;
    }

    if (safeStr(marketResearch.marketStateExplanation)) {
      content += `<p class="body-text">${escapeHtml(marketResearch.marketStateExplanation)}</p>`;
    }

    const macroVars = safeArray(marketResearch.macroVariables);
    if (macroVars.length > 0) {
      content += `<h3>🔮 Variables Macroeconómicas</h3>
        <table class="data-table compact">
          <thead><tr><th>Factor</th><th>Tipo</th><th>Impacto</th><th>Implicación</th></tr></thead>
          <tbody>`;
      macroVars.forEach((v: any) => {
        if (typeof v === 'string') {
          content += `<tr><td colspan="4">${escapeHtml(v)}</td></tr>`;
        } else {
          content += `<tr>
            <td>${escapeHtml(safeStr(v?.factor, '-'))}</td>
            <td><span class="tag blue">${escapeHtml(safeStr(v?.type, '-'))}</span></td>
            <td>${escapeHtml(safeStr(v?.impact, '-'))}</td>
            <td>${escapeHtml(safeStr(v?.implication, '-'))}</td>
          </tr>`;
        }
      });
      content += `</tbody></table>`;
    }

    const opportunities = safeArray(marketResearch.opportunities);
    const threats = safeArray(marketResearch.threats);
    if (opportunities.length > 0 || threats.length > 0) {
      content += `<div class="two-col">`;
      if (opportunities.length > 0) {
        content += `<div class="col"><h3>✅ Oportunidades</h3><ul class="styled-list green">`;
        opportunities.forEach((o: any) => {
          if (typeof o === 'string') {
            content += `<li>${escapeHtml(o)}</li>`;
          } else {
            const text = safeStr(o?.opportunity || o?.text, '');
            const why = safeStr(o?.why, '');
            const how = safeStr(o?.howToCapture, '');
            content += `<li><strong>${escapeHtml(text)}</strong>${why ? `<br><small class="text-muted">Por qué: ${escapeHtml(why)}</small>` : ''}${how ? `<br><small class="text-muted">Cómo capturar: ${escapeHtml(how)}</small>` : ''}</li>`;
          }
        });
        content += `</ul></div>`;
      }
      if (threats.length > 0) {
        content += `<div class="col"><h3>⚠️ Amenazas</h3><ul class="styled-list red">`;
        threats.forEach((t: any) => {
          if (typeof t === 'string') {
            content += `<li>${escapeHtml(t)}</li>`;
          } else {
            const text = safeStr(t?.threat || t?.text, '');
            const risk = safeStr(t?.riskLevel, '');
            const mitigation = safeStr(t?.mitigation, '');
            content += `<li><strong>${escapeHtml(text)}</strong>${risk ? ` <span class="tag ${risk === 'alto' ? 'red' : risk === 'medio' ? 'amber' : 'green'}">${escapeHtml(risk)}</span>` : ''}${mitigation ? `<br><small class="text-muted">Mitigación: ${escapeHtml(mitigation)}</small>` : ''}</li>`;
          }
        });
        content += `</ul></div>`;
      }
      content += `</div>`;
    }

    if (safeStr(marketResearch.summary)) {
      content += `<div class="highlight-box blue"><h4>📋 Resumen Ejecutivo del Mercado</h4><p>${escapeHtml(marketResearch.summary)}</p></div>`;
    }

    addSection('market-overview', '🌍', 'Panorama del Mercado', content);
  }

  // ── SECTION: JTBD Analysis ──────────────────────────────────────────────────
  if (jtbdData) {
    let content = '';

    // JTBD cards
    const jtbdCards = [
      { key: 'functional', icon: '⚡', label: 'JTBD Funcional', color: 'blue' },
      { key: 'emotional', icon: '💝', label: 'JTBD Emocional', color: 'pink' },
      { key: 'social', icon: '👥', label: 'JTBD Social', color: 'purple' },
    ];
    const activeCards = jtbdCards.filter(c => renderJtbd(jtbdData[c.key]));
    if (activeCards.length > 0) {
      content += `<div class="jtbd-grid">`;
      activeCards.forEach(c => {
        content += `
          <div class="jtbd-card ${c.color}">
            <div class="jtbd-icon">${c.icon}</div>
            <h4>${c.label}</h4>
            <p>${escapeHtml(renderJtbd(jtbdData[c.key]))}</p>
          </div>`;
      });
      content += `</div>`;
    }

    // Pains, Desires, Objections, Insights
    const jtbdLists = [
      { key: 'pains', icon: '😣', title: '10 Dolores Profundos', textKey: 'pain', color: 'red' },
      { key: 'desires', icon: '✨', title: '10 Deseos Aspiracionales', textKey: 'desire', color: 'green' },
      { key: 'objections', icon: '🛡️', title: '10 Objeciones y Miedos', textKey: 'objection', color: 'amber' },
      { key: 'insights', icon: '💡', title: '10 Insights Estratégicos', textKey: 'insight', color: 'purple' },
    ];

    jtbdLists.forEach(list => {
      const items = safeArray(jtbdData[list.key]);
      if (items.length > 0) {
        content += `<h3>${list.icon} ${list.title}</h3><ol class="styled-list ${list.color}">`;
        items.forEach((item: any) => {
          if (typeof item === 'string') {
            content += `<li>${escapeHtml(item)}</li>`;
          } else if (item && typeof item === 'object') {
            const mainText = safeStr(item[list.textKey] || item.text, '');
            const details: string[] = [];
            // Extract secondary properties based on list type
            if (list.key === 'pains') {
              if (item.why) details.push(`<strong>Por qué duele:</strong> ${escapeHtml(safeStr(item.why))}`);
              if (item.impact) details.push(`<strong>Impacto:</strong> ${escapeHtml(safeStr(item.impact))}`);
            } else if (list.key === 'desires') {
              if (item.emotion) details.push(`<strong>Emoción:</strong> ${escapeHtml(safeStr(item.emotion))}`);
              if (item.idealState) details.push(`<strong>Estado ideal:</strong> ${escapeHtml(safeStr(item.idealState))}`);
            } else if (list.key === 'objections') {
              if (item.belief) details.push(`<strong>Creencia limitante:</strong> ${escapeHtml(safeStr(item.belief))}`);
              if (item.counter) details.push(`<strong>Respuesta:</strong> ${escapeHtml(safeStr(item.counter))}`);
            } else if (list.key === 'insights') {
              if (item.category) details.push(`<strong>Categoría:</strong> ${escapeHtml(safeStr(item.category))}`);
              if (item.actionable) details.push(`<strong>Acción:</strong> ${escapeHtml(safeStr(item.actionable))}`);
            }
            content += `<li><strong>${escapeHtml(mainText)}</strong>${details.length > 0 ? `<br><small class="text-muted">${details.join(' · ')}</small>` : ''}</li>`;
          }
        });
        content += `</ol>`;
      }
    });

    addSection('jtbd-analysis', '🎯', 'Análisis JTBD (Jobs To Be Done)', content);
  }

  // ── SECTION: Avatar Profiles ────────────────────────────────────────────────
  const profiles = safeArray(avatarProfiles?.profiles || avatarProfiles?.avatars || avatarProfiles);
  if (profiles.length > 0) {
    let content = '';

    profiles.forEach((avatar: any, idx: number) => {
      const name = safeStr(avatar?.name, `Avatar ${idx + 1}`);
      // Demographics — handle both flat and nested structures
      const demo = avatar?.demographics || {};
      const age = safeStr(avatar?.age || demo?.age, '');
      const occupation = safeStr(demo?.occupation || avatar?.occupation, '');
      const family = safeStr(demo?.familySituation || demo?.family, '');
      const location = safeStr(demo?.location || avatar?.location, '');
      const socio = safeStr(demo?.socioeconomicLevel || demo?.socioeconomic, '');
      const awareness = safeStr(avatar?.psychographics?.awarenessLevel || avatar?.awarenessLevel, '');

      content += `<div class="avatar-card">`;
      content += `<div class="avatar-header"><div class="avatar-number">${idx + 1}</div><div><h3>${escapeHtml(name)}</h3>`;
      if (age) content += `<span class="avatar-age">${escapeHtml(age)}</span>`;
      if (awareness) content += `<span class="awareness-badge">${escapeHtml(awareness)}</span>`;
      content += `</div></div>`;

      // Demographics section
      const demoItems = [occupation, family, location, socio].filter(Boolean);
      if (demoItems.length > 0) {
        content += `<div class="avatar-detail blue"><span class="detail-label">👤 Datos Demográficos</span><p>`;
        if (occupation) content += `<strong>Ocupación:</strong> ${escapeHtml(occupation)}<br>`;
        if (family) content += `<strong>Familia:</strong> ${escapeHtml(family)}<br>`;
        if (location) content += `<strong>Ubicación:</strong> ${escapeHtml(location)}<br>`;
        if (socio) content += `<strong>Nivel socioeconómico:</strong> ${escapeHtml(socio)}`;
        content += `</p></div>`;
      }

      // Situation — handle nested object
      const situation = avatar?.situation;
      if (situation) {
        content += `<div class="avatar-detail blue"><span class="detail-label">📍 Situación Actual</span>`;
        if (typeof situation === 'string') {
          content += `<p>${escapeHtml(situation)}</p>`;
        } else if (typeof situation === 'object') {
          if (situation.dayToDay) content += `<p>${escapeHtml(safeStr(situation.dayToDay))}</p>`;
          if (situation.previousAttempts) content += `<p><strong>Intentos previos:</strong> ${escapeHtml(safeStr(situation.previousAttempts))}</p>`;
          if (situation.whyDidntWork) content += `<p><strong>Por qué no funcionó:</strong> ${escapeHtml(safeStr(situation.whyDidntWork))}</p>`;
          if (situation.currentFeeling) content += `<p><strong>Sentimiento actual:</strong> ${escapeHtml(safeStr(situation.currentFeeling))}</p>`;
        }
        content += `</div>`;
      }

      // Psychographics — drivers, biases, objections, values, fears
      const psych = avatar?.psychographics || {};
      const drivers = safeArray(psych?.drivers || avatar?.drivers);
      if (drivers.length > 0) {
        content += `<div class="avatar-detail green"><span class="detail-label">🧠 Drivers Psicológicos</span><div class="tags">`;
        drivers.forEach((d: any) => { content += `<span class="tag green">${escapeHtml(safeStr(d))}</span>`; });
        content += `</div></div>`;
      }

      const biases = safeArray(psych?.biases || avatar?.biases);
      if (biases.length > 0) {
        content += `<div class="avatar-detail purple"><span class="detail-label">💭 Sesgos Cognitivos</span><div class="tags">`;
        biases.forEach((b: any) => { content += `<span class="tag purple">${escapeHtml(safeStr(b))}</span>`; });
        content += `</div></div>`;
      }

      const objections = safeArray(psych?.objections || avatar?.objections);
      if (objections.length > 0) {
        content += `<div class="avatar-detail amber"><span class="detail-label">⚠️ Objeciones Clave</span><div class="tags">`;
        objections.forEach((o: any) => { content += `<span class="tag amber">${escapeHtml(safeStr(o))}</span>`; });
        content += `</div></div>`;
      }

      const values = safeArray(psych?.values);
      if (values.length > 0) {
        content += `<div class="avatar-detail blue"><span class="detail-label">💎 Valores</span><div class="tags">`;
        values.forEach((v: any) => { content += `<span class="tag blue">${escapeHtml(safeStr(v))}</span>`; });
        content += `</div></div>`;
      }

      const fears = safeArray(psych?.deepestFears || psych?.fears);
      if (fears.length > 0) {
        content += `<div class="avatar-detail red"><span class="detail-label">😰 Miedos Profundos</span><div class="tags">`;
        fears.forEach((f: any) => { content += `<span class="tag red">${escapeHtml(safeStr(f))}</span>`; });
        content += `</div></div>`;
      }

      // Behavior
      const behavior = avatar?.behavior || {};
      const behaviorItems = [behavior?.shortTermGoals, behavior?.longTermGoals, behavior?.researchProcess].filter(Boolean);
      if (behaviorItems.length > 0) {
        content += `<div class="avatar-detail blue"><span class="detail-label">🎯 Comportamiento</span>`;
        if (behavior.shortTermGoals) content += `<p><strong>Metas corto plazo:</strong> ${escapeHtml(safeStr(behavior.shortTermGoals))}</p>`;
        if (behavior.longTermGoals) content += `<p><strong>Metas largo plazo:</strong> ${escapeHtml(safeStr(behavior.longTermGoals))}</p>`;
        const platforms = safeArray(behavior.contentPlatforms);
        if (platforms.length > 0) content += `<p><strong>Plataformas:</strong> ${platforms.map((p: any) => escapeHtml(safeStr(p))).join(', ')}</p>`;
        if (behavior.influencersFollowed) content += `<p><strong>Influencers:</strong> ${escapeHtml(safeStr(behavior.influencersFollowed))}</p>`;
        if (behavior.researchProcess) content += `<p><strong>Proceso de investigación:</strong> ${escapeHtml(safeStr(behavior.researchProcess))}</p>`;
        content += `</div>`;
      }

      // Purchase trigger
      const trigger = avatar?.purchaseTrigger || {};
      const triggerItems = [trigger?.triggerEvent, trigger?.trustSignals, trigger?.ahamoment || trigger?.ahaMoment, trigger?.actionToday].filter(Boolean);
      if (triggerItems.length > 0) {
        content += `<div class="avatar-detail green"><span class="detail-label">🔥 Gatillo de Compra</span>`;
        if (trigger.triggerEvent) content += `<p><strong>Evento gatillo:</strong> ${escapeHtml(safeStr(trigger.triggerEvent))}</p>`;
        if (trigger.trustSignals) content += `<p><strong>Señales de confianza:</strong> ${escapeHtml(safeStr(trigger.trustSignals))}</p>`;
        const aha = trigger.ahamoment || trigger.ahaMoment;
        if (aha) content += `<p><strong>Momento "ajá":</strong> ${escapeHtml(safeStr(aha))}</p>`;
        if (trigger.actionToday) content += `<p><strong>Qué lo haría actuar hoy:</strong> ${escapeHtml(safeStr(trigger.actionToday))}</p>`;
        content += `</div>`;
      }

      // Communication — phrases
      const comm = avatar?.communication || {};
      const phrases = safeArray(comm?.phrases || avatar?.phrases);
      if (phrases.length > 0) {
        content += `<div class="avatar-detail blue"><span class="detail-label">💬 Frases Reales</span><div class="phrases-grid">`;
        phrases.forEach((phrase: any) => {
          content += `<div class="phrase">"${escapeHtml(safeStr(phrase))}"</div>`;
        });
        content += `</div>`;
        const tone = safeStr(comm?.preferredTone);
        if (tone) content += `<p style="margin-top:6px;"><strong>Tono preferido:</strong> ${escapeHtml(tone)}</p>`;
        content += `</div>`;
      }

      content += `</div>`;
    });

    addSection('avatar-profiles', '👥', '5 Avatares Estratégicos', content);
  }

  // ── SECTION: Competition Analysis ───────────────────────────────────────────
  const competitors = safeArray(competitorAnalysis?.competitors);
  if (competitors.length > 0) {
    let content = '';

    content += `
      <table class="data-table">
        <thead>
          <tr>
            <th width="20%">Marca</th>
            <th width="20%">Promesa</th>
            <th width="20%">Diferenciador</th>
            <th width="15%">Precio</th>
            <th width="15%">Tono</th>
          </tr>
        </thead>
        <tbody>`;
    competitors.forEach((comp: any, idx: number) => {
      content += `
        <tr>
          <td><strong>${escapeHtml(safeStr(comp?.name, `Competidor ${idx + 1}`))}</strong></td>
          <td>${escapeHtml(safeStr(comp?.promise, '-'))}</td>
          <td>${escapeHtml(safeStr(comp?.differentiator, '-'))}</td>
          <td>${escapeHtml(safeStr(comp?.price, '-'))}</td>
          <td>${escapeHtml(safeStr(comp?.tone, '-'))}</td>
        </tr>`;
    });
    content += `</tbody></table>`;

    // Detailed competitor cards
    competitors.slice(0, 5).forEach((comp: any, idx: number) => {
      const name = safeStr(comp?.name, `Competidor ${idx + 1}`);
      const vp = safeStr(comp?.valueProposition);
      const strengths = safeArray(comp?.strengths);
      const weaknesses = safeArray(comp?.weaknesses);

      if (vp || strengths.length > 0 || weaknesses.length > 0) {
        content += `<div class="competitor-card">`;
        content += `<h4>${escapeHtml(name)}</h4>`;
        if (vp) content += `<p><strong>Propuesta de Valor:</strong> ${escapeHtml(vp)}</p>`;
        if (strengths.length > 0) content += `<p class="text-green"><strong>Fortalezas:</strong> ${strengths.map((s: any) => escapeHtml(safeStr(s))).join(', ')}</p>`;
        if (weaknesses.length > 0) content += `<p class="text-red"><strong>Debilidades:</strong> ${weaknesses.map((w: any) => escapeHtml(safeStr(w))).join(', ')}</p>`;
        content += `</div>`;
      }
    });

    addSection('competition', '⚔️', 'Análisis de Competencia', content);
  }

  // ── SECTION: Differentiation Opportunities ──────────────────────────────────
  const differentiation = competitorAnalysis?.differentiation;
  if (differentiation) {
    let content = '';

    const repeatedMessages = safeArray(differentiation.repeatedMessages);
    if (repeatedMessages.length > 0) {
      content += `<h3>🚫 Mensajes Saturados (Evitar)</h3><div class="tags">`;
      repeatedMessages.forEach((item: any) => {
        const text = extractText(item, ['message', 'text']);
        content += `<span class="tag red">${escapeHtml(text)}</span>`;
      });
      content += `</div>`;
    }

    const posOpps = safeArray(differentiation.positioningOpportunities);
    if (posOpps.length > 0) {
      content += `<h3>✅ Oportunidades de Posicionamiento</h3><ol class="styled-list green">`;
      posOpps.forEach((item: any) => {
        const text = extractText(item, ['opportunity', 'text']);
        const why = typeof item === 'object' ? extractText(item, ['why']) : '';
        content += `<li><strong>${escapeHtml(text)}</strong>${why ? `<br><small class="text-muted">Por qué: ${escapeHtml(why)}</small>` : ''}</li>`;
      });
      content += `</ol>`;
    }

    const poorPains = safeArray(differentiation.poorlyAddressedPains);
    if (poorPains.length > 0) {
      content += `<h3>⚡ Dolores Mal Comunicados</h3><ul class="styled-list amber">`;
      poorPains.forEach((item: any) => {
        const text = extractText(item, ['pain', 'text']);
        content += `<li>${escapeHtml(text)}</li>`;
      });
      content += `</ul>`;
    }

    const emotions = safeArray(differentiation.unexploitedEmotions);
    if (emotions.length > 0) {
      content += `<h3>💝 Emociones No Explotadas</h3><div class="tags">`;
      emotions.forEach((item: any) => {
        const text = extractText(item, ['emotion', 'text']);
        content += `<span class="tag pink">${escapeHtml(text)}</span>`;
      });
      content += `</div>`;
    }

    addSection('differentiation', '💎', 'Oportunidades de Diferenciación', content);
  }

  // ── SECTION: Sales Angles ───────────────────────────────────────────────────
  const angles = safeArray(salesAnglesData?.angles);
  if (angles.length > 0) {
    const funnelLabels: Record<string, string> = { tofu: 'TOFU', mofu: 'MOFU', bofu: 'BOFU' };
    const funnelColors: Record<string, string> = { tofu: '#0ea5e9', mofu: '#f59e0b', bofu: '#22c55e' };

    let content = `
      <table class="data-table compact">
        <thead>
          <tr>
            <th width="4%">#</th>
            <th width="22%">Ángulo</th>
            <th width="8%">Tipo</th>
            <th width="7%">Funnel</th>
            <th width="12%">Avatar</th>
            <th width="9%">Emoción</th>
            <th width="8%">Formato</th>
            <th width="30%">Hook</th>
          </tr>
        </thead>
        <tbody>`;
    angles.forEach((angle: any, idx: number) => {
      const typeVal = safeStr(angle?.type, '');
      const typeClass = typeVal.toLowerCase().replace(/[\s-]/g, '');
      const funnelVal = safeStr(angle?.funnelPhase, '');
      const funnelLabel = funnelLabels[funnelVal] || funnelVal.toUpperCase();
      const funnelColor = funnelColors[funnelVal] || '#9ca3af';
      content += `
        <tr>
          <td class="text-center"><strong>${idx + 1}</strong></td>
          <td>${escapeHtml(safeStr(angle?.angle, '-'))}</td>
          <td><span class="phase-badge ${typeClass}">${escapeHtml(typeVal || '-')}</span></td>
          <td>${funnelVal ? `<span style="background:${funnelColor}15;color:${funnelColor};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600">${funnelLabel}</span>` : '-'}</td>
          <td>${escapeHtml(safeStr(angle?.avatar, '-'))}</td>
          <td>${escapeHtml(safeStr(angle?.emotion, '-'))}</td>
          <td>${escapeHtml(safeStr(angle?.contentType, '-'))}</td>
          <td><em>${escapeHtml(safeStr(angle?.hookExample, '-'))}</em></td>
        </tr>`;
    });
    content += `</tbody></table>`;

    // Detail cards for each angle
    content += `<div style="margin-top:16px">`;
    angles.forEach((angle: any, idx: number) => {
      const cta = safeStr(angle?.ctaExample, '');
      const whyWorks = safeStr(angle?.whyItWorks, '');
      const devTips = safeStr(angle?.developmentTips, '');
      const hashtags = safeArray(angle?.hashtags);
      if (cta || whyWorks || devTips || hashtags.length > 0) {
        content += `<div style="margin-bottom:10px;padding:10px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;page-break-inside:avoid">
          <strong style="color:#6366f1">#${idx + 1} — ${escapeHtml(safeStr(angle?.type, ''))}</strong>`;
        if (cta) content += `<div style="margin-top:6px"><span style="font-weight:600;color:#16a34a">CTA:</span> ${escapeHtml(cta)}</div>`;
        if (whyWorks) content += `<div style="margin-top:4px"><span style="font-weight:600;color:#7c3aed">Por qué funciona:</span> ${escapeHtml(whyWorks)}</div>`;
        if (devTips) content += `<div style="margin-top:4px"><span style="font-weight:600;color:#2563eb">Desarrollo:</span> ${escapeHtml(devTips)}</div>`;
        if (hashtags.length > 0) content += `<div style="margin-top:6px">${hashtags.map((t: any) => `<span style="background:#eff6ff;color:#3b82f6;padding:2px 6px;border-radius:3px;font-size:10px;margin-right:4px">#${escapeHtml(safeStr(t, '').replace(/^#/, ''))}</span>`).join('')}</div>`;
        content += `</div>`;
      }
    });
    content += `</div>`;

    addSection('sales-angles', '🎯', '20 Ángulos de Venta Estratégicos', content);
  }

  // ── SECTION: PUV & Transformation ──────────────────────────────────────────
  const puv = salesAnglesData?.puv;
  const transformation = salesAnglesData?.transformation;
  if (puv || transformation) {
    let content = '';

    if (safeStr(puv?.statement)) {
      content += `
        <div class="puv-statement">
          <div class="puv-label">Propuesta Única de Valor (PUV)</div>
          <blockquote>"${escapeHtml(puv.statement)}"</blockquote>
        </div>`;
    }

    const puvCards = [
      { key: 'centralProblem', icon: '🎯', label: 'Problema Central' },
      { key: 'tangibleResult', icon: '✨', label: 'Resultado Tangible' },
      { key: 'marketDifference', icon: '🏆', label: 'Diferencia vs Mercado' },
      { key: 'idealClient', icon: '👤', label: 'Cliente Ideal' },
    ];
    const activePuvCards = puvCards.filter(c => safeStr(puv?.[c.key]));
    if (activePuvCards.length > 0) {
      content += `<div class="metrics-grid">`;
      activePuvCards.forEach(c => {
        content += `
          <div class="metric-card">
            <div class="metric-icon">${c.icon}</div>
            <div class="metric-label">${c.label}</div>
            <div class="metric-value">${escapeHtml(safeStr(puv[c.key]))}</div>
          </div>`;
      });
      content += `</div>`;
    }

    if (transformation) {
      const dimensions = [
        { key: 'functional', icon: '🔧', label: 'Funcional' },
        { key: 'emotional', icon: '💝', label: 'Emocional' },
        { key: 'identity', icon: '👤', label: 'Identidad' },
        { key: 'social', icon: '🤝', label: 'Social' },
        { key: 'financial', icon: '💰', label: 'Financiero' },
      ];
      const activeDims = dimensions.filter(d => safeStr(transformation[d.key]?.before) || safeStr(transformation[d.key]?.after));
      if (activeDims.length > 0) {
        content += `<h3>🔄 Transformación: Antes vs Después</h3>
          <table class="data-table transformation-table">
            <thead>
              <tr>
                <th width="20%">Dimensión</th>
                <th width="40%">❌ Antes</th>
                <th width="40%">✅ Después</th>
              </tr>
            </thead>
            <tbody>`;
        activeDims.forEach(d => {
          content += `
            <tr>
              <td><strong>${d.icon} ${d.label}</strong></td>
              <td class="cell-before">${escapeHtml(safeStr(transformation[d.key]?.before, '-'))}</td>
              <td class="cell-after">${escapeHtml(safeStr(transformation[d.key]?.after, '-'))}</td>
            </tr>`;
        });
        content += `</tbody></table>`;
      }
    }

    addSection('puv-transformation', '🏆', 'PUV y Transformación', content);
  }

  // ── SECTION: Esfera Insights ────────────────────────────────────────────────
  const esfera = contentStrategy?.esferaInsights;
  if (esfera) {
    let content = '';

    const phases = [
      {
        key: 'enganchar', num: '1', icon: '🔴', title: 'ENGANCHAR', subtitle: 'Captar atención (TOFU)', color: 'red',
        fields: [
          { key: 'marketDominance', label: 'Qué domina el mercado', type: 'text' },
          { key: 'saturated', label: 'Qué está saturado', type: 'warning' },
          { key: 'opportunities', label: 'Oportunidades creativas', type: 'list' },
          { key: 'hookTypes', label: 'Tipos de hooks efectivos', type: 'list' },
          { key: 'platforms', label: 'Plataformas recomendadas', type: 'tags' },
          { key: 'contentFormats', label: 'Formatos de contenido', type: 'tags' },
        ]
      },
      {
        key: 'solucion', num: '2', icon: '🔵', title: 'SOLUCIÓN', subtitle: 'Presentar y construir autoridad (MOFU)', color: 'blue',
        fields: [
          { key: 'currentPromises', label: 'Promesas actuales en el mercado', type: 'text' },
          { key: 'unresolvedObjections', label: 'Objeciones no resueltas', type: 'warning' },
          { key: 'trustOpportunities', label: 'Oportunidades de autoridad', type: 'list' },
          { key: 'educationAngles', label: 'Ángulos educativos', type: 'list' },
          { key: 'proofTypes', label: 'Tipos de prueba social', type: 'tags' },
        ]
      },
      {
        key: 'remarketing', num: '3', icon: '🟣', title: 'REMARKETING', subtitle: 'Reforzar y empujar decisión (BOFU)', color: 'purple',
        fields: [
          { key: 'existingProof', label: 'Prueba social existente', type: 'text' },
          { key: 'gaps', label: 'Brechas de prueba social', type: 'warning' },
          { key: 'decisionMessages', label: 'Mensajes que empujan decisión', type: 'list' },
          { key: 'urgencyTactics', label: 'Tácticas de urgencia', type: 'list' },
          { key: 'objectionHandling', label: 'Manejo de objeciones', type: 'list' },
          { key: 'touchpointSequence', label: 'Secuencia de touchpoints', type: 'list' },
        ]
      },
      {
        key: 'fidelizar', num: '4', icon: '🟢', title: 'FIDELIZAR', subtitle: 'Retener y convertir en embajadores', color: 'green',
        fields: [
          { key: 'commonErrors', label: 'Errores comunes post-venta', type: 'warning' },
          { key: 'communityOpportunities', label: 'Oportunidades de comunidad', type: 'list' },
          { key: 'retentionStrategies', label: 'Estrategias de retención', type: 'list' },
          { key: 'referralAngles', label: 'Ángulos de referidos', type: 'list' },
          { key: 'postPurchaseContent', label: 'Contenido post-compra', type: 'list' },
        ]
      },
    ];

    phases.forEach(phase => {
      const data = esfera[phase.key];
      if (!data) return;

      content += `<div class="esfera-phase ${phase.color}">`;
      content += `<div class="phase-header"><span class="phase-num">${phase.num}</span><div><strong>${phase.title}</strong> — ${phase.subtitle}</div></div>`;

      phase.fields.forEach(f => {
        const val = data[f.key];
        if (val == null) return;
        if (f.type === 'text' && safeStr(val)) {
          content += `<div class="phase-field"><span class="field-label">${f.label}:</span> ${escapeHtml(safeStr(val))}</div>`;
        } else if (f.type === 'warning' && safeStr(val)) {
          content += `<div class="phase-warning"><span class="field-label">${f.label}:</span> ${escapeHtml(safeStr(val))}</div>`;
        } else if (f.type === 'list') {
          const items = safeArray(val);
          if (items.length > 0) {
            content += `<div class="phase-field"><span class="field-label">${f.label}:</span><ul>`;
            items.forEach((item: any) => { content += `<li>${escapeHtml(safeStr(item))}</li>`; });
            content += `</ul></div>`;
          }
        } else if (f.type === 'tags') {
          const items = safeArray(val);
          if (items.length > 0) {
            content += `<div class="phase-field"><span class="field-label">${f.label}:</span><div class="tags" style="margin-top:4px">`;
            items.forEach((item: any) => { content += `<span class="tag ${phase.color === 'red' ? 'pink' : phase.color}">${escapeHtml(safeStr(item))}</span>`; });
            content += `</div></div>`;
          }
        }
      });

      content += `</div>`;
    });

    addSection('esfera-insights', '🧠', 'Método ESFERA - Insights por Fase', content);
  }

  // ── SECTION: Lead Magnets & Creatives ───────────────────────────────────────
  const leadMagnets = safeArray(salesAnglesData?.leadMagnets);
  const videoCreatives = safeArray(salesAnglesData?.videoCreatives);
  if (leadMagnets.length > 0 || videoCreatives.length > 0) {
    let content = '';

    if (leadMagnets.length > 0) {
      content += `<h3>📋 Lead Magnets Estratégicos</h3><div class="lm-grid">`;
      leadMagnets.forEach((lm: any, idx: number) => {
        const phase = safeStr(lm?.awarenessPhase, '');
        const phaseClass = phase.toLowerCase().replace(/[_\s]/g, '');
        content += `
          <div class="lm-card">
            <div class="lm-number">${idx + 1}</div>
            <div class="lm-content">
              <h4>${escapeHtml(safeStr(lm?.name, `Lead Magnet ${idx + 1}`))}</h4>
              ${safeStr(lm?.promise) ? `<p style="font-style:italic;color:#6d28d9;">"${escapeHtml(lm.promise)}"</p>` : ''}
              ${safeStr(lm?.format) ? `<p><span class="label">Formato:</span> ${escapeHtml(lm.format)}</p>` : ''}
              ${safeStr(lm?.objective) ? `<p><span class="label">Objetivo:</span> ${escapeHtml(lm.objective)}</p>` : ''}
              ${safeStr(lm?.pain) ? `<p><span class="label">Dolor que ataca:</span> ${escapeHtml(lm.pain)}</p>` : ''}
              ${safeStr(lm?.avatar) ? `<p><span class="label">Avatar:</span> ${escapeHtml(lm.avatar)}</p>` : ''}
              ${phase ? `<p><span class="label">Fase:</span> <span class="phase-badge ${phaseClass}">${escapeHtml(phase)}</span></p>` : ''}
              ${safeStr(lm?.deliveryMethod) ? `<p><span class="label">Entrega:</span> ${escapeHtml(lm.deliveryMethod)}</p>` : ''}
              ${safeStr(lm?.estimatedTime) ? `<p><span class="label">Tiempo estimado:</span> ${escapeHtml(lm.estimatedTime)}</p>` : ''}
              ${safeArray(lm?.structure).length > 0 ? `<p><span class="label">Estructura:</span></p><ol style="margin-left:16px">${safeArray(lm.structure).map((s: any) => `<li>${escapeHtml(safeStr(s))}</li>`).join('')}</ol>` : ''}
            </div>
          </div>`;
      });
      content += `</div>`;
    }

    if (videoCreatives.length > 0) {
      content += `<h3>🎬 Creativos por Fase ESFERA</h3>
        <table class="data-table compact">
          <thead>
            <tr>
              <th width="5%">#</th>
              <th width="15%">Fase</th>
              <th width="25%">Título</th>
              <th width="35%">Idea</th>
              <th width="15%">Formato</th>
            </tr>
          </thead>
          <tbody>`;
      videoCreatives.slice(0, 20).forEach((vc: any, idx: number) => {
        const phase = safeStr(vc?.esferaPhase);
        const phaseClass = phase.toLowerCase().replace(/\s/g, '');
        content += `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td><span class="phase-badge ${phaseClass}">${escapeHtml(phase || '-')}</span></td>
            <td>${escapeHtml(safeStr(vc?.title, '-'))}</td>
            <td>${escapeHtml(safeStr(vc?.idea, '-'))}</td>
            <td>${escapeHtml(safeStr(vc?.format, '-'))}</td>
          </tr>`;
      });
      content += `</tbody></table>`;
    }

    addSection('lead-magnets', '🎁', 'Lead Magnets y Creativos', content);
  }

  // ── SECTION: Content Calendar (Parrilla de Contenido) ───────────────────────
  const calendarItems = safeArray(contentCalendar?.calendar);
  if (calendarItems.length > 0) {
    let content = '';

    // Weekly themes
    const weeklyThemes = safeArray(contentCalendar?.weeklyThemes);
    if (weeklyThemes.length > 0) {
      content += `<h3>📅 Temas Semanales</h3><div class="grid-2col">`;
      weeklyThemes.forEach((wt: any) => {
        content += `
          <div class="highlight-box blue">
            <strong>Semana ${wt.week || '?'}: ${escapeHtml(safeStr(wt.theme, 'Tema'))}</strong>
            <p>${escapeHtml(safeStr(wt.objective, ''))}</p>
            ${wt.focusPhase ? `<p><em>Fase: ${escapeHtml(wt.focusPhase)}</em></p>` : ''}
          </div>`;
      });
      content += `</div>`;
    }

    // Calendar table by week
    for (let week = 1; week <= 4; week++) {
      const weekItems = calendarItems.filter((item: any) => item.week === week);
      if (weekItems.length === 0) continue;

      content += `<h3>Semana ${week}</h3>
        <table><thead><tr>
          <th style="width:8%">Día</th>
          <th style="width:12%">Plataforma</th>
          <th style="width:12%">Formato</th>
          <th style="width:10%">Pilar</th>
          <th style="width:20%">Título</th>
          <th style="width:28%">Hook</th>
          <th style="width:10%">ESFERA</th>
        </tr></thead><tbody>`;
      weekItems.forEach((item: any) => {
        content += `
          <tr>
            <td>D${item.day || '?'}</td>
            <td>${escapeHtml(safeStr(item.platform, '-'))}</td>
            <td>${escapeHtml(safeStr(item.format, '-'))}</td>
            <td>${escapeHtml(safeStr(item.pillar, '-'))}</td>
            <td>${escapeHtml(safeStr(item.title, '-'))}</td>
            <td><em>${escapeHtml(safeStr(item.hook, '-'))}</em></td>
            <td><span class="phase-badge ${safeStr(item.esferaPhase).toLowerCase()}">${escapeHtml(safeStr(item.esferaPhase, '-'))}</span></td>
          </tr>`;
      });
      content += `</tbody></table>`;
    }

    addSection('content-calendar', '📅', 'Parrilla de Contenido — 30 Días', content);
  }

  // ── SECTION: Launch Strategy ────────────────────────────────────────────────
  if (launchStrategy && (launchStrategy.preLaunch || launchStrategy.launch)) {
    let content = '';

    // Pre-Launch
    if (launchStrategy.preLaunch) {
      const pre = launchStrategy.preLaunch;
      content += `<h3>🚀 Pre-Lanzamiento ${pre.duration ? `(${escapeHtml(pre.duration)})` : ''}</h3>`;

      const objectives = safeArray(pre.objectives);
      if (objectives.length > 0) {
        content += `<p><strong>Objetivos:</strong></p><ul>`;
        objectives.forEach((o: string) => { content += `<li>${escapeHtml(o)}</li>`; });
        content += `</ul>`;
      }

      const actions = safeArray(pre.actions);
      if (actions.length > 0) {
        content += `<table><thead><tr><th>Semana</th><th>Canal</th><th>Acción</th><th>Detalles</th></tr></thead><tbody>`;
        actions.forEach((a: any) => {
          content += `<tr>
            <td>${escapeHtml(safeStr(a.week, '-'))}</td>
            <td>${escapeHtml(safeStr(a.channel, '-'))}</td>
            <td>${escapeHtml(safeStr(a.action, '-'))}</td>
            <td>${escapeHtml(safeStr(a.details, '-'))}</td>
          </tr>`;
        });
        content += `</tbody></table>`;
      }

      const checklist = safeArray(pre.checklist);
      if (checklist.length > 0) {
        content += `<h4>✅ Checklist</h4><div class="grid-2col">`;
        checklist.forEach((item: string) => {
          content += `<div class="highlight-box gray"><span>☐</span> ${escapeHtml(item)}</div>`;
        });
        content += `</div>`;
      }
    }

    // Launch Day
    if (launchStrategy.launch) {
      const launch = launchStrategy.launch;
      content += `<h3>🎯 Día de Lanzamiento</h3>`;

      const dayPlan = safeArray(launch.dayPlan);
      if (dayPlan.length > 0) {
        content += `<table><thead><tr><th>Hora</th><th>Acción</th><th>Canal</th><th>Detalles</th></tr></thead><tbody>`;
        dayPlan.forEach((step: any) => {
          content += `<tr>
            <td><strong>${escapeHtml(safeStr(step.time, '-'))}</strong></td>
            <td>${escapeHtml(safeStr(step.action, '-'))}</td>
            <td>${escapeHtml(safeStr(step.channel, '-'))}</td>
            <td>${escapeHtml(safeStr(step.details, '-'))}</td>
          </tr>`;
        });
        content += `</tbody></table>`;
      }

      // Offer
      if (launch.offer) {
        content += `<div class="highlight-box green">
          <h4>💰 Estructura de Oferta</h4>
          ${launch.offer.description ? `<p>${escapeHtml(launch.offer.description)}</p>` : ''}
          ${launch.offer.price ? `<p><strong>Precio:</strong> ${escapeHtml(launch.offer.price)}</p>` : ''}
          ${safeArray(launch.offer.bonuses).length > 0 ? `<p><strong>Bonos:</strong> ${safeArray(launch.offer.bonuses).map((b: string) => escapeHtml(b)).join(' | ')}</p>` : ''}
          ${launch.offer.guarantee ? `<p><strong>Garantía:</strong> ${escapeHtml(launch.offer.guarantee)}</p>` : ''}
        </div>`;
      }

      // Email Sequence
      const emails = safeArray(launch.emailSequence);
      if (emails.length > 0) {
        content += `<h4>📧 Secuencia de Emails</h4>
          <table><thead><tr><th>Día</th><th>Asunto</th><th>Resumen</th><th>CTA</th></tr></thead><tbody>`;
        emails.forEach((e: any) => {
          content += `<tr>
            <td>${escapeHtml(safeStr(e.day, '-'))}</td>
            <td><strong>${escapeHtml(safeStr(e.subject, '-'))}</strong></td>
            <td>${escapeHtml(safeStr(e.bodyOutline, '-'))}</td>
            <td>${escapeHtml(safeStr(e.cta, '-'))}</td>
          </tr>`;
        });
        content += `</tbody></table>`;
      }
    }

    // Post-Launch
    if (launchStrategy.postLaunch) {
      const post = launchStrategy.postLaunch;
      content += `<h3>🔄 Post-Lanzamiento</h3>`;

      const retention = safeArray(post.retentionActions);
      if (retention.length > 0) {
        content += `<p><strong>Acciones de retención:</strong></p><ul>`;
        retention.forEach((r: string) => { content += `<li>${escapeHtml(r)}</li>`; });
        content += `</ul>`;
      }

      if (post.referralStrategy) {
        content += `<div class="highlight-box blue"><h4>🤝 Estrategia de referidos</h4><p>${escapeHtml(post.referralStrategy)}</p></div>`;
      }

      const nonBuyer = safeArray(post.nonBuyerFollowUp);
      if (nonBuyer.length > 0) {
        content += `<p><strong>Follow-up no compradores:</strong></p><ul>`;
        nonBuyer.forEach((n: string) => { content += `<li>${escapeHtml(n)}</li>`; });
        content += `</ul>`;
      }
    }

    // Budget
    if (launchStrategy.budget) {
      const budget = launchStrategy.budget;
      content += `<h4>💵 Presupuesto</h4>`;
      if (budget.totalEstimated) {
        content += `<p><strong>Total estimado: ${escapeHtml(budget.totalEstimated)}</strong></p>`;
      }
      const allItems = [...safeArray(budget.organic).map((i: any) => ({ ...i, type: 'Orgánico' })), ...safeArray(budget.paid).map((i: any) => ({ ...i, type: 'Pagado' }))];
      if (allItems.length > 0) {
        content += `<table><thead><tr><th>Tipo</th><th>Item</th><th>Costo</th></tr></thead><tbody>`;
        allItems.forEach((item: any) => {
          content += `<tr><td>${escapeHtml(item.type)}</td><td>${escapeHtml(safeStr(item.item, '-'))}</td><td>${escapeHtml(safeStr(item.cost, '-'))}</td></tr>`;
        });
        content += `</tbody></table>`;
      }
    }

    // Timeline
    const timeline = safeArray(launchStrategy.timeline);
    if (timeline.length > 0) {
      content += `<h4>📆 Timeline</h4>
        <table><thead><tr><th>Fase</th><th>Semana</th><th>Hito</th><th>Entregables</th></tr></thead><tbody>`;
      timeline.forEach((t: any) => {
        content += `<tr>
          <td>${escapeHtml(safeStr(t.phase, '-'))}</td>
          <td>${escapeHtml(safeStr(t.week, '-'))}</td>
          <td>${escapeHtml(safeStr(t.milestone, '-'))}</td>
          <td>${safeArray(t.deliverables).map((d: string) => escapeHtml(d)).join(', ')}</td>
        </tr>`;
      });
      content += `</tbody></table>`;
    }

    addSection('launch-strategy', '🚀', 'Estrategia de Lanzamiento', content);
  }

  // ── BUILD TABLE OF CONTENTS ─────────────────────────────────────────────────
  let tocHtml = '';
  if (tocEntries.length > 1) {
    tocHtml = `
      <div class="toc">
        <h2>Contenido</h2>
        <div class="toc-list">
          ${tocEntries.map((entry, idx) => `
            <div class="toc-item">
              <span class="toc-num">${String(idx + 1).padStart(2, '0')}</span>
              <span class="toc-icon">${entry.icon}</span>
              <span class="toc-title">${entry.title}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  // ── EMPTY STATE ─────────────────────────────────────────────────────────────
  if (sectionsHtml === '') {
    sectionsHtml = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Sin datos de investigación disponibles</h3>
        <p>Este producto aún no tiene datos de investigación de mercado generados. Ejecuta la investigación con IA para generar el reporte completo.</p>
      </div>`;
  }

  // ── BUILD HTML DOCUMENT ─────────────────────────────────────────────────────
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Investigación de Mercado - ${escapeHtml(productName)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;
      @bottom-center {
        content: "Página " counter(page);
        font-size: 9px;
        color: #9ca3af;
      }
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      line-height: 1.65;
      font-size: 11px;
      background: white;
      counter-reset: page-counter;
    }

    /* ── COVER PAGE ─────────────────────────────────────── */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(145deg, #0f0a1e 0%, #1a0e35 35%, #2d1458 65%, #1a0e35 100%);
      padding: 60px 40px;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                  radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%);
    }
    .cover * { position: relative; z-index: 1; }
    .cover-logo {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 8px;
      background: linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
    }
    .cover-tagline {
      color: #a78bfa;
      font-size: 11px;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 48px;
      opacity: 0.8;
    }
    .cover-divider {
      width: 120px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #a78bfa, #f472b6, transparent);
      margin: 0 auto 48px;
    }
    .cover-doc-type {
      color: #e2e8f0;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 16px;
      opacity: 0.7;
    }
    .cover-title {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin-bottom: 16px;
      max-width: 600px;
      line-height: 1.3;
    }
    .cover-meta {
      margin-top: 48px;
      display: flex;
      gap: 32px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .cover-meta-item {
      text-align: center;
    }
    .cover-meta-label {
      color: #a78bfa;
      font-size: 9px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .cover-meta-value {
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 500;
    }
    .cover-badge {
      margin-top: 32px;
      display: inline-block;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      color: #c4b5fd;
      padding: 6px 20px;
      border-radius: 20px;
      font-size: 10px;
      letter-spacing: 1px;
    }

    /* ── TABLE OF CONTENTS ──────────────────────────────── */
    .toc {
      padding: 40px;
      page-break-after: always;
    }
    .toc h2 {
      font-size: 22px;
      color: #1e293b;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 3px solid #7c3aed;
      display: inline-block;
    }
    .toc-list { margin-top: 8px; }
    .toc-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;
    }
    .toc-item:nth-child(even) { background: #faf5ff; }
    .toc-num {
      font-size: 12px;
      font-weight: 700;
      color: #7c3aed;
      width: 32px;
      flex-shrink: 0;
    }
    .toc-icon {
      font-size: 16px;
      width: 28px;
      flex-shrink: 0;
    }
    .toc-title {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
    }

    /* ── SECTIONS ───────────────────────────────────────── */
    .section {
      padding: 32px 40px;
      margin-bottom: 0;
    }
    .page-break { page-break-before: always; }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 3px solid #7c3aed;
    }
    .section-icon { font-size: 24px; }
    .section-header h2 {
      font-size: 20px;
      color: #1e293b;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    h3 {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin: 20px 0 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    h4 {
      font-size: 12px;
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 6px;
    }

    p, li { font-size: 11px; color: #374151; }
    .body-text { margin: 12px 0; }

    /* ── HIGHLIGHT BOXES ────────────────────────────────── */
    .highlight-box {
      padding: 16px 20px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .highlight-box h4 { margin-bottom: 8px; }
    .highlight-box.green {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
    }
    .highlight-box.blue {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
    }
    .highlight-box.purple {
      background: #faf5ff;
      border-left: 4px solid #8b5cf6;
    }
    .highlight-box.gray {
      background: #f8fafc;
      border-left: 4px solid #94a3b8;
    }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }

    /* ── RECOMMENDATION BOX ─────────────────────────────── */
    .recommendation-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fbbf24;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
    }
    .rec-header {
      font-size: 13px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
    }

    /* ── METRICS GRID ───────────────────────────────────── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }
    .metric-icon { font-size: 20px; margin-bottom: 4px; }
    .metric-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 4px; }
    .metric-value { font-size: 12px; font-weight: 600; color: #1e293b; }

    /* ── INSIGHTS GRID ──────────────────────────────────── */
    .insights-grid { margin: 12px 0; }
    .insight-card {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .insight-card:last-child { border-bottom: none; }
    .insight-number {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #7c3aed, #a78bfa);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .insight-content { flex: 1; }
    .insight-content strong { font-size: 11px; color: #1e293b; }
    .insight-detail { font-size: 10px; color: #6b7280; margin-top: 4px; }
    .insight-detail .label { font-weight: 600; color: #4b5563; }

    /* ── TAGS ────────────────────────────────────────────── */
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
    .tag {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 10px;
      font-weight: 500;
    }
    .tag.blue { background: #dbeafe; color: #1d4ed8; }
    .tag.purple { background: #ede9fe; color: #6d28d9; }
    .tag.red { background: #fee2e2; color: #dc2626; }
    .tag.pink { background: #fce7f3; color: #db2777; }
    .tag.green { background: #d1fae5; color: #059669; }
    .tag.amber { background: #fef3c7; color: #d97706; }

    /* ── TWO COLUMNS ────────────────────────────────────── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 12px 0; }
    .col {}

    /* ── STYLED LISTS ───────────────────────────────────── */
    ol, ul { margin-left: 20px; margin-bottom: 12px; }
    li { margin-bottom: 6px; padding-left: 4px; }
    .styled-list { list-style: none; margin-left: 0; }
    .styled-list li {
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .styled-list.red li { background: #fef2f2; border-left: 3px solid #ef4444; color: #991b1b; }
    .styled-list.green li { background: #f0fdf4; border-left: 3px solid #10b981; color: #065f46; }
    .styled-list.amber li { background: #fffbeb; border-left: 3px solid #f59e0b; color: #92400e; }
    .styled-list.purple li { background: #faf5ff; border-left: 3px solid #8b5cf6; color: #581c87; }
    .styled-list.blue li { background: #eff6ff; border-left: 3px solid #3b82f6; color: #1e40af; }

    /* ── JTBD GRID ──────────────────────────────────────── */
    .jtbd-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    .jtbd-card {
      padding: 16px;
      border-radius: 10px;
      text-align: center;
    }
    .jtbd-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .jtbd-card.pink { background: #fdf2f8; border: 1px solid #fbcfe8; }
    .jtbd-card.purple { background: #faf5ff; border: 1px solid #e9d5ff; }
    .jtbd-icon { font-size: 24px; margin-bottom: 8px; }
    .jtbd-card h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; }
    .jtbd-card p { font-size: 11px; color: #374151; }

    /* ── AVATAR CARDS ───────────────────────────────────── */
    .avatar-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .avatar-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .avatar-number {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #7c3aed, #ec4899);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .avatar-header h3 { font-size: 14px; color: #1e293b; margin: 0; }
    .avatar-age { font-size: 11px; color: #6b7280; margin-left: 8px; }
    .awareness-badge {
      display: inline-block;
      background: #ede9fe;
      color: #6d28d9;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
      margin-left: 8px;
    }
    .avatar-detail {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .avatar-detail.blue { background: #eff6ff; border-left: 3px solid #3b82f6; }
    .avatar-detail.green { background: #f0fdf4; border-left: 3px solid #10b981; }
    .avatar-detail.purple { background: #faf5ff; border-left: 3px solid #8b5cf6; }
    .avatar-detail.amber { background: #fffbeb; border-left: 3px solid #f59e0b; }
    .detail-label { font-size: 10px; font-weight: 600; color: #6b7280; display: block; margin-bottom: 4px; }
    .avatar-detail p { font-size: 11px; margin: 0; }
    .phrases-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .phrase {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-style: italic;
      color: #475569;
    }

    /* ── DATA TABLES ────────────────────────────────────── */
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 16px 0;
      font-size: 10px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .data-table th {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      padding: 10px 12px;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .data-table tbody tr:nth-child(even) { background: #faf5ff; }
    .data-table tbody tr:hover { background: #f5f3ff; }
    .data-table.compact td { padding: 6px 10px; }

    .text-center { text-align: center; }
    .text-green { color: #059669; }
    .text-red { color: #dc2626; }
    .text-muted { color: #9ca3af; }
    .label { font-weight: 600; color: #4b5563; }

    /* ── PHASE BADGES ───────────────────────────────────── */
    .phase-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .phase-badge.enganchar { background: #fee2e2; color: #dc2626; }
    .phase-badge.solucion, .phase-badge.solución { background: #dbeafe; color: #2563eb; }
    .phase-badge.remarketing { background: #f3e8ff; color: #7c3aed; }
    .phase-badge.fidelizar { background: #d1fae5; color: #059669; }

    /* ── COMPETITOR CARDS ────────────────────────────────── */
    .competitor-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin: 10px 0;
    }
    .competitor-card h4 { color: #1e293b; font-size: 12px; margin-bottom: 6px; }
    .competitor-card p { margin-bottom: 4px; font-size: 11px; }

    /* ── TRANSFORMATION TABLE ───────────────────────────── */
    .transformation-table td:first-child { font-weight: 600; background: #f8fafc; }
    .cell-before { background: #fef2f2 !important; color: #991b1b; }
    .cell-after { background: #f0fdf4 !important; color: #065f46; }

    /* ── ESFERA PHASES ──────────────────────────────────── */
    .esfera-phase {
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 14px;
    }
    .esfera-phase.red { background: #fef2f2; border-left: 5px solid #ef4444; }
    .esfera-phase.blue { background: #eff6ff; border-left: 5px solid #3b82f6; }
    .esfera-phase.purple { background: #faf5ff; border-left: 5px solid #8b5cf6; }
    .esfera-phase.green { background: #f0fdf4; border-left: 5px solid #10b981; }
    .phase-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .phase-num {
      width: 28px;
      height: 28px;
      background: rgba(0,0,0,0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .phase-field { margin: 8px 0; font-size: 11px; }
    .field-label { font-weight: 600; color: #4b5563; }
    .phase-warning {
      background: rgba(245, 158, 11, 0.15);
      padding: 8px 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 11px;
    }
    .esfera-phase ul { margin: 6px 0 0 20px; }
    .esfera-phase li { margin-bottom: 4px; font-size: 11px; }

    /* ── PUV STATEMENT ──────────────────────────────────── */
    .puv-statement {
      background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%);
      border: 2px solid #7c3aed;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 16px 0;
    }
    .puv-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #7c3aed;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .puv-statement blockquote {
      font-size: 15px;
      font-style: italic;
      color: #374151;
      line-height: 1.5;
    }

    /* ── LEAD MAGNETS ───────────────────────────────────── */
    .lm-grid { margin: 12px 0; }
    .lm-card {
      display: flex;
      gap: 12px;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 10px;
      background: #f8fafc;
    }
    .lm-number {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #7c3aed, #ec4899);
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    .lm-content { flex: 1; }
    .lm-content h4 { margin-bottom: 6px; color: #1e293b; }
    .lm-content p { font-size: 10px; margin-bottom: 2px; }

    /* ── EMPTY STATE ────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 80px 40px;
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; color: #6b7280; margin-bottom: 8px; }
    .empty-state p { font-size: 12px; color: #9ca3af; }

    /* ── FOOTER ──────────────────────────────────────────── */
    .doc-footer {
      padding: 24px 40px;
      border-top: 2px solid #7c3aed;
      text-align: center;
      color: #9ca3af;
      font-size: 10px;
      margin-top: 40px;
      page-break-before: avoid;
    }
    .doc-footer .brand {
      color: #7c3aed;
      font-weight: 600;
    }
    .doc-footer p { margin-bottom: 2px; }

    /* ── PAGE NUMBERS ──────────────────────────────────── */
    .section::after {
      content: '';
      display: block;
      text-align: right;
      font-size: 9px;
      color: #c4b5fd;
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    /* ── PRINT STYLES ───────────────────────────────────── */
    @media print {
      body { font-size: 10px; }
      .cover { min-height: auto; padding: 40mm 20mm; }
      .section { padding: 20px 0; }
      .toc { padding: 20px 0; }
      .avatar-card, .competitor-card, .lm-card { break-inside: avoid; }
      .data-table { break-inside: auto; }
      .data-table tr { break-inside: avoid; }
      .esfera-phase { break-inside: avoid; }
      .doc-footer { position: running(footer); }
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-logo">KREOON</div>
    <div class="cover-tagline">Operating System for Creators</div>
    <div class="cover-divider"></div>
    <div class="cover-doc-type">Investigación de Mercado con IA</div>
    <div class="cover-title">${escapeHtml(productName)}</div>
    ${product.description ? `<p style="color: #94a3b8; font-size: 12px; margin-top: 8px; max-width: 500px;">${escapeHtml(safeStr(product.description))}</p>` : ''}
    <div class="cover-meta">
      ${clientName ? `<div class="cover-meta-item"><div class="cover-meta-label">Cliente</div><div class="cover-meta-value">${escapeHtml(clientName)}</div></div>` : ''}
      <div class="cover-meta-item">
        <div class="cover-meta-label">Fecha de Generación</div>
        <div class="cover-meta-value">${generatedDate}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Secciones</div>
        <div class="cover-meta-value">${tocEntries.length}</div>
      </div>
    </div>
    <div class="cover-badge">Reporte Generado con Inteligencia Artificial</div>
  </div>

  <!-- TABLE OF CONTENTS -->
  ${tocHtml}

  <!-- SECTIONS -->
  ${sectionsHtml}

  <!-- FOOTER -->
  <div class="doc-footer">
    <p>Generado por <span class="brand">Kreoon</span> — Investigación de Mercado con IA</p>
    <p>${generatedDate}</p>
  </div>

</body>
</html>`;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to render then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 600);
  }
}
