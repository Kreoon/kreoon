/**
 * Ejecutor de Skills - Orquesta la ejecución secuencial de skills
 */

import {
  Skill,
  SkillContext,
  SkillExecution,
  SkillChainResult,
} from './types.ts';
import { getActiveSkills, getSkillPhases, interpolateSkillPrompt } from './registry.ts';

interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

type AIConfigArray = AIConfig | AIConfig[];

/**
 * Construye el input para un skill específico
 */
const DURATION_LABELS: Record<string, string> = {
  '15s':  '15 segundos exactos (~37 palabras de diálogo)',
  '30s':  '30 segundos exactos (~75 palabras de diálogo)',
  '45s':  '45 segundos exactos (~112 palabras de diálogo)',
  '60s':  '60 segundos exactos / 1 minuto (~150 palabras de diálogo)',
  '90s':  '90 segundos exactos / 1:30 min (~225 palabras de diálogo)',
  '120s': '120 segundos exactos / 2 minutos (~300 palabras de diálogo)',
  '180s': '180 segundos exactos / 3 minutos (~450 palabras de diálogo)',
  '300s': '300 segundos exactos / 5 minutos (~750 palabras de diálogo)',
  '600s': '600 segundos exactos / 10 minutos (~1500 palabras de diálogo)',
  // compatibilidad con valores legacy
  '15-30s':  '30 segundos exactos (~75 palabras de diálogo)',
  '30-60s':  '60 segundos exactos (~150 palabras de diálogo)',
  '1-3min':  '180 segundos exactos / 3 minutos (~450 palabras de diálogo)',
  '3-5min':  '300 segundos exactos / 5 minutos (~750 palabras de diálogo)',
  '5-10min': '600 segundos exactos / 10 minutos (~1500 palabras de diálogo)',
};

export function buildSkillInput(
  skill: Skill,
  context: SkillContext,
  previousOutput: string,
  executions: SkillExecution[]
): string {
  const { product, formData, perplexityResearch } = context;
  const durationLabel = DURATION_LABELS[formData.video_duration || ''] || `${formData.video_duration || '60'} segundos`;

  let input = `
# PRODUCTO
Nombre: ${product.name || 'N/A'}
Descripción: ${product.description || 'N/A'}
Estrategia: ${product.strategy || 'N/A'}
Avatar Ideal: ${product.ideal_avatar || 'N/A'}
Ángulos de Venta: ${product.sales_angles?.join(', ') || 'N/A'}

# PARÁMETROS DEL GUIÓN
País Objetivo: ${formData.target_country || 'Colombia'}
Ángulo de Venta: ${formData.sales_angle || 'N/A'}
Fase CAST: ${formData.sphere_phase || 'solution'}
Nivel de Consciencia: ${formData.consciousness_level || 'problem_aware'}
Estructura Narrativa: ${formData.narrative_structure || 'problema-solución'}
Cantidad de Hooks: ${formData.hooks_count || 3}
CTA: ${formData.cta || 'N/A'}
Duración del Video: ${durationLabel}
`;

  // Agregar investigación de Perplexity si existe
  if (perplexityResearch) {
    input += `
# INVESTIGACIÓN (Perplexity)
${perplexityResearch}
`;
  }

  // Agregar contexto adicional
  if (formData.additional_context) {
    input += `
# CONTEXTO ADICIONAL
${formData.additional_context}
`;
  }

  // Si hay output previo, agregarlo para que el skill lo refine
  if (previousOutput) {
    input += `
# ═══════════════════════════════════════════════════════════════
# OUTPUT DEL SKILL ANTERIOR (REFINAR/MEJORAR ESTO)
# ═══════════════════════════════════════════════════════════════

${previousOutput}
`;
  }

  // Resumen de skills ejecutados
  if (executions.length > 0) {
    input += `
# SKILLS YA EJECUTADOS
${executions.map((e) => `- ${e.skillId} (confianza: ${(e.confidence * 100).toFixed(0)}%)`).join('\n')}
`;
  }

  return input;
}

/**
 * Llama a la IA con el prompt del skill (con fallback automático si se pasan varios configs)
 */
export async function callAIWithSkill(
  skill: Skill,
  input: string,
  aiConfigOrArray: AIConfigArray
): Promise<{ content: string; confidence: number; tokensUsed?: number }> {
  const configs = Array.isArray(aiConfigOrArray) ? aiConfigOrArray : [aiConfigOrArray];
  let lastError: Error = new Error('No configs disponibles');

  for (const cfg of configs) {
    try {
      return await callAIWithSkillSingle(skill, input, cfg);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Skill] ${cfg.provider}/${cfg.model} falló para ${skill.name}: ${lastError.message}. Intentando siguiente...`);
    }
  }
  throw lastError;
}

async function callAIWithSkillSingle(
  skill: Skill,
  input: string,
  aiConfig: AIConfig
): Promise<{ content: string; confidence: number; tokensUsed?: number }> {
  const { provider, apiKey, model } = aiConfig;

  console.log(`[Skill] Llamando ${provider}/${model} para ${skill.name}`);

  // Interpolar variables del skill prompt
  const systemPrompt = skill.systemPrompt;

  if (provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n---\n\nINPUT:\n${input}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = data.usageMetadata?.totalTokenCount;

    if (!content) {
      const finishReason = data.candidates?.[0]?.finishReason || 'UNKNOWN';
      throw new Error(`Gemini devolvió contenido vacío (finishReason: ${finishReason})`);
    }

    return { content, confidence: 0.95, tokensUsed };
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.9,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens;

    if (!content) throw new Error('OpenAI devolvió contenido vacío');

    return { content, confidence: 0.95, tokensUsed };
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: input }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens;

    if (!content) throw new Error('Anthropic devolvió contenido vacío');

    return { content, confidence: 0.95, tokensUsed };
  }

  throw new Error(`Provider ${provider} no soportado`);
}

/**
 * Ejecuta la cadena completa de skills.
 * Si hay fases definidas para el generation_type, las fases corren SECUENCIALMENTE
 * pero los skills DENTRO de cada fase corren en PARALELO (Promise.allSettled).
 * Fallback: ejecución secuencial skill por skill (comportamiento original).
 */
export async function executeSkillChain(
  context: SkillContext,
  aiConfig: AIConfig
): Promise<SkillChainResult> {
  const startTime = Date.now();

  const phases = getSkillPhases(context.formData.generation_type);

  if (phases && phases.length > 0) {
    console.log(
      `[Skills] Modo fases (${phases.length} fases, ${phases.reduce((s, p) => s + p.length, 0)} skills total)`
    );
    return executeSkillChainByPhases(phases, context, aiConfig, startTime);
  }

  // ── Fallback: ejecución secuencial original ──────────────────────────────
  const activeSkills = getActiveSkills({
    sphere_phase: context.formData.sphere_phase,
    consciousness_level: context.formData.consciousness_level,
    narrative_structure: context.formData.narrative_structure,
    generation_type: context.formData.generation_type,
  });

  console.log(
    `[Skills] Modo secuencial: ${activeSkills.map((s) => `${s.id}(p${s.priority})`).join(', ')}`
  );

  if (activeSkills.length === 0) {
    return {
      success: false,
      finalOutput: '',
      executions: [],
      totalDurationMs: Date.now() - startTime,
      errors: ['No hay skills activos para este contexto'],
    };
  }

  const executions: SkillExecution[] = [];
  const errors: string[] = [];
  let currentOutput = '';

  for (const skill of activeSkills) {
    const skillStartTime = Date.now();
    console.log(`[Skill] ▶ ${skill.name} (p${skill.priority})`);

    try {
      const skillInput = buildSkillInput(skill, context, currentOutput, executions);
      const response = await callAIWithSkill(skill, skillInput, aiConfig);

      const execution: SkillExecution = {
        skillId: skill.id,
        input: skillInput.substring(0, 500) + '...',
        output: response.content,
        confidence: response.confidence,
        executedAt: new Date(),
        durationMs: Date.now() - skillStartTime,
      };

      executions.push(execution);
      currentOutput = response.content;

      console.log(`[Skill] ✓ ${skill.name} en ${execution.durationMs}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Skill] ✗ Error en ${skill.name}:`, errorMessage);
      errors.push(`${skill.id}: ${errorMessage}`);
    }
  }

  const totalDurationMs = Date.now() - startTime;
  console.log(`[Skills] Completado en ${totalDurationMs}ms. ${executions.length}/${activeSkills.length} skills ok`);

  return {
    success: executions.length > 0,
    finalOutput: currentOutput,
    executions,
    totalDurationMs,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Ejecuta la cadena en fases: paralelo dentro de cada fase, secuencial entre fases.
 * El output de cada fase se concatena y se pasa como input a la siguiente.
 */
async function executeSkillChainByPhases(
  phases: Skill[][],
  context: SkillContext,
  aiConfig: AIConfig,
  startTime: number
): Promise<SkillChainResult> {
  const allExecutions: SkillExecution[] = [];
  const allErrors: string[] = [];
  let phaseOutput = ''; // Output acumulado que pasa de fase a fase

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const phaseStart = Date.now();

    console.log(
      `[Skills] Fase ${phaseIdx + 1}/${phases.length}: [${phase.map((s) => s.name).join(', ')}]`
    );

    // Ejecutar todos los skills de la fase en paralelo
    const phaseResults = await Promise.allSettled(
      phase.map(async (skill) => {
        const skillStart = Date.now();
        const input = buildSkillInput(skill, context, phaseOutput, allExecutions);
        const response = await callAIWithSkill(skill, input, aiConfig);
        return {
          skill,
          content: response.content,
          confidence: response.confidence,
          durationMs: Date.now() - skillStart,
        };
      })
    );

    // Recolectar resultados y armar el output fusionado de la fase
    const phaseParts: string[] = [];
    for (const result of phaseResults) {
      if (result.status === 'fulfilled') {
        const { skill, content, confidence, durationMs } = result.value;
        allExecutions.push({
          skillId: skill.id,
          input: '...',
          output: content,
          confidence,
          executedAt: new Date(),
          durationMs,
        });
        phaseParts.push(`### ${skill.name}\n${content}`);
        console.log(`[Skill] ✓ ${skill.name} en ${durationMs}ms`);
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[Skill] ✗ Error en fase ${phaseIdx + 1}:`, msg);
        allErrors.push(msg);
      }
    }

    // El output fusionado de esta fase = input para la siguiente
    phaseOutput = phaseParts.join('\n\n---\n\n');
    console.log(`[Skills] Fase ${phaseIdx + 1} completada en ${Date.now() - phaseStart}ms`);
  }

  const totalDurationMs = Date.now() - startTime;
  console.log(`[Skills] Cadena por fases completada en ${totalDurationMs}ms. ${allExecutions.length} skills ok`);

  return {
    success: allExecutions.length > 0,
    finalOutput: phaseOutput,
    executions: allExecutions,
    totalDurationMs,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}

/**
 * Ejecuta un skill individual
 */
export async function executeSingleSkill(
  skill: Skill,
  context: SkillContext,
  aiConfig: AIConfig,
  previousOutput?: string
): Promise<SkillExecution> {
  const startTime = Date.now();
  const input = buildSkillInput(skill, context, previousOutput || '', []);
  const response = await callAIWithSkill(skill, input, aiConfig);

  return {
    skillId: skill.id,
    input: input.substring(0, 500) + '...',
    output: response.content,
    confidence: response.confidence,
    executedAt: new Date(),
    durationMs: Date.now() - startTime,
  };
}
