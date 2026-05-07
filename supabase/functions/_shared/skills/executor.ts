/**
 * Ejecutor de Skills - Orquesta la ejecución secuencial de skills
 */

import {
  Skill,
  SkillContext,
  SkillExecution,
  SkillChainResult,
} from './types.ts';
import { getActiveSkills, interpolateSkillPrompt } from './registry.ts';

interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

/**
 * Construye el input para un skill específico
 */
export function buildSkillInput(
  skill: Skill,
  context: SkillContext,
  previousOutput: string,
  executions: SkillExecution[]
): string {
  const { product, formData, perplexityResearch } = context;

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
Fase ESFERA: ${formData.sphere_phase || 'solution'}
Nivel de Consciencia: ${formData.consciousness_level || 'problem_aware'}
Estructura Narrativa: ${formData.narrative_structure || 'problema-solución'}
Cantidad de Hooks: ${formData.hooks_count || 3}
CTA: ${formData.cta || 'N/A'}
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
 * Llama a la IA con el prompt del skill
 */
export async function callAIWithSkill(
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
            maxOutputTokens: 2048,
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
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens;

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
        max_tokens: 2048,
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

    return { content, confidence: 0.95, tokensUsed };
  }

  throw new Error(`Provider ${provider} no soportado`);
}

/**
 * Ejecuta la cadena completa de skills
 */
export async function executeSkillChain(
  context: SkillContext,
  aiConfig: AIConfig
): Promise<SkillChainResult> {
  const startTime = Date.now();

  // Obtener skills activos según el contexto
  const activeSkills = getActiveSkills({
    sphere_phase: context.formData.sphere_phase,
    consciousness_level: context.formData.consciousness_level,
    narrative_structure: context.formData.narrative_structure,
  });

  console.log(
    `[Skills] Activados: ${activeSkills.map((s) => `${s.id}(p${s.priority})`).join(', ')}`
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

  // Ejecutar skills en secuencia (ordenados por prioridad)
  for (const skill of activeSkills) {
    const skillStartTime = Date.now();
    console.log(`[Skill] ▶ Ejecutando: ${skill.name} (prioridad: ${skill.priority})`);

    try {
      const skillInput = buildSkillInput(skill, context, currentOutput, executions);
      const response = await callAIWithSkill(skill, skillInput, aiConfig);

      const execution: SkillExecution = {
        skillId: skill.id,
        input: skillInput.substring(0, 500) + '...', // Truncar para logging
        output: response.content,
        confidence: response.confidence,
        executedAt: new Date(),
        durationMs: Date.now() - skillStartTime,
      };

      executions.push(execution);
      currentOutput = response.content;

      console.log(
        `[Skill] ✓ ${skill.name} completado en ${execution.durationMs}ms (${response.content.length} chars)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Skill] ✗ Error en ${skill.name}:`, errorMessage);
      errors.push(`${skill.id}: ${errorMessage}`);
      // Continuar con el siguiente skill
    }
  }

  const totalDurationMs = Date.now() - startTime;
  console.log(
    `[Skills] Cadena completada en ${totalDurationMs}ms. Ejecutados: ${executions.length}/${activeSkills.length}`
  );

  return {
    success: executions.length > 0,
    finalOutput: currentOutput,
    executions,
    totalDurationMs,
    errors: errors.length > 0 ? errors : undefined,
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
