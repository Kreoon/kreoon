# Diseño de Rediseño de Página de Inicio - Kreoon.com

**Fecha**: 2026-04-24
**Estado**: Aprobado por el Usuario
**Visión**: Transformar kreoon.com en una experiencia inmersiva de "Creative OS" que utilice storytelling a través del scroll para demostrar el valor total de la plataforma.

## 1. Concepto Creativo: "The Creative Operating System"
La página de inicio no será solo una lista de características, sino una demostración viva de cómo Kreoon centraliza y potencia la creación de contenido en LATAM. Utilizaremos una estética editorial de alta gama, fondos oscuros profundos y acentos neón (púrpura/verde).

## 2. Estructura Narrativa (Scroll Storyline)

### Sección 1: El Hero (La Activación)
- **Visual**: Orbe púrpura central 3D con componentes de la UI de Kreoon orbitando.
- **Interacción**: Los elementos orbitan suavemente. El texto principal aparece con un efecto de "escaneo".
- **CTA**: "Comenzar Gratis" y "Ver Demo".

### Sección 2: El Cerebro (IA Research & DNA)
- **Tipo**: Pin Section (Scroll Lock).
- **Narrativa**: El usuario ve cómo un producto "crudo" es analizado por el sistema de 12 pasos de Kreoon.
- **Visual**: Capas de datos que se revelan conforme el usuario hace scroll. Extracción de keywords y ángulos de venta dinámicos.

### Sección 3: La Fábrica (Workflow & Esferas)
- **Visual**: Tablero Kanban estilizado con las 4 Esferas (Engage, Solution, Remarketing, Fidelize).
- **Interacción**: Las tarjetas de contenido vuelan de una esfera a otra siguiendo el scroll del usuario, demostrando el flujo de trabajo.

### Sección 4: El Marketplace (Conectividad)
- **Visual**: Una galaxia de creadores y marcas conectándose.
- **Interacción**: Efectos de parallax en las tarjetas de perfil. Visualización de los puntos UP (reputación) en tiempo real.

### Sección 5: Los Resultados (Analytics & KAE)
- **Visual**: Dashboard de métricas con crecimiento visual.
- **Interacción**: Gráficas que se dibujan al entrar en el viewport.

### Sección 6: El Cierre (Join the OS)
- **Visual**: Regreso al orbe central, ahora rodeado de logotipos de clientes.
- **CTA Final**: Registro inmediato.

## 3. Especificaciones Técnicas

### Tecnologías Core
- **Framework**: React 18.3 (Vite).
- **Animaciones**: `framer-motion` (useScroll, useTransform, AnimatePresence).
- **Estilos**: Tailwind CSS con variables de marca Kreoon.
- **Imágenes/Iconos**: Generados con `nanobanana pro` (via `generate_image`) para mantener una coherencia visual única y "top".

### Sistema de Movimiento
- **Scroll Smoothing**: Implementación de un scroll suave para mejorar la experiencia de storytelling.
- **Background Motion**: Fondos con gradientes animados mediante shaders de CSS o canvas sutiles.

## 4. Plan de QA
- Verificación de rendimiento (Lighthouse score > 90).
- Pruebas de responsividad (Mobile-first, pero optimizado para Desktop 4K).
- Validación de accesibilidad (Contraste de colores, etiquetas ARIA).
