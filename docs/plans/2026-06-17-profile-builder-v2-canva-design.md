# Profile Builder v2 estilo Canva - Diseno

Fecha: 2026-06-17

## Objetivo

Crear una version mas amigable, estable, rapida e intuitiva del constructor de portafolios para creadores del marketplace. La experiencia debe sentirse como Canva guiado: visual, simple y dificil de romper.

La prioridad es mejorar el builder actual antes de importar plantillas HTML externas.

## Principio de producto

El usuario no debe sentir que esta editando bloques tecnicos. Debe sentir que esta editando su portafolio visualmente por secciones.

El motor actual del Profile Builder se conserva. La v2 es una nueva capa de UX sobre los mismos datos, bloques, plantillas, guardado y publicacion.

## Experiencia aprobada

Se adopta la opcion A: Canva guiado.

La interfaz tendra:

- Preview real del portafolio en el centro.
- Barra lateral izquierda con herramientas simples.
- Panel derecho contextual segun la seccion seleccionada.
- Toolbar superior con acciones principales.
- Guardado automatico visible.
- Vista previa desktop/mobile.
- Publicacion guiada con checklist.

No se implementa edicion libre pixel-perfect en esta fase. El usuario edita secciones predisenadas para mantener responsive, estabilidad y facilidad de uso.

## Layout del editor

```txt
ProfileBuilderV2
  TopToolbar
  LeftToolRail
  CanvasPreview
  ContextPanel
  PublishChecklist
```

### TopToolbar

Acciones:

- Deshacer.
- Rehacer.
- Vista escritorio.
- Vista movil.
- Guardar.
- Vista previa publica.
- Publicar.

Debe mostrar estado de guardado:

- Guardando...
- Guardado hace unos segundos.
- Cambios sin guardar.
- Error al guardar.

### LeftToolRail

Herramientas:

- Plantillas.
- Secciones.
- Estilo.
- Media.
- IA.
- Publicar.

La barra debe usar iconos y textos cortos. No debe mostrar opciones tecnicas.

### CanvasPreview

Renderiza el portafolio real usando los bloques existentes.

Cada seccion visible debe poder seleccionarse con clic. Al seleccionarla:

- Se resalta visualmente.
- Se abre el panel derecho correspondiente.
- Se muestran acciones simples: editar, ocultar, duplicar, mover o eliminar si aplica.

### ContextPanel

Panel de edicion simple segun seccion.

Ejemplos:

- Portada: foto de portada, foto de perfil, nombre, frase principal, bio corta, boton principal, color de acento.
- Sobre mi: titulo, texto, ubicacion, idiomas, experiencia.
- Portafolio: agregar video/foto, destacar pieza, cambiar layout, mostrar/ocultar titulos, ordenar trabajos.
- Servicios: cards de servicio, descripcion, precio, tiempo de entrega.
- Precios: paquetes, moneda, beneficios, CTA.
- Resenas: layout, cantidad visible, mostrar stats.
- Contacto: boton, email, WhatsApp, formulario.

El modo simple no muestra configuraciones como `orderIndex`, `config`, `styles`, nested blocks ni CSS avanzado.

## Paneles funcionales

### Plantillas

Permite elegir estilos base:

- Minimalista.
- Creativo.
- Profesional.
- Influencer.
- Freelancer.
- Premium.

Al aplicar una plantilla debe ofrecer dos opciones:

- Mantener mi contenido y cambiar solo el estilo.
- Reemplazar mi diseno actual.

Debe haber confirmacion antes de reemplazar bloques.

### Secciones

Lista visual de secciones activas:

- Portada.
- Sobre mi.
- Portafolio.
- Servicios.
- Precios.
- Resenas.
- Contacto.
- Talento recomendado.

Cada seccion permite:

- Mostrar/ocultar.
- Reordenar.
- Editar.
- Duplicar si aplica.
- Eliminar si no es obligatoria.

Agregar seccion debe ofrecer opciones simples:

- Texto.
- Video.
- Galeria.
- Preguntas frecuentes.
- CTA.
- WhatsApp.
- Marcas.
- Testimonios.

### Estilo

Controles globales:

- Color principal.
- Tema claro/oscuro.
- Tipografia.
- Bordes: recto, suave, redondo.
- Espaciado: compacto, normal, amplio.

No incluir en modo simple:

- Sombras multiples.
- Gradientes custom complejos.
- Breakpoints.
- CSS avanzado.

### Media

Biblioteca visual:

- Subir video.
- Subir imagen.
- Elegir desde portafolio existente.
- Reemplazar avatar.
- Reemplazar portada.
- Destacar pieza.
- Ordenar trabajos.

Debe sentirse como una galeria, no como un formulario tecnico.

### IA

Acciones concretas:

- Mejorar mi bio.
- Crear frase principal.
- Mejorar CTA.
- Sugerir servicios.
- Sugerir precios.
- Revisar mi portafolio.
- Ordenar mis mejores trabajos.

Cada accion debe mostrar antes/despues y pedir confirmacion antes de aplicar cambios.

### Publicar

Checklist final:

- Foto de perfil.
- Portada.
- Bio.
- Minimo 3 trabajos.
- Minimo 1 servicio.
- Contacto o CTA configurado.
- Vista movil revisada.

Acciones:

- Vista previa publica.
- Publicar cambios.
- Copiar enlace.

## Arquitectura tecnica

La v2 reutiliza:

- `ProfileBlock`.
- `BlockType`.
- `BuilderConfig`.
- `BlockRenderer`.
- `BLOCK_DEFINITIONS`.
- `useProfileBuilderData`.
- `save_profile_blocks`.
- `publish_profile_blocks`.
- `profile_templates`.
- `clone_template_to_profile`.
- `useCreatorPlanFeatures`.
- Media/Bunny upload existente.

No se cambia el formato persistido de bloques en esta fase. Los perfiles existentes deben seguir funcionando.

## Compatibilidad

Los perfiles actuales se cargan en la v2 sin migracion de datos.

Si un bloque existente no tiene editor simple, se muestra como "Seccion avanzada" con edicion limitada:

- Mostrar/ocultar.
- Mover.
- Eliminar si aplica.
- Editar desde modo avanzado o builder legacy.

El builder actual puede mantenerse temporalmente como fallback para admin o usuarios avanzados.

## Premium

Mantener restricciones por plan:

- Free: secciones basicas, branding Kreoon, plantillas gratis.
- Pro: secciones avanzadas, layouts premium, CTA, carrusel, casos de exito.
- Premium: WhatsApp flotante, contacto avanzado, quitar branding, guardar como plantilla, plantillas premium.

La UI debe mostrar funciones bloqueadas como oportunidades claras de upgrade, sin romper el flujo basico.

## Fases

### Fase 1 - Builder v2 simple

- Nueva interfaz visual.
- Preview central.
- Toolbar superior.
- Menu lateral izquierdo.
- Panel contextual derecho.
- Seleccion de seccion desde preview.
- Guardado manual y autosave visible.
- Desktop/mobile preview.

### Fase 2 - Editores contextuales

Crear editores simples para:

- Portada.
- Sobre mi.
- Portafolio.
- Servicios.
- Precios.
- Resenas.
- Contacto.
- CTA.
- WhatsApp.

### Fase 3 - Plantillas internas y estilo global

- Aplicar plantilla manteniendo contenido.
- Reemplazar diseno completo con confirmacion.
- Vista previa antes de aplicar.
- Separar plantillas free/pro/premium.
- Controles globales de color, tema, tipografia, bordes y espaciado.

### Fase 4 - IA para usuarios no tecnicos

- Mejorar bio.
- Crear frase principal.
- Mejorar CTA.
- Sugerir servicios.
- Sugerir precios.
- Revisar portafolio.

Todas las acciones deben ser confirmables antes de aplicar.

### Fase 5 - Publicacion guiada

- Checklist de completitud.
- Vista previa publica.
- Publicar.
- Copiar enlace.

## Criterios de exito

- Un usuario nuevo puede publicar un portafolio decente en menos de 10 minutos.
- No necesita entender bloques, settings ni diseno web.
- No puede romper facilmente el responsive.
- Los perfiles existentes siguen funcionando.
- Las restricciones premium siguen funcionando.
- El builder legacy queda disponible como fallback durante validacion.

## Fuera de alcance inicial

- Importar HTML externo.
- Edicion libre pixel-perfect.
- Exportar HTML.
- Crear un motor nuevo de renderizado.
- Reemplazar el schema de bloques.

Las plantillas HTML externas se abordaran despues, convirtiendolas a plantillas nativas del builder.
