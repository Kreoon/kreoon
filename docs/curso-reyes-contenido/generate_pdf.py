# -*- coding: utf-8 -*-
"""
Generador de PDF - Curso Los Reyes del Contenido
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Colores Kreoon
PURPLE = HexColor('#8B5CF6')
PINK = HexColor('#EC4899')
BLUE = HexColor('#3B82F6')
GREEN = HexColor('#10B981')
ORANGE = HexColor('#F97316')
TEAL = HexColor('#14B8A6')
AMBER = HexColor('#F59E0B')
DARK = HexColor('#1F2937')
LIGHT_GRAY = HexColor('#F3F4F6')

def create_styles():
    """Crear estilos personalizados"""
    styles = getSampleStyleSheet()

    # Titulo principal
    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=PURPLE,
        spaceAfter=30,
        alignment=TA_CENTER
    ))

    # Subtitulo
    styles.add(ParagraphStyle(
        name='SubTitle',
        parent=styles['Title'],
        fontSize=16,
        textColor=DARK,
        spaceAfter=20,
        alignment=TA_CENTER
    ))

    # Encabezado de seccion
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=PURPLE,
        spaceBefore=20,
        spaceAfter=12,
        borderColor=PURPLE,
        borderWidth=2,
        borderPadding=5
    ))

    # Encabezado de modulo
    styles.add(ParagraphStyle(
        name='ModuleHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=PINK,
        spaceBefore=15,
        spaceAfter=8
    ))

    # Texto normal (modificar el existente en lugar de agregar)
    styles['BodyText'].fontSize = 10
    styles['BodyText'].textColor = DARK
    styles['BodyText'].spaceAfter = 8
    styles['BodyText'].alignment = TA_JUSTIFY

    # Bullet points
    styles.add(ParagraphStyle(
        name='BulletText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK,
        leftIndent=20,
        spaceAfter=4
    ))

    # Guion (script)
    styles.add(ParagraphStyle(
        name='ScriptText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK,
        leftIndent=15,
        rightIndent=15,
        spaceAfter=6,
        backColor=LIGHT_GRAY
    ))

    # Nota
    styles.add(ParagraphStyle(
        name='NoteText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#6B7280'),
        fontName='Helvetica-Oblique',
        spaceAfter=6
    ))

    return styles

def add_cover_page(story, styles):
    """Agregar portada"""
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("LOS REYES DEL CONTENIDO", styles['MainTitle']))
    story.append(Paragraph("Curso Completo de Kreoon", styles['SubTitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("El Sistema Operativo para Creadores", styles['SubTitle']))
    story.append(Spacer(1, 1*inch))

    # Info del curso
    info = [
        ["<b>Instructor:</b>", "Alexander Cast"],
        ["<b>Plataforma:</b>", "Skool"],
        ["<b>Modelo:</b>", "Free + Premium ($39/mes)"],
        ["<b>Total lecciones:</b>", "45 lecciones (~8 horas)"],
        ["<b>Fecha:</b>", "Abril 2026"],
    ]

    table = Table(info, colWidths=[2*inch, 3*inch])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (0, -1), PURPLE),
    ]))
    story.append(table)

    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("<b>kreoon.com</b>", styles['SubTitle']))
    story.append(PageBreak())

def add_table_of_contents(story, styles):
    """Agregar tabla de contenidos"""
    story.append(Paragraph("TABLA DE CONTENIDOS", styles['SectionHeader']))
    story.append(Spacer(1, 0.3*inch))

    toc = [
        "1. Vision General y Decisiones Clave",
        "2. Estructura del Curso (45 lecciones)",
        "3. Guiones de Video - Modulo 0",
        "4. Guiones de Video - Modulo 1",
        "5. Calendario de Contenido (3 meses)",
        "6. Estructura de Skool",
        "7. Sistema de Gamificacion",
        "8. Funnel de Conversion",
        "9. Plan de Ejecucion (8 semanas)",
        "10. Metricas de Exito",
        "11. Referentes Investigados (50+)",
        "12. Features de Kreoon por Rol",
    ]

    for item in toc:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletText']))

    story.append(PageBreak())

def add_vision_section(story, styles):
    """Seccion de vision general"""
    story.append(Paragraph("1. VISION GENERAL", styles['SectionHeader']))

    story.append(Paragraph("<b>Problema:</b>", styles['ModuleHeader']))
    story.append(Paragraph(
        "Kreoon es una plataforma robusta con 7 roles, 50+ Edge Functions y multiples modulos "
        "(board, chat, portfolio, streaming, AI), pero no existe material educativo estructurado "
        "que ensene a usarla y genere comunidad.",
        styles['BodyText']
    ))

    story.append(Paragraph("<b>Necesidad:</b>", styles['ModuleHeader']))
    needs = [
        "Ensenar a usar Kreoon por rol (talento y clientes)",
        "Aportar valor mas alla de la plataforma (tips de creacion, estrategia, edicion)",
        "Nutrir redes sociales (YouTube, TikTok, Instagram)",
        "Alimentar la comunidad 'Los Reyes del Contenido' en Skool",
        "Convertir espectadores en usuarios de Kreoon",
    ]
    for need in needs:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {need}", styles['BulletText']))

    story.append(Paragraph("<b>Decisiones Clave (Validadas):</b>", styles['ModuleHeader']))

    decisions = [
        ["Aspecto", "Decision"],
        ["Monetizacion", "Comunidad Free + Premium ($39/mes)"],
        ["Redes prioritarias", "YouTube + TikTok + Instagram"],
        ["Instructor", "Alexander Cast (voz: Cristian Sanchez)"],
        ["Frecuencia", "3-5 videos/semana"],
        ["Target primario", "Creadores y editores LATAM"],
        ["Target secundario", "Agencias y marcas buscando talento"],
    ]

    table = Table(decisions, colWidths=[2.5*inch, 3.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PURPLE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
    ]))
    story.append(Spacer(1, 0.2*inch))
    story.append(table)
    story.append(PageBreak())

def add_course_structure(story, styles):
    """Estructura del curso"""
    story.append(Paragraph("2. ESTRUCTURA DEL CURSO", styles['SectionHeader']))

    # Tier Gratuito
    story.append(Paragraph("TIER GRATUITO (18 lecciones, ~3 horas)", styles['ModuleHeader']))
    story.append(Paragraph(
        "<i>Objetivo: Atraer talento, demostrar valor, construir confianza</i>",
        styles['NoteText']
    ))

    free_modules = [
        ["Modulo", "Nombre", "Lecciones", "Duracion"],
        ["0", "Bienvenida", "3", "22 min"],
        ["1", "Content Creator Track", "5", "57 min"],
        ["2", "Editor Track", "5", "55 min"],
        ["3", "Valor Agregado - Creacion", "5", "59 min"],
    ]

    table = Table(free_modules, colWidths=[1*inch, 2.5*inch, 1*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))

    # Tier Premium
    story.append(Paragraph("TIER PREMIUM - $39/mes (27 lecciones, ~5 horas)", styles['ModuleHeader']))
    story.append(Paragraph(
        "<i>Objetivo: Retencion, comunidad activa, conversion a Kreoon Pro</i>",
        styles['NoteText']
    ))

    premium_modules = [
        ["Modulo", "Nombre", "Lecciones", "Duracion"],
        ["4", "AI Copilot Mastery", "4", "49 min"],
        ["5", "Streaming V2 - Live Shopping", "4", "52 min"],
        ["6", "Digital Strategist Track", "4", "49 min"],
        ["7", "Creative Strategist Track", "4", "49 min"],
        ["8", "Admin & Team Leader", "4", "49 min"],
        ["9", "Estrategia Avanzada", "4", "62 min"],
        ["10", "Cliente/Marca Track", "3", "37 min"],
    ]

    table = Table(premium_modules, colWidths=[1*inch, 2.5*inch, 1*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PINK),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        "<b>TOTAL: 45 lecciones, ~8 horas de contenido</b>",
        styles['BodyText']
    ))
    story.append(PageBreak())

def add_scripts_module0(story, styles):
    """Guiones del Modulo 0"""
    story.append(Paragraph("3. GUIONES - MODULO 0: BIENVENIDA", styles['SectionHeader']))

    # Leccion 0.1
    story.append(Paragraph("Leccion 0.1: Por que los creadores necesitan un sistema operativo", styles['ModuleHeader']))
    story.append(Paragraph("<b>Duracion:</b> 5 min | <b>Tipo:</b> Video conceptual | <b>CTA:</b> Unete a la comunidad", styles['NoteText']))

    story.append(Paragraph("<b>HOOK (0:00 - 0:15)</b>", styles['BodyText']))
    story.append(Paragraph(
        '"Si estas usando WhatsApp para hablar con clientes, Google Drive para guardar archivos, '
        'Notion para organizar proyectos, y una hoja de Excel para llevar tus finanzas... '
        'Dejame decirte algo que nadie te dice: Estas perdiendo entre 5 y 10 horas a la semana '
        'solo cambiando entre herramientas."',
        styles['ScriptText']
    ))

    story.append(Paragraph("<b>PROBLEMA (0:15 - 1:00)</b>", styles['BodyText']))
    story.append(Paragraph(
        '"Yo se lo que es. Empece como creador de contenido hace anos. Al principio era emocionante. '
        'Pero cuando empezaron a llegar mas clientes, todo se convirtio en un caos: perdia archivos, '
        'olvidaba deadlines, no sabia cuanto habia facturado, los clientes se quejaban. '
        'Y lo peor: trabajaba mas horas pero ganaba lo mismo."',
        styles['ScriptText']
    ))

    story.append(Paragraph("<b>SOLUCION (1:00 - 2:30)</b>", styles['BodyText']))
    story.append(Paragraph(
        '"Entonces entendi algo: Los creadores profesionales no necesitan MAS herramientas. '
        'Necesitan UN SISTEMA. Piensalo como el iPhone. Apple lo unifico todo en un solo dispositivo. '
        'Eso mismo necesitamos los creadores: Un sistema operativo que unifique la gestion de proyectos, '
        'la comunicacion con clientes, el portafolio profesional, las finanzas, la colaboracion. '
        'Todo en un solo lugar."',
        styles['ScriptText']
    ))

    story.append(Paragraph("<b>PRESENTACION KREOON (2:30 - 4:00)</b>", styles['BodyText']))
    story.append(Paragraph(
        '"Por eso creamos Kreoon. No es solo otra herramienta. Es el sistema operativo para creadores. '
        'Con Kreoon puedes gestionar todos tus proyectos en un board visual, comunicarte con clientes, '
        'tener tu portafolio profesional, conectar con marcas, colaborar con equipos, usar IA para scripts, '
        'y hasta hacer streaming en vivo. Todo integrado. Todo en espanol. Todo pensado para LATAM."',
        styles['ScriptText']
    ))

    story.append(Paragraph("<b>CTA (4:00 - 5:00)</b>", styles['BodyText']))
    story.append(Paragraph(
        '"Y lo mejor: puedes empezar gratis. En este curso te voy a ensenar como usar Kreoon para '
        'organizar tu negocio, conseguir mas clientes, y escalar sin volverte loco. '
        'Unete a la comunidad de Los Reyes del Contenido. El link esta en la descripcion."',
        styles['ScriptText']
    ))

    story.append(Spacer(1, 0.2*inch))

    # Leccion 0.2
    story.append(Paragraph("Leccion 0.2: Tour de Kreoon en 10 minutos", styles['ModuleHeader']))
    story.append(Paragraph("<b>Duracion:</b> 10 min | <b>Tipo:</b> Tutorial demo | <b>CTA:</b> Crea tu cuenta gratis", styles['NoteText']))

    story.append(Paragraph(
        "Contenido: Dashboard (centro de comando), Content Board (4 vistas: Kanban, Calendario, Tabla, Lista), "
        "Profile Builder (portafolio visual), Marketplace (donde las marcas encuentran talento), "
        "Chat y Colaboracion, AI Copilot (Kiro), Streaming V2, CRM integrado.",
        styles['BodyText']
    ))

    story.append(Spacer(1, 0.2*inch))

    # Leccion 0.3
    story.append(Paragraph("Leccion 0.3: Los 7 roles del equipo creativo perfecto", styles['ModuleHeader']))
    story.append(Paragraph("<b>Duracion:</b> 7 min | <b>Tipo:</b> Video educativo + infografia | <b>CTA:</b> Identifica tu rol", styles['NoteText']))

    roles = [
        ["Rol", "Color", "Descripcion"],
        ["Admin", "Purpura", "Cerebro operativo - configura org, gestiona permisos"],
        ["Content Creator", "Rosa", "Talento frente a camara - crea contenido, mantiene portfolio"],
        ["Editor", "Azul", "Mago detras de camaras - edicion, post-produccion"],
        ["Digital Strategist", "Verde", "Analista de datos - metricas, paid ads, CRM"],
        ["Creative Strategist", "Naranja", "Director creativo - concepto, estrategia de contenido"],
        ["Community Manager", "Teal", "Conector - redes sociales, engagement"],
        ["Client", "Ambar", "Cliente - ve progreso, aprueba, da feedback"],
    ]

    table = Table(roles, colWidths=[1.5*inch, 1*inch, 3.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PURPLE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)
    story.append(PageBreak())

def add_scripts_module1(story, styles):
    """Guiones del Modulo 1"""
    story.append(Paragraph("4. GUIONES - MODULO 1: CONTENT CREATOR TRACK", styles['SectionHeader']))

    # Leccion 1.1
    story.append(Paragraph("Leccion 1.1: Configura tu perfil que vende", styles['ModuleHeader']))
    story.append(Paragraph("<b>Duracion:</b> 12 min | <b>Tipo:</b> Tutorial paso a paso", styles['NoteText']))

    story.append(Paragraph("<b>HOOK</b>", styles['BodyText']))
    story.append(Paragraph(
        '"Mira estos dos perfiles. Uno recibe 10 propuestas al mes. El otro? Cero. '
        'La diferencia no es el talento. Es como estan configurados."',
        styles['ScriptText']
    ))

    story.append(Paragraph("<b>Contenido clave:</b>", styles['BodyText']))
    sections = [
        "Informacion basica (nombre, foto profesional, headline especifico, bio)",
        "Redes sociales conectadas (Instagram, TikTok, YouTube, LinkedIn)",
        "Servicios y precios (nombre, descripcion, entregables, tiempo, precio)",
        "Disponibilidad (dias, horas, capacidad mensual)",
        "Verificacion (perfil 100%, 2 redes, 3 trabajos, identidad)",
    ]
    for s in sections:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {s}", styles['BulletText']))

    story.append(Paragraph("<b>5 tips finales:</b> Usa palabras clave, actualiza regularmente, responde rapido, pide reviews, se autentico.", styles['BodyText']))

    story.append(Spacer(1, 0.2*inch))

    # Leccion 1.2
    story.append(Paragraph("Leccion 1.2: Profile Builder - Tu portafolio en 20 min", styles['ModuleHeader']))
    story.append(Paragraph("<b>Duracion:</b> 15 min | <b>Tipo:</b> Tutorial practico", styles['NoteText']))

    story.append(Paragraph("<b>Estructura del portafolio:</b>", styles['BodyText']))
    structure = [
        "HERO - Tu primera impresion (foto/video, headline, CTA)",
        "SOBRE MI - Tu historia en 2-3 parrafos",
        "SERVICIOS - Cards con cada servicio y precios",
        "PORTAFOLIO - Galeria de tus mejores 6-12 trabajos",
        "TESTIMONIOS - Reviews de clientes, logos de marcas",
        "CONTACTO - Boton CTA + redes sociales",
    ]
    for s in structure:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {s}", styles['BulletText']))

    story.append(Spacer(1, 0.2*inch))

    # Lecciones 1.3-1.5 resumen
    story.append(Paragraph("Lecciones 1.3-1.5: Resumen", styles['ModuleHeader']))

    remaining = [
        ["Leccion", "Titulo", "Duracion", "Contenido clave"],
        ["1.3", "Marketplace: Como te encuentran las marcas", "10 min", "Algoritmo de busqueda, posicionamiento, alertas"],
        ["1.4", "Sistema de propuestas y cotizaciones", "12 min", "Anatomia de propuesta ganadora, templates, negociacion"],
        ["1.5", "Primeros 1000 USD en Kreoon", "8 min", "Caso de exito real, timeline 30 dias, plan de accion"],
    ]

    table = Table(remaining, colWidths=[0.8*inch, 2.5*inch, 0.8*inch, 2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PINK),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)
    story.append(PageBreak())

def add_calendar(story, styles):
    """Calendario de contenido"""
    story.append(Paragraph("5. CALENDARIO DE CONTENIDO (3 MESES)", styles['SectionHeader']))

    story.append(Paragraph("<b>Resumen de produccion:</b>", styles['ModuleHeader']))

    metrics = [
        ["Tipo", "Cantidad", "Frecuencia"],
        ["Videos largos YouTube", "30", "2-3/semana"],
        ["Shorts (TikTok/IG)", "44", "5-10/semana"],
        ["Carruseles Instagram", "6", "~2/mes"],
        ["Lives en Skool", "12", "1/semana (sabados)"],
        ["TOTAL PIEZAS", "92", "3 meses"],
    ]

    table = Table(metrics, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_GRAY),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))

    story.append(Paragraph("<b>Calendario semanal tipo:</b>", styles['ModuleHeader']))

    weekly = [
        ["Dia", "Plataforma", "Formato", "Contenido"],
        ["Lunes", "YouTube", "Video largo (10-15 min)", "Tutorial de feature"],
        ["Martes", "TikTok + IG", "2-3 shorts", "Clips del lunes"],
        ["Miercoles", "YouTube", "Video largo (10-15 min)", "Valor agregado"],
        ["Jueves", "TikTok + IG", "2-3 shorts", "Clips + trending"],
        ["Viernes", "YouTube Shorts", "3 shorts", "Resumen semanal"],
        ["Sabado", "Skool", "Live Q&A (30-60 min)", "Preguntas comunidad"],
        ["Domingo", "—", "Programar semana", "Batching contenido"],
    ]

    table = Table(weekly, colWidths=[1.2*inch, 1.3*inch, 1.5*inch, 2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TEAL),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))

    story.append(Paragraph("<b>Pipeline de Repurposing:</b>", styles['ModuleHeader']))
    story.append(Paragraph(
        "1 Video largo YouTube (15 min) genera: 3-5 clips TikTok/Reels, 1 carrusel Instagram (10 slides), "
        "1 thread Twitter/X, 1 post LinkedIn, 1 newsletter email, 1 post Skool con discusion.",
        styles['BodyText']
    ))
    story.append(PageBreak())

def add_skool_structure(story, styles):
    """Estructura de Skool"""
    story.append(Paragraph("6. ESTRUCTURA DE SKOOL", styles['SectionHeader']))

    story.append(Paragraph("<b>Configuracion general:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Nombre: Los Reyes del Contenido | URL: skool.com/los-reyes-del-contenido", styles['BodyText']))
    story.append(Paragraph("Descripcion: La comunidad #1 de creadores de contenido en LATAM. Aprende a usar Kreoon.", styles['BodyText']))

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Niveles de acceso:</b>", styles['ModuleHeader']))

    levels = [
        ["Nivel", "Precio", "Acceso"],
        ["FREE", "$0/mes", "Comunidad, Modulos 0-3, 1 live mensual, recursos basicos"],
        ["PRO", "$39/mes", "Todo FREE + Modulos 4-10, lives semanales, templates premium, challenges"],
        ["VIP (futuro)", "$99/mes", "Todo PRO + mentoria grupal, 1:1 con Alexander, acceso anticipado"],
    ]

    table = Table(levels, colWidths=[1.2*inch, 1*inch, 4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PURPLE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Categorias del feed:</b>", styles['ModuleHeader']))
    categories = "Anuncios, Presentaciones, Preguntas, Wins, Feedback de Kreoon, Colaboraciones, Recursos, Off-Topic"
    story.append(Paragraph(categories, styles['BodyText']))

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Eventos recurrentes:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Semanal: Sabados 11am (COL) - Live Q&A con Alexander (45-60 min)", styles['BodyText']))
    story.append(Paragraph("Mensual: Primer lunes - Challenge del mes | Ultimo viernes - Premiacion", styles['BodyText']))
    story.append(PageBreak())

def add_gamification(story, styles):
    """Sistema de gamificacion"""
    story.append(Paragraph("7. SISTEMA DE GAMIFICACION", styles['SectionHeader']))

    story.append(Paragraph("<b>Puntos por accion:</b>", styles['ModuleHeader']))

    points = [
        ["Accion", "Puntos"],
        ["Publicar en el feed", "5 pts"],
        ["Comentar", "2 pts"],
        ["Recibir like", "1 pt"],
        ["Completar leccion", "10 pts"],
        ["Completar modulo", "50 pts"],
        ["Asistir a live", "20 pts"],
        ["Ganar challenge", "100 pts"],
        ["Referir miembro", "50 pts"],
    ]

    table = Table(points, colWidths=[2.5*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ORANGE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Niveles:</b>", styles['ModuleHeader']))

    levels = [
        ["Nivel", "Nombre", "Puntos", "Recompensa"],
        ["1", "Novato", "0-99", "Acceso comunidad free"],
        ["2", "Aprendiz", "100-499", "Badge en perfil"],
        ["3", "Creador", "500-999", "Descuento 10% premium"],
        ["4", "Pro", "1000-2499", "Badge especial"],
        ["5", "Expert", "2500-4999", "Grupo privado mentores"],
        ["6", "Master", "5000+", "1:1 con Alexander"],
    ]

    table = Table(levels, colWidths=[0.8*inch, 1.2*inch, 1.2*inch, 2.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), AMBER),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Badges especiales:</b>", styles['ModuleHeader']))
    badges = [
        "Early Adopter (primeros 100), Content Machine (10+ contenidos/30 dias), ",
        "Viral Hit (10K+ views), Community Helper (50+ respuestas utiles), Bug Hunter, ",
        "Embajador Bronce (3 referidos, 15% comision), Plata (10 referidos, 20%), Oro (25+ referidos, 25%)"
    ]
    story.append(Paragraph("".join(badges), styles['BodyText']))
    story.append(PageBreak())

def add_funnel(story, styles):
    """Funnel de conversion"""
    story.append(Paragraph("8. FUNNEL DE CONVERSION", styles['SectionHeader']))

    funnel_stages = [
        ["Etapa", "Descripcion", "KPI", "Target"],
        ["AWARENESS", "Videos de valor en YouTube/TikTok/IG", "Views, Watch time", "500K+/mes"],
        ["CAPTURE", "Lead magnet (PDF, templates, mini-curso)", "Email signups", "2,000+/mes"],
        ["NURTURE", "Comunidad free Skool (18 lecciones)", "Community joins, DAU", "500+/mes"],
        ["MONETIZE", "Skool Premium ($39/mes)", "Conversion rate", "5-10%"],
        ["CONVERT", "Usuario Kreoon Pro", "Kreoon signups", "50+/mes"],
        ["ADVOCATE", "Programa de Embajadores", "Referrals", "20% de premium"],
    ]

    table = Table(funnel_stages, colWidths=[1.3*inch, 2.3*inch, 1.3*inch, 1.2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PURPLE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("<b>Lead Magnets:</b>", styles['ModuleHeader']))
    story.append(Paragraph('PDF: "Guia definitiva del creador LATAM 2026"', styles['BulletText']))
    story.append(Paragraph('Mini-curso: "Tu primer $1K como creador" (email)', styles['BulletText']))
    story.append(Paragraph('Template: "Calendario de contenido que SI cumples"', styles['BulletText']))
    story.append(PageBreak())

def add_execution_plan(story, styles):
    """Plan de ejecucion"""
    story.append(Paragraph("9. PLAN DE EJECUCION (8 SEMANAS)", styles['SectionHeader']))

    plan = [
        ["Semana", "Actividades"],
        ["1-2", "Setup Skool, crear assets de marca, escribir guiones M0, configurar Remotion y ElevenLabs"],
        ["3-4", "Grabar M0 (3 lecciones), grabar M1 (5 lecciones), crear shorts (15-20), publicar en YouTube"],
        ["5-6", "Grabar M2-M3 (10 lecciones), crear lead magnets (PDF, templates), lanzar comunidad free"],
        ["7-8", "Grabar M4-M5 (8 lecciones), configurar pagos Skool ($39), crear email sequence, LANZAMIENTO"],
    ]

    table = Table(plan, colWidths=[1.2*inch, 5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("<b>Post-lanzamiento (operacion continua):</b>", styles['ModuleHeader']))
    story.append(Paragraph("2-3 videos largos/semana (YouTube), 5-10 shorts/semana (TikTok + IG), "
                          "1 live semanal en Skool (sabados), challenges mensuales, iteracion basada en feedback.",
                          styles['BodyText']))
    story.append(PageBreak())

def add_metrics(story, styles):
    """Metricas de exito"""
    story.append(Paragraph("10. METRICAS DE EXITO (MES 3)", styles['SectionHeader']))

    metrics = [
        ["Metrica", "Target"],
        ["Suscriptores YouTube", "5,000+"],
        ["Miembros Skool (free)", "1,000+"],
        ["Miembros Skool (premium)", "100+"],
        ["MRR del curso", "$3,900+"],
        ["Usuarios Kreoon nuevos", "200+"],
    ]

    table = Table(metrics, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PURPLE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("<b>Diferenciadores vs competencia:</b>", styles['ModuleHeader']))
    diffs = [
        "Integracion real con Kreoon (no es un curso generico)",
        "Comunidad LATAM enfocada en espanol",
        "Sistema de gamificacion conectado a la plataforma",
        "Valor mas alla del software (frameworks de creacion)",
        "Instructor activo que usa la herramienta diariamente",
    ]
    for d in diffs:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {d}", styles['BulletText']))
    story.append(PageBreak())

def add_referentes(story, styles):
    """Referentes investigados"""
    story.append(Paragraph("11. REFERENTES INVESTIGADOS (50+)", styles['SectionHeader']))

    story.append(Paragraph("<b>Academias SaaS oficiales:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Notion Academy, Canva Design School, Figma Learn, Airtable Academy, ClickUp University, "
                          "Monday Academy, Asana Academy, Webflow University, Framer Academy", styles['BodyText']))

    story.append(Paragraph("<b>Plataformas de productividad:</b>", styles['ModuleHeader']))
    story.append(Paragraph("HubSpot Academy (200K+ certificados), Miro Academy, Loom, Zapier Learn, Make Academy, Slack Certified", styles['BodyText']))

    story.append(Paragraph("<b>Creators que ensenan herramientas:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Thomas Frank ($1M+ con templates Notion), August Bradley, Marie Poulin (2,500+ estudiantes), "
                          "Francesco D'Alessio, Tiago Forte (5,000+ learners), Justin Welsh ($12.5M revenue, 86% profit)", styles['BodyText']))

    story.append(Paragraph("<b>Creator Economy educators:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Ali Abdaal ($4.5M revenue), Pat Flynn (SPI Pro), Amy Porterfield (AI assistant custom), "
                          "Dickie Bush & Cole (Ship 30), Dan Koe ($4.2M, 98% profit), Sahil Bloom ($10M/2023), Chris Do", styles['BodyText']))

    story.append(Paragraph("<b>Plataformas de cursos/comunidades:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Skool (puntos + niveles + Alex Hormozi), Teachable (AI curriculum), Kajabi (challenges gamificados), "
                          "Thinkific, Mighty Networks, Circle (AI Agents), Kit/ConvertKit, Beehiiv", styles['BodyText']))

    story.append(Paragraph("<b>LATAM/Espanol:</b>", styles['ModuleHeader']))
    story.append(Paragraph("Platzi (Framework Octalysis), Domestika (produccion cinematografica), Crehana, "
                          "Vilma Nunez, Carlos Munoz, Romuald Fons (4,000+ SEO), Meta Blueprint, Google Skillshop", styles['BodyText']))

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Patrones clave identificados:</b>", styles['ModuleHeader']))
    patterns = [
        "Contenido gratis masivo -> Premium",
        "Gamificacion simple (puntos + niveles + badges + leaderboards)",
        "Cohort-based learning (retos mensuales con enrollment limitado)",
        "Community-led growth (super users como hosts/mentores)",
        "AI integration 2026 (assistant entrenado en contenido)",
    ]
    for p in patterns:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {p}", styles['BulletText']))
    story.append(PageBreak())

def add_features(story, styles):
    """Features de Kreoon"""
    story.append(Paragraph("12. FEATURES DE KREOON POR ROL", styles['SectionHeader']))

    story.append(Paragraph("<b>Estadisticas del sistema:</b>", styles['ModuleHeader']))
    stats = [
        "135+ paginas diferentes",
        "160+ Edge Functions (serverless)",
        "250+ hooks React reutilizables",
        "40+ modulos funcionales",
        "50+ badges disponibles",
        "7 roles con permisos granulares",
        "4 vistas de tablero (Kanban, Calendar, Table, List)",
    ]
    for s in stats:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {s}", styles['BulletText']))

    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Modulos principales:</b>", styles['ModuleHeader']))

    modules = [
        ["Modulo", "Features clave"],
        ["Dashboard", "Metricas en tiempo real, KPIs visuales, filtros de periodo"],
        ["Content Board", "4 vistas, drag-drop, estados personalizables, AI Panel"],
        ["Chat (KIRO)", "Asistente IA conversacional, acciones rapidas, gamificacion"],
        ["Portfolio", "Profile Builder drag-drop, media gallery, reviews"],
        ["Marketplace", "Busqueda IA, AI Matching, propuestas, pagos integrados"],
        ["Streaming V2", "Multi-platform, chat unificado, live shopping, overlays"],
        ["AI Copilot", "Board AI, Portfolio AI, Content AI, Streaming AI"],
        ["CRM", "Gestion clientes, Client DNA, pipelines, email marketing"],
        ["Gamificacion", "Puntos UP, badges, leaderboards, temporadas"],
    ]

    table = Table(modules, colWidths=[1.5*inch, 4.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, DARK),
    ]))
    story.append(table)

def add_final_page(story, styles):
    """Pagina final"""
    story.append(PageBreak())
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("KREOON", styles['MainTitle']))
    story.append(Paragraph("El Sistema Operativo para Creadores", styles['SubTitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("Los Reyes del Contenido", styles['SubTitle']))
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("kreoon.com", styles['BodyText']))
    story.append(Paragraph("founder@kreoon.com", styles['BodyText']))
    story.append(Paragraph("@AlexanderKast", styles['BodyText']))
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("Documento generado: Abril 2026", styles['NoteText']))

def generate_pdf():
    """Generar el PDF completo"""
    output_path = "F:/Users/SICOMMER SAS/Documents/GitHub/kreoon/docs/curso-reyes-contenido/LosReyesDelContenido-CursoCompleto.pdf"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    styles = create_styles()
    story = []

    # Agregar secciones
    add_cover_page(story, styles)
    add_table_of_contents(story, styles)
    add_vision_section(story, styles)
    add_course_structure(story, styles)
    add_scripts_module0(story, styles)
    add_scripts_module1(story, styles)
    add_calendar(story, styles)
    add_skool_structure(story, styles)
    add_gamification(story, styles)
    add_funnel(story, styles)
    add_execution_plan(story, styles)
    add_metrics(story, styles)
    add_referentes(story, styles)
    add_features(story, styles)
    add_final_page(story, styles)

    # Construir PDF
    doc.build(story)
    print(f"PDF generado exitosamente: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_pdf()
