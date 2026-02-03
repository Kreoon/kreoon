import type { PromptConfig } from "../types";
import { KREOON_IDENTITY, JSON_OUTPUT_RULES } from "./base";

export const UP_PROMPTS: Record<string, PromptConfig> = {
  quality_score: {
    id: "up.quality.ai",
    moduleKey: "up.quality.ai",
    name: "Quality Score para Puntos",
    description: "Evalúa la calidad del contenido para asignar puntos",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Evaluador de Calidad UGC para Gamificación

Tu trabajo es evaluar contenido entregado para determinar puntos bonus por calidad.

DIMENSIONES A EVALUAR:
1. Cumplimiento del brief (0-100)
2. Calidad técnica (0-100)
3. Creatividad (0-100)
4. Potencial de engagement (0-100)
5. Alineación con marca (0-100)

REGLAS DE PUNTOS:
- Score 90-100: +50 puntos bonus (Excelente)
- Score 75-89: +25 puntos bonus (Bueno)
- Score 60-74: +10 puntos bonus (Aceptable)
- Score <60: Sin bonus

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Evalúa este contenido para puntos UP:

CONTENIDO:
- Título: {title}
- Tipo: {content_type}
- Cliente: {client_name}
- Producto: {product_name}

BRIEF:
{brief_summary}

ENTREGA:
- Duración: {duration}
- Tiene guión aprobado: {has_approved_script}
- Revisiones solicitadas: {revision_count}
- Tiempo de entrega: {delivery_time}

CONTEXTO DEL PRODUCTO:
{product_context}

Responde con JSON:
{
  "quality_score": 0-100,
  "dimensions": {
    "brief_compliance": 0-100,
    "technical_quality": 0-100,
    "creativity": 0-100,
    "engagement_potential": 0-100,
    "brand_alignment": 0-100
  },
  "bonus_points": 0|10|25|50,
  "bonus_reason": "string",
  "strengths": ["strength1"],
  "improvements": ["improvement1"],
  "feedback_for_creator": "string"
}`,
    variables: [
      { key: "title", description: "Título del contenido", required: true, type: "string" },
      { key: "content_type", description: "Tipo de contenido", required: true, type: "string" },
      { key: "client_name", description: "Nombre del cliente", required: false, type: "string" },
      { key: "product_name", description: "Nombre del producto", required: false, type: "string" },
      { key: "brief_summary", description: "Resumen del brief", required: true, type: "string" },
      { key: "duration", description: "Duración", required: false, type: "string" },
      { key: "has_approved_script", description: "¿Tiene guión aprobado?", required: false, type: "boolean" },
      { key: "revision_count", description: "Número de revisiones", required: false, type: "number" },
      { key: "delivery_time", description: "Tiempo de entrega", required: false, type: "string" },
      { key: "product_context", description: "Contexto del producto", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.3, maxTokens: 2000 },
    category: "up",
  },

  detect_events: {
    id: "up.events.ai",
    moduleKey: "up.events.ai",
    name: "Detección de Eventos",
    description: "Detecta eventos de gamificación en acciones del usuario",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Detector de Eventos de Gamificación

Tu trabajo es analizar acciones del usuario y detectar eventos que merecen puntos:

EVENTOS DETECTABLES:
- Primera entrega del día (+5 puntos)
- Racha de 3 días consecutivos (+15 puntos)
- Entrega antes del deadline (+10 puntos)
- Contenido aprobado sin revisiones (+20 puntos)
- Combo: múltiples entregas en 24h (+5 por cada adicional)
- Nuevo nivel alcanzado (bonus variable)
- Logro desbloqueado (bonus variable)

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Detecta eventos de gamificación:

ACCIÓN ACTUAL:
- Tipo: {action_type}
- Timestamp: {timestamp}
- Detalles: {action_details}

CONTEXTO DEL USUARIO:
- Nivel actual: {current_level}
- Puntos acumulados: {total_points}
- Racha actual: {current_streak} días
- Última actividad: {last_activity}
- Entregas hoy: {deliveries_today}

HISTORIAL RECIENTE:
{recent_history}

Responde con JSON:
{
  "detected_events": [
    {
      "event_type": "string",
      "points": number,
      "reason": "string",
      "multiplier": 1.0
    }
  ],
  "streak_status": {
    "current": number,
    "will_break": true|false,
    "next_milestone": number
  },
  "level_progress": {
    "current_level": number,
    "progress_to_next": 0-100,
    "points_to_next": number
  },
  "achievements_unlocked": ["achievement1"],
  "total_points_earned": number
}`,
    variables: [
      { key: "action_type", description: "Tipo de acción", required: true, type: "string" },
      { key: "timestamp", description: "Timestamp", required: true, type: "string" },
      { key: "action_details", description: "Detalles de la acción", required: false, type: "string" },
      { key: "current_level", description: "Nivel actual", required: true, type: "number" },
      { key: "total_points", description: "Puntos totales", required: true, type: "number" },
      { key: "current_streak", description: "Racha actual", required: true, type: "number" },
      { key: "last_activity", description: "Última actividad", required: false, type: "string" },
      { key: "deliveries_today", description: "Entregas hoy", required: false, type: "number" },
      { key: "recent_history", description: "Historial reciente", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.2, maxTokens: 2000 },
    category: "up",
  },

  antifraud: {
    id: "up.antifraud.ai",
    moduleKey: "up.antifraud.ai",
    name: "Detección de Fraude",
    description: "Detecta patrones sospechosos de fraude en puntos",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Sistema Anti-fraude de Gamificación

Tu trabajo es detectar patrones sospechosos que podrían indicar manipulación del sistema de puntos:

SEÑALES DE ALERTA:
1. Actividad a horas inusuales
2. Patrones repetitivos no naturales
3. Velocidad de acciones imposible
4. Acciones que no generan valor real
5. Múltiples cuentas con patrones similares
6. Picos de actividad seguidos de inactividad

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Analiza esta actividad por señales de fraude:

USUARIO:
- ID: {user_id}
- Tiempo en plataforma: {tenure}
- Nivel: {level}
- Puntos totales: {total_points}

ACTIVIDAD RECIENTE (últimas 24h):
{recent_activity}

PATRONES HISTÓRICOS:
- Promedio acciones/día: {avg_daily_actions}
- Horarios habituales: {usual_hours}
- Dispositivos usados: {devices}

ACTIVIDAD ACTUAL:
- Acciones en última hora: {actions_last_hour}
- Puntos ganados hoy: {points_today}
- Anomalías detectadas por sistema: {system_flags}

Responde con JSON:
{
  "risk_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "suspicious_patterns": [
    {
      "pattern": "string",
      "severity": "low|medium|high",
      "evidence": "string",
      "confidence": 0-100
    }
  ],
  "recommended_action": "none|monitor|warn|suspend|investigate",
  "points_to_review": number,
  "explanation": "string"
}`,
    variables: [
      { key: "user_id", description: "ID del usuario", required: true, type: "string" },
      { key: "tenure", description: "Tiempo en plataforma", required: false, type: "string" },
      { key: "level", description: "Nivel", required: true, type: "number" },
      { key: "total_points", description: "Puntos totales", required: true, type: "number" },
      { key: "recent_activity", description: "Actividad reciente", required: true, type: "string" },
      { key: "avg_daily_actions", description: "Promedio acciones/día", required: false, type: "number" },
      { key: "usual_hours", description: "Horarios habituales", required: false, type: "string" },
      { key: "devices", description: "Dispositivos", required: false, type: "string" },
      { key: "actions_last_hour", description: "Acciones última hora", required: true, type: "number" },
      { key: "points_today", description: "Puntos hoy", required: true, type: "number" },
      { key: "system_flags", description: "Flags del sistema", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.2, maxTokens: 2000 },
    category: "up",
  },

  recommendations: {
    id: "up.recommendations.ai",
    moduleKey: "up.recommendations.ai",
    name: "Generador de Misiones",
    description: "Genera misiones y retos personalizados",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Generador de Misiones y Retos

Tu trabajo es crear misiones personalizadas que:
1. Sean alcanzables pero desafiantes
2. Estén alineadas con los objetivos del usuario
3. Fomenten comportamientos positivos
4. Mantengan el engagement

TIPOS DE MISIONES:
- Diarias: Pequeñas, fáciles de completar
- Semanales: Más ambiciosas, mayor recompensa
- Especiales: Por eventos o temporadas
- De crecimiento: Para subir de nivel

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Genera misiones para este usuario:

PERFIL:
- Rol: {role}
- Nivel: {level}
- Especialidades: {specialties}

ESTADÍSTICAS:
- Entregas este mes: {deliveries_month}
- Quality score promedio: {avg_quality}
- Racha actual: {streak}

MISIONES COMPLETADAS:
{completed_missions}

MISIONES ACTIVAS:
{active_missions}

PREFERENCIAS:
- Tipos de contenido favoritos: {favorite_types}
- Horarios de mayor actividad: {active_hours}

Responde con JSON:
{
  "suggested_missions": [
    {
      "id": "string",
      "type": "daily|weekly|special|growth",
      "title": "string",
      "description": "string",
      "requirements": ["req1"],
      "reward_points": number,
      "difficulty": "easy|medium|hard",
      "estimated_time": "string",
      "expires_at": "ISO date"
    }
  ],
  "personalization_notes": "string",
  "next_level_path": {
    "current_progress": 0-100,
    "suggested_focus": "string"
  }
}`,
    variables: [
      { key: "role", description: "Rol del usuario", required: true, type: "string" },
      { key: "level", description: "Nivel", required: true, type: "number" },
      { key: "specialties", description: "Especialidades", required: false, type: "string" },
      { key: "deliveries_month", description: "Entregas del mes", required: false, type: "number" },
      { key: "avg_quality", description: "Quality score promedio", required: false, type: "number" },
      { key: "streak", description: "Racha actual", required: false, type: "number" },
      { key: "completed_missions", description: "Misiones completadas", required: false, type: "string" },
      { key: "active_missions", description: "Misiones activas", required: false, type: "string" },
      { key: "favorite_types", description: "Tipos favoritos", required: false, type: "string" },
      { key: "active_hours", description: "Horarios activos", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.7, maxTokens: 2500 },
    category: "up",
  },

  consultor: {
    id: "up.consultor.ai",
    moduleKey: "up.consultor.ai",
    name: "Consultor de Gamificación",
    description: "Consultor general de gamificación y reglas del sistema UP",
    systemPrompt: `${KREOON_IDENTITY}

🎯 ROL: Consultor de Gamificación Sistema UP

Tu trabajo es asesorar sobre el sistema de gamificación UP:
1. Explicar reglas, niveles y mecánicas
2. Recomendar ajustes de reglas para la organización
3. Sugerir balances entre engagement y sostenibilidad
4. Analizar métricas y tendencias
5. Proponer mejoras al sistema de puntos

ÁREAS DE CONSULTORÍA:
- Reglas de puntos y multiplicadores
- Umbrales de niveles
- Diseño de misiones y logros
- Anti-fraude y fair play
- Engagement y retención

${JSON_OUTPUT_RULES}`,
    userPromptTemplate: `Consulta de gamificación:

CONTEXTO DE LA ORGANIZACIÓN:
- ID: {organization_id}
- Reglas actuales: {current_rules}
- Métricas recientes: {metrics_summary}

PREGUNTA O TEMA:
{query}

DATOS DISPONIBLES (si aplica):
{context_data}

Responde con JSON:
{
  "response": "string",
  "recommendations": [
    {
      "type": "rule|balance|engagement|antifraud|other",
      "title": "string",
      "description": "string",
      "impact": "low|medium|high",
      "priority": 1-5
    }
  ],
  "metrics_insight": "string",
  "next_steps": ["step1"]
}`,
    variables: [
      { key: "organization_id", description: "ID de la organización", required: false, type: "string" },
      { key: "current_rules", description: "Reglas actuales", required: false, type: "string" },
      { key: "metrics_summary", description: "Resumen de métricas", required: false, type: "string" },
      { key: "query", description: "Pregunta o tema de consulta", required: true, type: "string" },
      { key: "context_data", description: "Datos adicionales", required: false, type: "string" },
    ],
    outputFormat: "json",
    defaults: { temperature: 0.4, maxTokens: 2500 },
    category: "up",
  },
};
