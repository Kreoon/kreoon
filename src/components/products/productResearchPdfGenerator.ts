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
  ideal_avatar?: string | null;
}

interface ProductResearchPdfData {
  product: Product;
  clientName?: string;
}

// Helper function to safely extract text from various data structures
function extractText(item: any, keys: string[]): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

// Helper to parse JSON safely
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

export function generateProductResearchPdf({ product, clientName }: ProductResearchPdfData) {
  const marketResearch = parseJson(product.market_research);
  const competitorAnalysis = parseJson(product.competitor_analysis);
  const avatarProfiles = parseJson(product.avatar_profiles);
  const salesAnglesData = parseJson(product.sales_angles_data);
  const contentStrategy = parseJson(product.content_strategy);
  
  // Parse JTBD from ideal_avatar
  let jtbdData = null;
  try {
    if (product.ideal_avatar && typeof product.ideal_avatar === 'string') {
      const parsed = JSON.parse(product.ideal_avatar);
      jtbdData = parsed.jtbd || null;
    }
  } catch {
    jtbdData = null;
  }

  const generatedDate = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

  // Build sections
  let sectionsHtml = '';

  // Executive Summary
  const summary = contentStrategy?.executiveSummary;
  if (summary) {
    sectionsHtml += `
      <div class="section">
        <h2>📊 Conclusión Ejecutiva</h2>
        ${summary.marketSummary ? `<p class="summary-text">${summary.marketSummary}</p>` : ''}
        
        ${summary.keyInsights?.length ? `
          <h3>💡 Insights Estratégicos Clave</h3>
          <ul class="insights-list">
            ${summary.keyInsights.map((item: any) => {
              const text = typeof item === 'string' ? item : item?.insight || '';
              const importance = typeof item === 'object' ? item?.importance : '';
              const action = typeof item === 'object' ? item?.action : '';
              return `<li>
                <strong>${text}</strong>
                ${importance ? `<br><small>Por qué importa: ${importance}</small>` : ''}
                ${action ? `<br><small>Cómo aprovecharlo: ${action}</small>` : ''}
              </li>`;
            }).join('')}
          </ul>
        ` : ''}
        
        ${summary.psychologicalDrivers?.length ? `
          <h3>🧠 Drivers Psicológicos</h3>
          <ul class="drivers-list">
            ${summary.psychologicalDrivers.map((item: any) => {
              const text = typeof item === 'string' ? item : item?.driver || '';
              return `<li>${text}</li>`;
            }).join('')}
          </ul>
        ` : ''}
        
        ${summary.finalRecommendation ? `
          <div class="recommendation-box">
            <h4>🎯 Recomendación Final</h4>
            <p>${summary.finalRecommendation}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Market Overview
  if (marketResearch) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>🌍 Panorama del Mercado</h2>
        
        <div class="market-grid">
          ${marketResearch.marketSize ? `
            <div class="market-card">
              <h4>📈 Tamaño del Mercado</h4>
              <p>${marketResearch.marketSize}</p>
            </div>
          ` : ''}
          ${marketResearch.growthTrend ? `
            <div class="market-card">
              <h4>📊 Tendencia de Crecimiento</h4>
              <p>${marketResearch.growthTrend}</p>
            </div>
          ` : ''}
        </div>
        
        ${marketResearch.marketState ? `
          <div class="state-badge ${marketResearch.marketState.toLowerCase()}">
            Estado del Mercado: ${marketResearch.marketState}
          </div>
          ${marketResearch.marketStateExplanation ? `<p>${marketResearch.marketStateExplanation}</p>` : ''}
        ` : ''}
        
        ${marketResearch.macroVariables?.length ? `
          <h3>🔮 Variables Macroeconómicas</h3>
          <div class="tags">
            ${marketResearch.macroVariables.map((v: string) => `<span class="tag">${v}</span>`).join('')}
          </div>
        ` : ''}
        
        ${marketResearch.opportunities?.length ? `
          <h3>✅ Oportunidades</h3>
          <ul class="opportunities-list">
            ${marketResearch.opportunities.map((o: string) => `<li>${o}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${marketResearch.threats?.length ? `
          <h3>⚠️ Amenazas</h3>
          <ul class="threats-list">
            ${marketResearch.threats.map((t: string) => `<li>${t}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${marketResearch.awarenessLevel ? `
          <div class="awareness-box">
            <h4>🧠 Nivel de Conciencia (Eugene Schwartz)</h4>
            <p>${marketResearch.awarenessLevel}</p>
          </div>
        ` : ''}
        
        ${marketResearch.summary ? `
          <h3>📋 Resumen Ejecutivo del Mercado</h3>
          <p>${marketResearch.summary}</p>
        ` : ''}
      </div>
    `;
  }

  // JTBD Analysis
  if (jtbdData) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>🎯 Análisis JTBD (Jobs To Be Done)</h2>
        
        <div class="jtbd-grid">
          ${jtbdData.functional ? `
            <div class="jtbd-card functional">
              <h4>⚡ JTBD Funcional</h4>
              <p>${jtbdData.functional}</p>
            </div>
          ` : ''}
          ${jtbdData.emotional ? `
            <div class="jtbd-card emotional">
              <h4>💝 JTBD Emocional</h4>
              <p>${jtbdData.emotional}</p>
            </div>
          ` : ''}
          ${jtbdData.social ? `
            <div class="jtbd-card social">
              <h4>👥 JTBD Social</h4>
              <p>${jtbdData.social}</p>
            </div>
          ` : ''}
        </div>
        
        ${jtbdData.pains?.length ? `
          <h3>😣 10 Dolores Profundos</h3>
          <ol class="pains-list">
            ${jtbdData.pains.map((pain: any) => {
              const text = typeof pain === 'string' ? pain : pain?.pain || '';
              return `<li>${text}</li>`;
            }).join('')}
          </ol>
        ` : ''}
        
        ${jtbdData.desires?.length ? `
          <h3>✨ 10 Deseos Aspiracionales</h3>
          <ol class="desires-list">
            ${jtbdData.desires.map((desire: any) => {
              const text = typeof desire === 'string' ? desire : desire?.desire || '';
              return `<li>${text}</li>`;
            }).join('')}
          </ol>
        ` : ''}
        
        ${jtbdData.objections?.length ? `
          <h3>🛡️ 10 Objeciones y Miedos</h3>
          <ol class="objections-list">
            ${jtbdData.objections.map((obj: any) => {
              const text = typeof obj === 'string' ? obj : obj?.objection || '';
              return `<li>${text}</li>`;
            }).join('')}
          </ol>
        ` : ''}
        
        ${jtbdData.insights?.length ? `
          <h3>💡 10 Insights Estratégicos</h3>
          <ol class="insights-list">
            ${jtbdData.insights.map((insight: any) => {
              const text = typeof insight === 'string' ? insight : insight?.insight || insight?.text || '';
              return `<li>${text}</li>`;
            }).join('')}
          </ol>
        ` : ''}
      </div>
    `;
  }

  // Avatar Profiles
  const profiles = avatarProfiles?.profiles || [];
  if (profiles.length > 0) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>👥 5 Avatares Estratégicos</h2>
        
        ${profiles.map((avatar: any, idx: number) => `
          <div class="avatar-card">
            <h3>${avatar.name || `Avatar ${idx + 1}`}</h3>
            ${avatar.age ? `<p class="avatar-age">${avatar.age}</p>` : ''}
            ${avatar.awarenessLevel ? `<span class="awareness-badge">${avatar.awarenessLevel}</span>` : ''}
            
            ${avatar.situation ? `
              <div class="avatar-section">
                <strong>📍 Situación Actual:</strong>
                <p>${avatar.situation}</p>
              </div>
            ` : ''}
            
            ${avatar.drivers ? `
              <div class="avatar-section drivers">
                <strong>🧠 Drivers Psicológicos:</strong>
                <p>${avatar.drivers}</p>
              </div>
            ` : ''}
            
            ${avatar.biases ? `
              <div class="avatar-section biases">
                <strong>💭 Sesgos Cognitivos:</strong>
                <p>${avatar.biases}</p>
              </div>
            ` : ''}
            
            ${avatar.objections ? `
              <div class="avatar-section objections">
                <strong>⚠️ Objeciones Clave:</strong>
                <p>${avatar.objections}</p>
              </div>
            ` : ''}
            
            ${avatar.phrases?.length ? `
              <div class="avatar-section phrases">
                <strong>💬 Frases Reales:</strong>
                <ul>
                  ${(Array.isArray(avatar.phrases) ? avatar.phrases : [avatar.phrases]).map((phrase: string) => `<li>"${phrase}"</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Competition Analysis
  const competitors = competitorAnalysis?.competitors || [];
  if (competitors.length > 0) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>⚔️ Análisis de Competencia</h2>
        
        <table class="competitors-table">
          <thead>
            <tr>
              <th>Marca</th>
              <th>Promesa</th>
              <th>Diferenciador</th>
              <th>Precio</th>
              <th>Tono</th>
            </tr>
          </thead>
          <tbody>
            ${competitors.map((comp: any, idx: number) => `
              <tr>
                <td><strong>${comp.name || `Competidor ${idx + 1}`}</strong></td>
                <td>${comp.promise || '-'}</td>
                <td>${comp.differentiator || '-'}</td>
                <td>${comp.price || '-'}</td>
                <td>${comp.tone || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${competitors.slice(0, 5).map((comp: any, idx: number) => `
          <div class="competitor-detail">
            <h4>${comp.name || `Competidor ${idx + 1}`}</h4>
            ${comp.valueProposition ? `<p><strong>Propuesta de Valor:</strong> ${comp.valueProposition}</p>` : ''}
            ${comp.strengths?.length ? `<p class="strengths"><strong>Fortalezas:</strong> ${comp.strengths.join(', ')}</p>` : ''}
            ${comp.weaknesses?.length ? `<p class="weaknesses"><strong>Debilidades:</strong> ${comp.weaknesses.join(', ')}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Differentiation Opportunities
  const differentiation = competitorAnalysis?.differentiation;
  if (differentiation) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>💎 Oportunidades de Diferenciación</h2>
        
        ${differentiation.repeatedMessages?.length ? `
          <h3>🚫 Mensajes Saturados (Evitar)</h3>
          <div class="tags saturated">
            ${differentiation.repeatedMessages.map((item: any) => {
              const text = extractText(item, ['message', 'text']);
              return `<span class="tag red">${text}</span>`;
            }).join('')}
          </div>
        ` : ''}
        
        ${differentiation.positioningOpportunities?.length ? `
          <h3>✅ Oportunidades de Posicionamiento</h3>
          <ol class="opportunities-list">
            ${differentiation.positioningOpportunities.map((item: any) => {
              const text = extractText(item, ['opportunity', 'text']);
              const why = typeof item === 'object' ? extractText(item, ['why']) : '';
              return `<li><strong>${text}</strong>${why ? `<br><small>Por qué: ${why}</small>` : ''}</li>`;
            }).join('')}
          </ol>
        ` : ''}
        
        ${differentiation.poorlyAddressedPains?.length ? `
          <h3>⚡ Dolores Mal Comunicados</h3>
          <ul>
            ${differentiation.poorlyAddressedPains.map((item: any) => {
              const text = extractText(item, ['pain', 'text']);
              return `<li>${text}</li>`;
            }).join('')}
          </ul>
        ` : ''}
        
        ${differentiation.unexploitedEmotions?.length ? `
          <h3>💝 Emociones No Explotadas</h3>
          <div class="tags">
            ${differentiation.unexploitedEmotions.map((item: any) => {
              const text = extractText(item, ['emotion', 'text']);
              return `<span class="tag pink">${text}</span>`;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Sales Angles
  const angles = salesAnglesData?.angles || [];
  if (angles.length > 0) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>🎯 20 Ángulos de Venta Estratégicos</h2>
        
        <table class="angles-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ángulo</th>
              <th>Tipo</th>
              <th>Avatar</th>
              <th>Emoción</th>
              <th>Formato</th>
            </tr>
          </thead>
          <tbody>
            ${angles.map((angle: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${angle.angle || '-'}</td>
                <td><span class="type-badge">${angle.type || '-'}</span></td>
                <td>${angle.avatar || '-'}</td>
                <td>${angle.emotion || '-'}</td>
                <td>${angle.contentType || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // PUV & Transformation
  const puv = salesAnglesData?.puv;
  const transformation = salesAnglesData?.transformation;
  if (puv || transformation) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>🏆 PUV y Transformación</h2>
        
        ${puv?.statement ? `
          <div class="puv-statement">
            <h3>Propuesta Única de Valor (PUV)</h3>
            <blockquote>"${puv.statement}"</blockquote>
          </div>
        ` : ''}
        
        <div class="puv-grid">
          ${puv?.centralProblem ? `
            <div class="puv-card">
              <h4>🎯 Problema Central</h4>
              <p>${puv.centralProblem}</p>
            </div>
          ` : ''}
          ${puv?.tangibleResult ? `
            <div class="puv-card">
              <h4>✨ Resultado Tangible</h4>
              <p>${puv.tangibleResult}</p>
            </div>
          ` : ''}
          ${puv?.marketDifference ? `
            <div class="puv-card">
              <h4>🏆 Diferencia vs Mercado</h4>
              <p>${puv.marketDifference}</p>
            </div>
          ` : ''}
          ${puv?.idealClient ? `
            <div class="puv-card">
              <h4>👤 Cliente Ideal</h4>
              <p>${puv.idealClient}</p>
            </div>
          ` : ''}
        </div>
        
        ${transformation ? `
          <h3>🔄 Transformación: Antes vs Después</h3>
          <table class="transformation-table">
            <thead>
              <tr>
                <th>Dimensión</th>
                <th>❌ Antes</th>
                <th>✅ Después</th>
              </tr>
            </thead>
            <tbody>
              ${transformation.functional?.before || transformation.functional?.after ? `
                <tr>
                  <td><strong>🔧 Funcional</strong></td>
                  <td>${transformation.functional.before || '-'}</td>
                  <td>${transformation.functional.after || '-'}</td>
                </tr>
              ` : ''}
              ${transformation.emotional?.before || transformation.emotional?.after ? `
                <tr>
                  <td><strong>💝 Emocional</strong></td>
                  <td>${transformation.emotional.before || '-'}</td>
                  <td>${transformation.emotional.after || '-'}</td>
                </tr>
              ` : ''}
              ${transformation.identity?.before || transformation.identity?.after ? `
                <tr>
                  <td><strong>👤 Identidad</strong></td>
                  <td>${transformation.identity.before || '-'}</td>
                  <td>${transformation.identity.after || '-'}</td>
                </tr>
              ` : ''}
              ${transformation.social?.before || transformation.social?.after ? `
                <tr>
                  <td><strong>🤝 Social</strong></td>
                  <td>${transformation.social.before || '-'}</td>
                  <td>${transformation.social.after || '-'}</td>
                </tr>
              ` : ''}
              ${transformation.financial?.before || transformation.financial?.after ? `
                <tr>
                  <td><strong>💰 Financiero</strong></td>
                  <td>${transformation.financial.before || '-'}</td>
                  <td>${transformation.financial.after || '-'}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }

  // Esfera Insights
  const esfera = contentStrategy?.esferaInsights;
  if (esfera) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>🧠 Método ESFERA - Insights por Fase</h2>
        
        ${esfera.enganchar ? `
          <div class="esfera-phase enganchar">
            <h3>1️⃣ ENGANCHAR - Captar atención</h3>
            ${esfera.enganchar.marketDominance ? `<p><strong>Qué domina el mercado:</strong> ${esfera.enganchar.marketDominance}</p>` : ''}
            ${esfera.enganchar.saturated ? `<p class="warning"><strong>Qué está saturado:</strong> ${esfera.enganchar.saturated}</p>` : ''}
            ${esfera.enganchar.opportunities?.length ? `
              <p><strong>Oportunidades creativas:</strong></p>
              <ul>${esfera.enganchar.opportunities.map((o: string) => `<li>${o}</li>`).join('')}</ul>
            ` : ''}
          </div>
        ` : ''}
        
        ${esfera.solucion ? `
          <div class="esfera-phase solucion">
            <h3>2️⃣ SOLUCIÓN - Presentar y construir autoridad</h3>
            ${esfera.solucion.currentPromises ? `<p><strong>Promesas actuales:</strong> ${esfera.solucion.currentPromises}</p>` : ''}
            ${esfera.solucion.unresolvedObjections ? `<p class="warning"><strong>Objeciones no resueltas:</strong> ${esfera.solucion.unresolvedObjections}</p>` : ''}
            ${esfera.solucion.trustOpportunities?.length ? `
              <p><strong>Oportunidades de autoridad:</strong></p>
              <ul>${esfera.solucion.trustOpportunities.map((o: string) => `<li>${o}</li>`).join('')}</ul>
            ` : ''}
          </div>
        ` : ''}
        
        ${esfera.remarketing ? `
          <div class="esfera-phase remarketing">
            <h3>3️⃣ REMARKETING - Reforzar y empujar decisión</h3>
            ${esfera.remarketing.existingProof ? `<p><strong>Prueba social existente:</strong> ${esfera.remarketing.existingProof}</p>` : ''}
            ${esfera.remarketing.decisionMessages?.length ? `
              <p><strong>Mensajes que empujan decisión:</strong></p>
              <ul>${esfera.remarketing.decisionMessages.map((o: string) => `<li>${o}</li>`).join('')}</ul>
            ` : ''}
          </div>
        ` : ''}
        
        ${esfera.fidelizar ? `
          <div class="esfera-phase fidelizar">
            <h3>4️⃣ FIDELIZAR - Retener y convertir en embajadores</h3>
            ${esfera.fidelizar.commonErrors ? `<p class="warning"><strong>Errores comunes:</strong> ${esfera.fidelizar.commonErrors}</p>` : ''}
            ${esfera.fidelizar.communityOpportunities?.length ? `
              <p><strong>Oportunidades de comunidad:</strong></p>
              <ul>${esfera.fidelizar.communityOpportunities.map((o: string) => `<li>${o}</li>`).join('')}</ul>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Lead Magnets & Creatives
  const leadMagnets = salesAnglesData?.leadMagnets || [];
  const videoCreatives = salesAnglesData?.videoCreatives || [];
  if (leadMagnets.length > 0 || videoCreatives.length > 0) {
    sectionsHtml += `
      <div class="section page-break">
        <h2>🎁 Lead Magnets y Creativos</h2>
        
        ${leadMagnets.length > 0 ? `
          <h3>📋 3 Lead Magnets Estratégicos</h3>
          <div class="leadmagnets-grid">
            ${leadMagnets.map((lm: any, idx: number) => `
              <div class="leadmagnet-card">
                <h4>${lm.name || `Lead Magnet ${idx + 1}`}</h4>
                ${lm.objective ? `<p><strong>Objetivo:</strong> ${lm.objective}</p>` : ''}
                ${lm.contentType ? `<p><strong>Tipo:</strong> ${lm.contentType}</p>` : ''}
                ${lm.pain ? `<p><strong>Dolor que ataca:</strong> ${lm.pain}</p>` : ''}
                ${lm.avatar ? `<p><strong>Avatar:</strong> ${lm.avatar}</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${videoCreatives.length > 0 ? `
          <h3>🎬 Creativos por Fase ESFERA</h3>
          <table class="creatives-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fase</th>
                <th>Título</th>
                <th>Idea</th>
                <th>Formato</th>
              </tr>
            </thead>
            <tbody>
              ${videoCreatives.slice(0, 20).map((vc: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><span class="phase-badge ${vc.esferaPhase || ''}">${vc.esferaPhase || '-'}</span></td>
                  <td>${vc.title || '-'}</td>
                  <td>${vc.idea || '-'}</td>
                  <td>${vc.format || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }

  // Build complete HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Investigación de Mercado - ${product.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #1a1a1a; 
          line-height: 1.6;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
          font-size: 12px;
        }
        
        .header { 
          border-bottom: 4px solid #7c3aed; 
          padding-bottom: 24px; 
          margin-bottom: 32px;
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          margin: -40px -40px 32px -40px;
          padding: 40px;
        }
        .header h1 { 
          font-size: 28px; 
          color: #5b21b6; 
          margin-bottom: 8px;
        }
        .header .subtitle { 
          color: #6b7280; 
          font-size: 14px;
        }
        .header .meta {
          margin-top: 16px;
          display: flex;
          gap: 24px;
          font-size: 13px;
        }
        .header .meta span {
          color: #6b7280;
        }
        
        .section { 
          margin-bottom: 32px; 
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        .section h2 { 
          font-size: 18px; 
          color: #1e293b; 
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #7c3aed;
          display: inline-block;
        }
        .section h3 {
          font-size: 14px;
          color: #374151;
          margin: 16px 0 12px 0;
        }
        .section h4 {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 8px;
        }
        
        .page-break { page-break-before: always; }
        
        .summary-text {
          background: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 16px;
          margin-bottom: 16px;
          border-radius: 0 8px 8px 0;
        }
        
        .recommendation-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }
        .recommendation-box h4 {
          color: #92400e;
          margin-bottom: 8px;
        }
        
        .market-grid, .jtbd-grid, .puv-grid, .leadmagnets-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        .market-card, .jtbd-card, .puv-card, .leadmagnet-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 16px;
          border-radius: 8px;
        }
        .market-card h4, .jtbd-card h4, .puv-card h4 { 
          color: #7c3aed; 
          margin-bottom: 8px;
        }
        
        .jtbd-card.functional { border-left: 4px solid #3b82f6; }
        .jtbd-card.emotional { border-left: 4px solid #ec4899; }
        .jtbd-card.social { border-left: 4px solid #8b5cf6; }
        
        .tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
        .tag { 
          background: #e0e7ff; 
          color: #4338ca; 
          padding: 4px 12px; 
          border-radius: 16px; 
          font-size: 11px;
        }
        .tag.red { background: #fee2e2; color: #dc2626; }
        .tag.pink { background: #fce7f3; color: #db2777; }
        
        .state-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          margin: 12px 0;
        }
        .state-badge.crecimiento { background: #d1fae5; color: #065f46; }
        .state-badge.saturacion { background: #fef3c7; color: #92400e; }
        .state-badge.declive { background: #fee2e2; color: #991b1b; }
        
        .awareness-box {
          background: #f3e8ff;
          border: 1px solid #c4b5fd;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }
        .awareness-box h4 { color: #7c3aed; }
        
        ol, ul { margin-left: 20px; margin-bottom: 12px; }
        li { margin-bottom: 8px; }
        
        .pains-list li { color: #dc2626; }
        .desires-list li { color: #059669; }
        .objections-list li { color: #d97706; }
        .opportunities-list li { color: #059669; }
        .threats-list li { color: #dc2626; }
        
        .avatar-card {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .avatar-card h3 {
          color: #7c3aed;
          font-size: 16px;
          margin-bottom: 4px;
        }
        .avatar-age { color: #6b7280; font-size: 12px; margin-bottom: 8px; }
        .awareness-badge {
          background: #e0e7ff;
          color: #4338ca;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 11px;
          display: inline-block;
          margin-bottom: 12px;
        }
        .avatar-section {
          margin-top: 12px;
          padding: 12px;
          background: white;
          border-radius: 8px;
        }
        .avatar-section.drivers { border-left: 3px solid #10b981; }
        .avatar-section.biases { border-left: 3px solid #8b5cf6; }
        .avatar-section.objections { border-left: 3px solid #f59e0b; }
        .avatar-section.phrases { border-left: 3px solid #3b82f6; }
        .avatar-section strong { display: block; margin-bottom: 4px; font-size: 11px; color: #6b7280; }
        .avatar-section ul { margin-left: 16px; margin-top: 8px; }
        .avatar-section li { font-style: italic; color: #4b5563; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        tr:nth-child(even) { background: #f8fafc; }
        
        .type-badge, .phase-badge {
          background: #e0e7ff;
          color: #4338ca;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
        }
        .phase-badge.enganchar { background: #fee2e2; color: #dc2626; }
        .phase-badge.solucion { background: #dbeafe; color: #2563eb; }
        .phase-badge.remarketing { background: #f3e8ff; color: #7c3aed; }
        .phase-badge.fidelizar { background: #d1fae5; color: #059669; }
        
        .competitor-detail {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          margin: 12px 0;
        }
        .competitor-detail h4 { color: #1e293b; margin-bottom: 8px; }
        .competitor-detail .strengths { color: #059669; }
        .competitor-detail .weaknesses { color: #dc2626; }
        
        .puv-statement {
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          border: 2px solid #7c3aed;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 20px;
        }
        .puv-statement h3 { color: #5b21b6; margin-bottom: 12px; }
        .puv-statement blockquote {
          font-size: 16px;
          font-style: italic;
          color: #374151;
        }
        
        .transformation-table td:first-child { font-weight: 600; width: 120px; }
        .transformation-table td:nth-child(2) { background: #fee2e2; }
        .transformation-table td:nth-child(3) { background: #d1fae5; }
        
        .esfera-phase {
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .esfera-phase.enganchar { background: #fee2e2; border-left: 4px solid #dc2626; }
        .esfera-phase.solucion { background: #dbeafe; border-left: 4px solid #2563eb; }
        .esfera-phase.remarketing { background: #f3e8ff; border-left: 4px solid #7c3aed; }
        .esfera-phase.fidelizar { background: #d1fae5; border-left: 4px solid #059669; }
        .esfera-phase h3 { margin-bottom: 12px; }
        .esfera-phase .warning { color: #92400e; background: #fef3c7; padding: 8px; border-radius: 4px; margin: 8px 0; }
        .esfera-phase ul { margin-left: 20px; }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #7c3aed;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
        }
        
        @media print {
          body { padding: 20px; font-size: 11px; }
          .page-break { page-break-before: always; }
          .header { margin: -20px -20px 24px -20px; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Investigación de Mercado</h1>
        <p class="subtitle">${product.name}</p>
        <div class="meta">
          ${clientName ? `<span><strong>Cliente:</strong> ${clientName}</span>` : ''}
          <span><strong>Generado:</strong> ${generatedDate}</span>
        </div>
      </div>
      
      ${sectionsHtml}
      
      <div class="footer">
        <p>Investigación generada automáticamente con IA</p>
        <p>${generatedDate}</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
