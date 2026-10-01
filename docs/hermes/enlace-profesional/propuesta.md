# Propuesta: enlace profesional de Kreoon

Un solo perfil del creador, dos presentaciones:
- Mi portafolio: para marcas (escritorio y móvil).
- Mi enlace en bio: móvil primero, para Instagram, TikTok y WhatsApp.

Interfaz con la marca de Kreoon: morado #6D4AFF, marfil #FAF8F5, blanco #FFFFFF, texto #242135, tarjetas suaves con borde y sombra ligera. Cada plantilla trae su propio color de acento.
Todos los textos de las maquetas son de ejemplo (por ejemplo «Nombre del creador»). Los espacios grises con etiqueta («Foto del creador», «Video 9:16») sustituyen a las fotos. No hay marcas, cifras ni opiniones inventadas.

Archivos de maqueta, en esta misma carpeta:
- estudio-ugc.html
- editorial.html
- cine.html

---

## Parte 1. Tres plantillas

Se diferencian por la composición (cómo se ordena y se lee la página), no solo por el color.

### 1. Estudio UGC (cercano, trabajos verticales 9:16)

Acento: naranja quemado #C2410C con fondo suave #FFEBDD (contraste del texto blanco sobre el acento: 5,18:1; texto #9A3412 sobre #FFEBDD: 6,33:1).

Idea: se parece a lo que el creador ya publica. Todo gira en torno al video vertical.

Wireframe del portafolio (escritorio):

```
1. Portada (2 columnas)
   Izq: etiqueta con la especialidad · Nombre del creador (grande) · propuesta de valor · [Hablemos de tu marca] [Ver mis trabajos]
   Der: video 9:16 principal + foto del creador desplazada
2. Trabajos destacados: 4 videos 9:16 en una fila, con título y tipo debajo
3. Lo que hago: 3 tarjetas de servicio (nombre, descripción, precio o «a convenir»)
4. Un poco sobre mí: tarjeta con foto redonda + 2 o 3 frases
5. Marcas y reseñas: SOLO si existen (no se muestra vacía)
6. ¿Trabajamos juntos?: franja de color con WhatsApp y correo
```

Wireframe del enlace en bio (móvil, 390 px):

```
Foto redonda
Nombre · especialidad · descripción corta
Redes (botones de 44 px)
Enlaces personalizados: tarjetas con [↑] [↓]
Video destacado 9:16 (opcional)
[Ver mi portafolio]
[Escríbeme por WhatsApp]
```

### 2. Editorial (tipografía y fotografía protagonistas)

Acento: verde bosque #1F5C45 (7,41:1 sobre marfil). Títulos con letra con serifa.

Idea: se lee como una revista. Sin tarjetas: líneas finas, mucho aire, imágenes horizontales grandes.

Wireframe del portafolio (escritorio):

```
1. Cabecera fina: nombre a la izquierda, menú a la derecha, línea gruesa debajo
2. Portada (2 columnas)
   Izq: especialidad en mayúsculas · Nombre del creador (72 px) · propuesta de valor en cita con barra lateral · [Hablemos de tu marca]
   Der: foto grande 4:5
3. Trabajos destacados (columna de título a la izquierda, lista a la derecha)
   Historias numeradas 01, 02, 03: imagen 3:2 + título + 1 frase, alternando el lado
4. Servicios: lista con una línea por servicio (nombre a la izquierda, descripción y precio a la derecha)
5. Sobre mí: texto en 2 columnas con letra capital
6. Marcas y reseñas: SOLO si existen, como una línea de texto
7. ¿Trabajamos juntos?: frase grande + botones
```

Wireframe del enlace en bio (móvil):

```
Foto 4:3 a todo el ancho
Nombre (serif) · especialidad en mayúsculas
Descripción en cursiva
Redes como texto subrayado
Lista numerada 01, 02, 03 con [↑] [↓]
Video destacado 16:9 (opcional)
[Ver mi portafolio]
[Escríbeme por WhatsApp]
```

### 3. Cine (reel destacado, proyectos anchos; tema oscuro opcional)

Acento: ámbar #FFB84D sobre fondo #14121F (10,75:1). Tema claro opcional con acento #8A5300 sobre marfil (5,97:1). La maqueta trae un interruptor «Ver en tema claro».

Idea: el reel abre la página a pantalla ancha y cada proyecto es una pieza 16:9.

Wireframe del portafolio (escritorio):

```
1. Barra superior: nombre y menú
2. Reel destacado 21:9 a todo el ancho, con una tarjeta encima:
   especialidad · Nombre del creador · propuesta de valor · [Hablemos de tu marca] [Ver proyectos]
3. Proyectos destacados: piezas 16:9 apiladas, alternando lado (video grande + título y 1 frase)
4. Servicios: 3 tarjetas
5. Marcas y reseñas: SOLO si existen
6. Sobre mí: tarjeta con foto cuadrada + texto corto
7. Cierre centrado: ¿Trabajamos juntos? + botones
```

Wireframe del enlace en bio (móvil):

```
Video destacado 16:10 arriba, a todo el ancho
Foto redonda montada sobre el video + nombre
Especialidad · descripción corta
Redes (botones de 44 px)
Enlaces personalizados: filas con [↑] [↓]
[Ver mi portafolio]
[Escríbeme por WhatsApp]
```

### Reglas comunes (accesibilidad y uso)

- Todos los botones y áreas táctiles miden 44 px o más (los botones principales, 48 px).
- Contraste AA verificado con cálculo de luminancia: texto normal 4,5:1 o más. Los pares usados dan entre 4,86 y 18,49.
- Ordenar enlaces: botones ↑ y ↓ siempre visibles. Arrastrar queda como ayuda extra, nunca como única forma.
- Las secciones sin datos reales (marcas, reseñas, video destacado) no se muestran; en el editor aparecen como invitación a agregarlas.
- Foco visible en morado de Kreoon (en Cine, en el color de acento).
- Sin animaciones obligatorias; se respeta «reducir movimiento».

Pendientes de la maqueta (no resueltos aquí): la imagen para historias de Instagram y la tarjeta que aparece al pegar el enlace (título y foto del creador) solo se describen en el flujo; no se diseñaron.

---

## Parte 2. Flujo de primer uso en 4 pasos

Reglas del flujo:
- El creador llega con nombre, foto y especialidad de su perfil. Se le propone todo; solo corrige.
- Barra de progreso arriba: «Paso 1 de 4». Siempre se puede volver.
- Botón principal a la derecha o abajo en móvil; secundario «Atrás» a la izquierda. Nada se pierde al retroceder.
- Se guarda solo. Mensaje fijo discreto: «Se guarda solo».
- Nada de palabras técnicas. Se habla de «sección», «espacio», «lugar», «tu página».

### Paso 1 de 4 · Elige tu estilo

Título: Elige tu estilo
Ayuda: Es solo la forma en que se ve tu página. Puedes cambiarlo cuando quieras y no pierdes nada.

Opciones (tarjetas con vista previa):
- Estudio UGC. Descripción: «Cercano y directo. Tus videos verticales son los protagonistas.»
- Editorial. Descripción: «Elegante y sereno. Letras y fotos grandes, como una revista.»
- Cine. Descripción: «Un video grande al inicio y proyectos en pantalla ancha.»
- Etiqueta en la recomendada: «Te recomendamos este»
- Interruptor solo en Cine: «Ver en tema claro»

Botones: [Ver cómo queda] (abre vista previa) · [Elegir este estilo] (principal) · [Cancelar]
Estado sin elección: botón «Elegir este estilo» desactivado y texto bajo las tarjetas: «Toca un estilo para continuar.»
Error de vista previa: «No pudimos mostrar la vista previa. Puedes elegir igual y verla después.» [Reintentar]

### Paso 2 de 4 · Confirma tu presentación

Título: Confirma tu presentación
Ayuda: Así te verán las marcas y tus seguidores. Revisa que todo esté bien.

Campos (ya llenos con el perfil):
- Foto. Etiqueta: «Tu foto». Ayuda: «Una foto donde se te vea la cara.» Botón: [Cambiar foto]
- Nombre. Etiqueta: «Cómo quieres que te llamen». Ayuda: «Tu nombre o tu nombre artístico.»
- Especialidad. Etiqueta: «¿Qué creas?». Ayuda: «Por ejemplo: videos UGC para belleza.»
- Propuesta de valor. Etiqueta: «Tu frase para las marcas». Ayuda: «Una frase corta que diga por qué trabajar contigo.»
  - Sugerencias para tocar y editar (texto de ejemplo, el creador las cambia):
    - «Videos que se sienten reales y llevan a la acción.»
    - «Contenido cercano para que tu marca conecte.»
    - «Ideas frescas, entrega puntual.»
  - Botón: [Sugerirme otras]
- Presentación breve. Etiqueta: «Cuéntales quién eres». Ayuda: «Dos o tres frases bastan.» Contador: «0 de 280 caracteres»
- Nombre de tu enlace. Etiqueta: «Tu dirección». Muestra: «kreoon.com/» + campo. Ayuda: «La puedes compartir donde quieras. Si la cambias después, tu código QR sigue funcionando.»

Botones: [Atrás] · [Siguiente] (principal) · [Lo hago después] (secundario, solo en frase y presentación)

Errores:
- Nombre vacío: «Escribe tu nombre para continuar.»
- Foto muy pesada: «Esa foto pesa mucho. Prueba con una de menos de 5 MB.»
- Formato de foto no válido: «Usa una foto en formato JPG o PNG.»
- Dirección ocupada: «Esa dirección ya la usa otra persona. Prueba con otra, por ejemplo [sugerencia].»
- Dirección con caracteres no permitidos: «Usa solo letras, números y guiones.»
- Presentación demasiado larga: «Te pasaste por [n] caracteres. Acórtala un poco.»
- Sin conexión: «No hay conexión. Tus cambios se guardan cuando vuelva.»

### Paso 3 de 4 · Agrega trabajos, redes o enlaces

Título: Agrega trabajos, redes o enlaces
Ayuda: Empieza con lo que tengas a mano. Puedes agregar más después. Con uno basta para publicar.

Tres pestañas (con contador, sin números inventados; el contador muestra lo que el creador agregó):
- Trabajos
- Redes
- Enlaces

Pestaña Trabajos:
- Subtítulo: «Tus mejores videos y fotos»
- Estado vacío: título «Aún no tienes trabajos», texto «Muestra lo mejor que has hecho. Las marcas lo miran primero.», botones [Subir un video o foto] y [Pegar un enlace de TikTok o Instagram]
- Por cada trabajo: «Título» (ayuda: «Dile a la marca qué hiciste.»), «Marca o cliente (opcional)», interruptor «Destacar este trabajo»
- Acciones: [Subir] · [↑] [↓] «Mover» · [Quitar]
- Aviso al llegar al máximo de destacados: «Ya tienes [n] destacados. Quita uno para destacar otro.»
- Errores: «No pudimos leer ese enlace. Revisa que esté completo y que sea público.» · «Ese archivo no se puede subir. Prueba con un video MP4 o una foto JPG o PNG.» · «El video es muy pesado. Prueba con uno más corto o más ligero.» · «Se cortó la subida. [Reintentar]»

Pestaña Redes:
- Subtítulo: «Dónde te siguen»
- Estado vacío: «Aún no has agregado redes.» [Agregar mi Instagram] [Agregar mi TikTok] [Agregar otra red]
- Campo: «Tu usuario o el enlace de tu perfil». Ayuda: «Puedes pegar el enlace o escribir solo tu usuario.»
- Errores: «No encontramos ese perfil. Revisa que esté bien escrito.» · «Esa red ya está en tu lista.»

Pestaña Enlaces:
- Subtítulo: «Lo que quieres que abran primero»
- Estado vacío: «Aún no tienes enlaces.» «Agrega un enlace a tu tienda, tu agenda o tu mejor video.» [Agregar un enlace]
- Campos: «Nombre del botón» (ayuda: «Lo que verá la gente, por ejemplo: Mi tarifa.»), «Dirección (https://...)»
- Orden: «Usa ↑ y ↓ para cambiar el orden. También puedes arrastrar.»
- Errores: «Escribe cómo se llama este botón.» · «Esa dirección no parece válida. Debe empezar con https://» · «Máximo [n] enlaces. Quita uno para agregar otro.»

Contacto (parte del paso, abajo):
- Título: «¿Cómo te escriben las marcas?»
- Opciones (casillas): «WhatsApp» (campo: «Tu número con código del país») · «Correo» (campo: «Tu correo»)
- Ayuda de privacidad: «Solo se muestra lo que elijas aquí. Puedes quitarlo cuando quieras.»
- Errores: «Escribe tu número con el código del país, por ejemplo +57.» · «Ese correo no parece válido.»
- Si no elige nada: aviso suave, no bloquea: «Sin contacto, las marcas no sabrán cómo escribirte.»

Botones del paso: [Atrás] · [Siguiente] (principal) · [Lo hago después]
Si no agregó nada: [Siguiente] sigue activo y al avanzar se muestra el aviso: «Tu página saldrá casi vacía. Puedes publicarla así y completarla después.»

### Paso 4 de 4 · Revisa y publica

Título: Revisa y publica
Ayuda: Mira cómo queda tu página en el celular y en el computador. Si algo no te gusta, vuelve y cámbialo.

Pantalla:
- Interruptor de vista: «Mi portafolio» / «Mi enlace en bio»
- Interruptor de aparato: «Celular» / «Computador»
- Lista de revisión (cada línea con un botón [Editar]):
  - «Estilo: [nombre]»
  - «Presentación: lista» o «Presentación: falta tu frase»
  - «Trabajos: [n] agregados» o «Trabajos: aún no agregas»
  - «Redes: [n] agregadas»
  - «Contacto: [WhatsApp / correo]» o «Contacto: aún no eliges»
- Quién la ve (opciones):
  - «Todos pueden verla» (recomendada)
  - «Solo quien tenga el enlace»
  - Ayuda: «Con la segunda opción, tu página no aparece en buscadores ni en el directorio de Kreoon. Puedes cambiarlo cuando quieras.»
- Botones: [Atrás] · [Publicar mi página] (principal) · [Guardar y publicar después] (secundario)

Mientras publica: «Publicando tu página…»

Éxito (pantalla final):
- Título: «¡Tu página ya está publicada!»
- Texto: «Compártela donde quieras. Esta es tu dirección: kreoon.com/[tu-direccion]»
- Botones de compartir: [Copiar enlace] · [Enviar por WhatsApp] · [Descargar código QR] · [Descargar imagen para historias]
- Confirmación al copiar: «Enlace copiado.»
- Ayuda bajo la imagen para historias: «Ponla en tu historia de Instagram y agrega el adhesivo de enlace.»
- Botones finales: [Ver mi portafolio] · [Ver mi enlace en bio] · [Ir a mi panel]
- Sugerencia: «Pega este enlace en la biografía de tu Instagram y de tu TikTok.»

Errores de publicación:
- General: «No pudimos publicar tu página. Inténtalo otra vez. Tus cambios están guardados.» [Reintentar]
- Sin conexión: «No hay conexión. Cuando vuelva, toca “Publicar mi página”.»
- Falta lo mínimo: «Para publicar necesitas tu nombre y tu foto. [Ir a completar]»
- Cuando falta algo recomendado pero no obligatorio: aviso amarillo, no bloquea: «Tu página no tiene trabajos todavía. Puedes publicarla igual.»

Vista de sección vacía en la página pública: las secciones sin datos no se muestran. En el editor, cada una aparece como invitación: «Agrega tus trabajos para que esta sección aparezca.»

### Lo mínimo para publicar
Nombre, foto y una forma de contacto sugerida (no obligatoria). Todo lo demás es opcional. Esto se alinea con la decisión 2 de la investigación (evitar fricción en el registro).

### Vocabulario en pantalla
Se dice «estilo» (no «plantilla»), «dirección» o «enlace» (no siglas técnicas), «sección» y «espacio». Ninguna pantalla usa jerga de programación.
