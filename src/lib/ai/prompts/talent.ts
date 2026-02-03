import type { PromptConfig } from "../types";
import { KREOON_IDENTITY, JSON_OUTPUT_RULES } from "./base";

export const TALENT_PROMPTS: Record<string, PromptConfig> = {
  matching: {
    id: "talent.matching.ai",
    moduleKey: "talent.matching.ai",
    name: "Matching de Talento",
    description: "Encuentra el mejor talento para un proyecto",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Asistente de Asignación de Talento UGC

Tu trabajo es recomendar el mejor creador/editor para un proyecto considerando:

CRITERIOS BASE:
1. Carga de trabajo actual (menos es mejor)
2. Quality score (mayor es mejor)
3. Reliability score (mayor es mejor)
4. Velocity score (mayor es mejor)
5. Nivel recomendado por IA
6. Flags de riesgo

CRITERIO DE FIT CON AVATAR (cuando esté disponible):
Si conoces el avatar objetivo del contenido, considera:
- Similitud demográfica creador-avatar
- Experiencia del creador con esa audiencia
- Estilo de comunicación compatible
- Tono ideal del mensaje

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Encuentra el mejor {role} para este proyecto:

REQUISITOS:
- Rol buscado: {role}
- Deadline: {deadline}
- Prioridad: {priority}
- Tipo de contenido: {content_type}

{avatar_context}

TALENTOS DISPONIBLES:
{talents_json}

Responde con JSON:
{
  "recommended_talent_id": "uuid",
  "confidence": 0-100,
  "reasoning": "string",
  "fit_score": 0-100,
  "alternatives": [
    { "talent_id": "uuid", "score": 0-100, "reason": "string" }
  ]
}`,
    variables: [
      { key: "role", description: "Rol buscado (creator/editor)", required: true, type: "string" },
      { key: "deadline", description: "Fecha límite", required: false, type: "string" },
      { key: "priority", description: "Prioridad", required: false, type: "string" },
      { key: "content_type", description: "Tipo de contenido", required: false, type: "string" },
      { key: "avatar_context", description: "Contexto del avatar (generado)", required: false, type: "string" },
      { key: "talents_json", description: "JSON de talentos disponibles", required: true, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.4, maxTokens: 2000 },
    category: "talent",
  },

  quality: {
    id: "talent.quality.ai",
    moduleKey: "talent.quality.ai",
    name: "Evaluación de Calidad",
    description: "Evalúa la calidad del trabajo entregado",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Evaluador de Calidad UGC

Evalúa el trabajo entregado considerando:
1. Cumplimiento del brief
2. Calidad técnica (video, audio, iluminación)
3. Creatividad y originalidad
4. Conexión emocional con el avatar objetivo
5. Potencial de engagement

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Evalúa este trabajo entregado:

BRIEF ORIGINAL:
{brief_summary}

ENTREGA:
- Tipo: {content_type}
- Duración: {duration}
- Formato: {format}
- Notas del creador: {creator_notes}

{avatar_context}

HISTORIAL DEL CREADOR:
- Entregas anteriores: {previous_deliveries}
- Score promedio: {avg_score}

Responde con JSON:
{
  "quality_score": 0-100,
  "dimensions": {
    "brief_compliance": 0-100,
    "technical_quality": 0-100,
    "creativity": 0-100,
    "emotional_connection": 0-100,
    "engagement_potential": 0-100
  },
  "strengths": ["strength1"],
  "improvements": ["improvement1"],
  "overall_feedback": "string"
}`,
    variables: [
      { key: "brief_summary", description: "Resumen del brief", required: true, type: "string" },
      { key: "content_type", description: "Tipo de contenido", required: true, type: "string" },
      { key: "duration", description: "Duración", required: false, type: "string" },
      { key: "format", description: "Formato", required: false, type: "string" },
      { key: "creator_notes", description: "Notas del creador", required: false, type: "string" },
      { key: "avatar_context", description: "Contexto del avatar objetivo (generado)", required: false, type: "string" },
      { key: "previous_deliveries", description: "Entregas anteriores", required: false, type: "number" },
      { key: "avg_score", description: "Score promedio", required: false, type: "number" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 2000 },
    category: "talent",
  },

  risk: {
    id: "talent.risk.ai",
    moduleKey: "talent.risk.ai",
    name: "Análisis de Riesgo",
    description: "Analiza el riesgo de un talento",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Analista de Riesgo de Talento

Analiza señales de riesgo considerando:
1. Patrones de entrega (retrasos, rechazos)
2. Carga de trabajo actual
3. Tendencias de calidad
4. Señales de burnout
5. Disponibilidad comunicada

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Analiza el riesgo de este talento:

PERFIL:
- Nombre: {talent_name}
- Rol: {role}
- Tiempo en plataforma: {tenure}

MÉTRICAS:
- Quality score: {quality_score}
- Reliability score: {reliability_score}
- Velocity score: {velocity_score}
- Tareas activas: {active_tasks}
- Tareas completadas (30 días): {completed_30d}
- Rechazos recientes: {recent_rejections}

HISTORIAL:
{delivery_history}

Responde con JSON:
{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0-100,
  "risk_factors": [
    { "factor": "string", "severity": "low|medium|high", "evidence": "string" }
  ],
  "burnout_probability": 0-100,
  "churn_probability": 0-100,
  "recommended_actions": ["action1"],
  "safe_to_assign": true|false
}`,
    variables: [
      { key: "talent_name", description: "Nombre del talento", required: true, type: "string" },
      { key: "role", description: "Rol", required: true, type: "string" },
      { key: "tenure", description: "Tiempo en plataforma", required: false, type: "string" },
      { key: "quality_score", description: "Quality score", required: true, type: "number" },
      { key: "reliability_score", description: "Reliability score", required: true, type: "number" },
      { key: "velocity_score", description: "Velocity score", required: true, type: "number" },
      { key: "active_tasks", description: "Tareas activas", required: true, type: "number" },
      { key: "completed_30d", description: "Completadas en 30 días", required: false, type: "number" },
      { key: "recent_rejections", description: "Rechazos recientes", required: false, type: "number" },
      { key: "delivery_history", description: "Historial de entregas", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 2000 },
    category: "talent",
  },

  reputation: {
    id: "talent.reputation.ai",
    moduleKey: "talent.reputation.ai",
    name: "Cálculo de Reputación",
    description: "Calcula y evalúa la reputación del talento",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Analista de Reputación y Desarrollo de Talento

Evalúa la reputación del talento considerando:
1. Historial de entregas y calidad consistente
2. Diversidad de avatares/contenidos con los que ha trabajado
3. Trayectoria de mejora
4. Potencial de embajador
5. Recomendaciones de desarrollo

Si hay contexto de avatares con los que ha producido contenido, úsalo para evaluar versatilidad.

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Evalúa la reputación del siguiente talento:

PERFIL:
{profile_json}

MEMBRESÍA:
{membership_json}

CONTENIDO COMPLETADO (últimos 50):
{completed_content_json}

PUNTOS UP:
{points_json}

{avatar_diversity_context}

Responde con JSON:
{
  "recommended_level": "junior|pro|elite",
  "level_reasoning": "string",
  "ambassador_potential": 0-100,
  "ambassador_reasoning": "string",
  "recommendations": [
    { "type": "level_up|make_ambassador|increase_load|training", "reason": "string", "confidence": 0-100 }
  ],
  "strengths": ["strength1"],
  "development_areas": ["area1"]
}`,
    variables: [
      { key: "profile_json", description: "JSON del perfil", required: true, type: "string" },
      { key: "membership_json", description: "JSON de membresía", required: false, type: "string" },
      { key: "completed_content_json", description: "JSON de contenido completado", required: true, type: "string" },
      { key: "points_json", description: "JSON de puntos UP", required: false, type: "string" },
      { key: "avatar_diversity_context", description: "Contexto de avatares con los que ha trabajado", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 2000 },
    category: "talent",
  },

  ambassador: {
    id: "talent.ambassador.ai",
    moduleKey: "talent.ambassador.ai",
    name: "Evaluación de Potencial Embajador",
    description: "Evalúa el rendimiento y potencial como embajador",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Analista de Embajadores de Marca

Los embajadores son actores clave de crecimiento: producen + atraen + validan + representan la marca.

Evalúa considerando:
1. Impacto de red (referidos activos, contenido generado por su red)
2. Calidad del trabajo personal
3. Retención de su red
4. Potencial de ascenso/descenso de nivel (bronze → silver → gold)
5. Diversidad de avatares que su red puede representar
6. Riesgos (embajador pasivo, red inactiva, pérdida de engagement)

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Evalúa el rendimiento de este embajador:

PERFIL:
{profile_json}

MEMBRESÍA:
{membership_json}

REFERIDOS ({referral_count}):
{referrals_json}

ESTADÍSTICAS DE RED (últimos 6 meses):
{network_stats_json}

CONTENIDO DE SU RED:
{network_content_json}

PUNTOS UP:
{points_json}

{avatar_context}

Responde con JSON:
{
  "recommended_level": "none|bronze|silver|gold",
  "current_level": "string",
  "level_change": "up|down|same",
  "justification": ["reason1"],
  "risk_flags": ["flag1"],
  "suggested_actions": [
    { "type": "ascend|descend|reward|warning|training", "description": "string", "priority": "high|medium|low" }
  ],
  "network_metrics": {
    "active_referrals": number,
    "network_content_count": number,
    "network_quality_avg": 0-10,
    "retention_rate": 0-100,
    "estimated_revenue_impact": number
  },
  "confidence": 0-100
}`,
    variables: [
      { key: "profile_json", description: "JSON del perfil", required: true, type: "string" },
      { key: "membership_json", description: "JSON de membresía", required: false, type: "string" },
      { key: "referral_count", description: "Cantidad de referidos", required: false, type: "number" },
      { key: "referrals_json", description: "JSON de referidos", required: false, type: "string" },
      { key: "network_stats_json", description: "JSON de estadísticas de red", required: false, type: "string" },
      { key: "network_content_json", description: "JSON de contenido de la red", required: false, type: "string" },
      { key: "points_json", description: "JSON de puntos UP", required: false, type: "string" },
      { key: "avatar_context", description: "Contexto de avatares que su red puede alcanzar", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 2500 },
    category: "talent",
  },
};
