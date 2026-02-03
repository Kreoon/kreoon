import type { PromptConfig } from "../types";
import { KREOON_IDENTITY, ESFERA_CONTEXT, JSON_OUTPUT_RULES } from "./base";

export const BOARD_PROMPTS: Record<string, PromptConfig> = {
  analyze_card: {
    id: "board.cards.ai",
    moduleKey: "board.cards.ai",
    name: "Análisis de Tarjeta",
    description: "Analiza una tarjeta del tablero Kanban",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Analista de Producción de Contenido UGC

Tu trabajo es evaluar tarjetas del tablero Kanban de producción, considerando:
1. Tiempos y deadlines
2. Asignaciones y carga de trabajo
3. Dependencias (guión → grabación → edición)
4. Contexto del producto y campaña cuando esté disponible
5. Fase del embudo (ESFERA) si está definida

${ESFERA_CONTEXT}

Si conoces el producto y la fase ESFERA, úsalos para:
- Priorizar según urgencia de la campaña
- Sugerir ajustes basados en el avatar objetivo
- Identificar si el contenido está alineado con la fase del embudo

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Analiza esta tarjeta del tablero de producción:

DATOS DE LA TARJETA:
- Título: {title}
- Cliente: {client_name}
- Estado actual: {status}
- Días en este estado: {days_in_status}
- Deadline: {deadline}
- Creador: {creator_name}
- Editor: {editor_name}
- Tiene guión: {has_script}
- Tiene video: {has_video}
- Historial de estados: {status_history}

{product_context}

Responde con JSON:
{
  "risk_level": "low|medium|high|critical",
  "risk_factors": ["factor1", "factor2"],
  "recommendations": ["rec1", "rec2"],
  "next_actions": [
    { "action": "string", "responsible": "creator|editor|admin", "priority": 1-5 }
  ],
  "bottleneck_probability": 0-100,
  "product_insights": {
    "alignment_with_avatar": "string",
    "esfera_phase_notes": "string",
    "content_fit_score": 0-100
  }
}`,
    variables: [
      { key: "title", description: "Título del contenido", required: true, type: "string" },
      { key: "client_name", description: "Nombre del cliente", required: false, type: "string" },
      { key: "status", description: "Estado actual", required: true, type: "string" },
      { key: "days_in_status", description: "Días en estado actual", required: true, type: "number" },
      { key: "deadline", description: "Fecha límite", required: false, type: "string" },
      { key: "creator_name", description: "Nombre del creador", required: false, type: "string" },
      { key: "editor_name", description: "Nombre del editor", required: false, type: "string" },
      { key: "has_script", description: "¿Tiene guión?", required: true, type: "boolean" },
      { key: "has_video", description: "¿Tiene video?", required: true, type: "boolean" },
      { key: "status_history", description: "Historial de estados", required: false, type: "string" },
      { key: "product_context", description: "Contexto del producto (generado)", required: false, type: "string" },
    ],
    outputFormat: "json",
    outputSchema: {
      risk_level: "string",
      risk_factors: "string[]",
      recommendations: "string[]",
      next_actions: "object[]",
      bottleneck_probability: "number",
      product_insights: "object",
    },
    defaults: { temperature: 0.4, maxTokens: 2000 },
    category: "board",
  },

  analyze_board: {
    id: "board.states.ai",
    moduleKey: "board.states.ai",
    name: "Análisis de Tablero",
    description: "Analiza el estado general del tablero de producción",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Analista de Productividad Kanban

Tu trabajo es evaluar la salud del tablero de producción completo:
1. Distribución de tarjetas por estado
2. Cuellos de botella
3. Carga de trabajo por persona
4. Tendencias y predicciones

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Analiza este tablero de producción:

MÉTRICAS GENERALES:
- Total de tarjetas: {total_cards}
- Tarjetas vencidas: {overdue_count}
- Distribución por estado: {status_distribution}
- Tareas por creador: {tasks_by_creator}
- Tareas por editor: {tasks_by_editor}

Responde con JSON:
{
  "health_score": 0-100,
  "critical_issues": ["issue1"],
  "bottlenecks": [{ "state": "string", "severity": "low|medium|high", "cause": "string" }],
  "workload_analysis": {
    "overloaded": ["person1"],
    "underutilized": ["person2"],
    "balanced": ["person3"]
  },
  "predictions": [{ "prediction": "string", "probability": 0-100, "timeframe": "string" }],
  "recommendations": ["rec1", "rec2"]
}`,
    variables: [
      { key: "total_cards", description: "Total de tarjetas", required: true, type: "number" },
      { key: "overdue_count", description: "Tarjetas vencidas", required: true, type: "number" },
      { key: "status_distribution", description: "Distribución por estado", required: true, type: "string" },
      { key: "tasks_by_creator", description: "Tareas por creador", required: false, type: "string" },
      { key: "tasks_by_editor", description: "Tareas por editor", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 2500 },
    category: "board",
  },

  suggest_next_state: {
    id: "board.flows.ai",
    moduleKey: "board.flows.ai",
    name: "Sugerir Siguiente Estado",
    description: "Sugiere el siguiente estado para una tarjeta",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Asistente de Flujo de Trabajo

Tu trabajo es sugerir el siguiente estado óptimo para una tarjeta basándote en:
1. Estado actual y completitud
2. Dependencias (¿tiene guión? ¿tiene video?)
3. Asignaciones (¿tiene creador? ¿tiene editor?)
4. Flujo estándar de producción UGC

FLUJO ESTÁNDAR:
Nuevo → Borrador → En Producción → En Edición → Revisión → Aprobado → Completado

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Sugiere el siguiente estado para esta tarjeta:

- Estado actual: {current_status}
- Tiene guión: {has_script}
- Tiene video: {has_video}
- Creador asignado: {has_creator}
- Editor asignado: {has_editor}
- Comentarios recientes: {recent_comments}

Responde con JSON:
{
  "suggested_state": "string",
  "confidence": 0-100,
  "reasoning": "string",
  "prerequisites_met": true|false,
  "missing_prerequisites": ["prereq1"],
  "alternative_states": [{ "state": "string", "reason": "string" }]
}`,
    variables: [
      { key: "current_status", description: "Estado actual", required: true, type: "string" },
      { key: "has_script", description: "¿Tiene guión?", required: true, type: "boolean" },
      { key: "has_video", description: "¿Tiene video?", required: true, type: "boolean" },
      { key: "has_creator", description: "¿Tiene creador?", required: true, type: "boolean" },
      { key: "has_editor", description: "¿Tiene editor?", required: true, type: "boolean" },
      { key: "recent_comments", description: "Comentarios recientes", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 1500 },
    category: "board",
  },

  recommend_automation: {
    id: "board.automation.ai",
    moduleKey: "board.automation.ai",
    name: "Recomendar Automatización",
    description: "Sugiere automatizaciones basadas en patrones del tablero",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Experto en Automatización de Flujos

Tu trabajo es identificar oportunidades de automatización en el tablero:
1. Transiciones frecuentes que podrían ser automáticas
2. Notificaciones que podrían enviarse automáticamente
3. Asignaciones que siguen patrones predecibles
4. Tareas repetitivas que podrían automatizarse

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Analiza estos patrones de transiciones y sugiere automatizaciones:

TRANSICIONES FRECUENTES:
{transition_patterns}

REGLAS ACTUALES:
{current_rules}

Responde con JSON:
{
  "suggested_automations": [
    {
      "name": "string",
      "trigger": { "event": "string", "conditions": ["cond1"] },
      "action": { "type": "move|notify|assign", "details": "string" },
      "impact": "low|medium|high",
      "confidence": 0-100
    }
  ],
  "warnings": ["warning1"],
  "estimated_time_saved": "X horas/semana"
}`,
    variables: [
      { key: "transition_patterns", description: "Patrones de transición", required: true, type: "string" },
      { key: "current_rules", description: "Reglas actuales", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.5, maxTokens: 2000 },
    category: "board",
  },
};
