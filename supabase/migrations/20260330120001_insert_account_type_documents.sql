-- =============================================================================
-- Migracion: Insertar Documentos Legales por Tipo de Cuenta
-- Fecha: 30 de marzo de 2026
-- Ejecutar DESPUES de 20260330120000_account_type_legal_agreements.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: Agregar columna account_type (si no existe)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'legal_consent_requirements'
    AND column_name = 'account_type'
  ) THEN
    ALTER TABLE legal_consent_requirements ADD COLUMN account_type TEXT;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PARTE 2: Insertar documento TALENT_AGREEMENT
-- -----------------------------------------------------------------------------

-- Limpiar documentos existentes para evitar conflictos
DELETE FROM legal_documents
WHERE document_type IN ('talent_agreement', 'client_agreement', 'organization_agreement');

INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  summary,
  content_html,
  is_current,
  is_required,
  created_at,
  updated_at
) VALUES (
  'talent_agreement',
  '1.0',
  '2026-03-30',
  'Acuerdo de Talento KREOON',
  'Acuerdo unificado para todos los roles de talento. Incluye cesion de derechos de imagen ilimitada, propiedad del contenido al cliente, y condiciones de pago a mes vencido.',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acuerdo de Talento - KREOON</title>
</head>
<body>
<article class="legal-document">

<header>
  <h1>ACUERDO DE TALENTO KREOON</h1>
  <p class="legal-meta">
    <strong>Plataforma:</strong> KREOON (https://kreoon.com)<br>
    <strong>Titular:</strong> SICOMMER INT LLC<br>
    <strong>Version:</strong> 1.0<br>
    <strong>Fecha de vigencia:</strong> 30 de marzo de 2026<br>
    <strong>Ultima actualizacion:</strong> 30 de marzo de 2026
  </p>
</header>

<section id="preambulo">
  <h2>PREAMBULO</h2>
  <p>
    Este Acuerdo de Talento (en adelante, el "Acuerdo") establece los terminos bajo los cuales
    usted (el "Talento") ofrece sus servicios a traves de la plataforma KREOON, operada por
    <strong>SICOMMER INT LLC</strong>, una sociedad de responsabilidad limitada constituida bajo
    las leyes del Estado de Florida, USA, con EIN 87-0943710 y domicilio en 12550 Biscayne Blvd,
    Ste 218, North Miami, FL 33181 (en adelante, "KREOON" o la "Plataforma").
  </p>
  <p>
    Este Acuerdo aplica a <strong>TODOS los roles de talento</strong> en la Plataforma, incluyendo
    pero no limitado a: Creadores de Contenido, Editores, Estrategas Digitales, Estrategas Creativos,
    Community Managers, y cualquier otro rol clasificado como talento.
  </p>
  <p class="legal-highlight">
    <strong>AL REGISTRARSE COMO TALENTO EN KREOON, USTED ACEPTA ESTAR LEGALMENTE OBLIGADO POR ESTE ACUERDO.</strong>
  </p>
</section>

<section id="definiciones">
  <h2>1. DEFINICIONES</h2>
  <dl>
    <dt><strong>"Talento"</strong></dt>
    <dd>Cualquier usuario registrado en la Plataforma que presta servicios en roles de creacion,
    produccion, edicion, estrategia o gestion de contenido digital.</dd>

    <dt><strong>"Contenido" o "Trabajo"</strong></dt>
    <dd>Cualquier material audiovisual, visual, escrito, sonoro, tecnico o estrategico producido
    por el Talento, incluyendo videos, fotografias, disenos, guiones, estrategias, planes, ediciones,
    codigo, y cualquier entregable relacionado.</dd>

    <dt><strong>"Proyecto"</strong></dt>
    <dd>Encargo especifico de trabajo acordado entre el Talento y un Cliente a traves de la Plataforma.</dd>

    <dt><strong>"Cliente"</strong></dt>
    <dd>Usuario de la Plataforma que contrata los servicios del Talento.</dd>

    <dt><strong>"Periodo de Corte"</strong></dt>
    <dd>Periodo mensual que finaliza el dia 10 de cada mes, durante el cual se contabilizan
    los trabajos aprobados para pago.</dd>

    <dt><strong>"Mes Vencido"</strong></dt>
    <dd>Sistema de pago donde los trabajos aprobados en un periodo de corte se pagan en el
    mes calendario siguiente.</dd>
  </dl>
</section>

<section id="cesion-derechos-imagen">
  <h2>2. CESION DE DERECHOS DE IMAGEN — ILIMITADA</h2>

  <p class="legal-highlight">
    <strong>CLAUSULA ESENCIAL:</strong> El Talento otorga una cesion de derechos de imagen
    <strong>ILIMITADA, IRREVOCABLE, SIN RESTRICCION TEMPORAL NI TERRITORIAL</strong> a
    SICOMMER INT LLC y sus clientes.
  </p>

  <h3>2.1 Alcance de la Cesion</h3>
  <p>
    El TALENTO autoriza de manera <strong>libre, voluntaria, irrevocable, perpetua y sin
    restriccion geografica</strong> a SICOMMER INT LLC para usar, reproducir, modificar,
    distribuir y sublicenciar:
  </p>
  <ul>
    <li>Su imagen personal (rostro, cuerpo, rasgos fisicos)</li>
    <li>Su voz y cualquier grabacion de audio</li>
    <li>Su nombre, seudonimo, apodo o nombre artistico</li>
    <li>Su likeness (representacion, caracterizacion, imitacion)</li>
    <li>Cualquier material donde el Talento sea reconocible</li>
  </ul>

  <h3>2.2 Usos Autorizados</h3>
  <p>Esta autorizacion incluye, sin limitacion, el uso en:</p>
  <ul>
    <li>Campanas publicitarias (organicas y pagas) sin limite de inversion</li>
    <li>Redes sociales de cualquier plataforma actual o futura</li>
    <li>Material promocional impreso y digital</li>
    <li>E-commerce, catalogos, packaging</li>
    <li>Transmisiones en vivo y grabadas</li>
    <li>Ferias, eventos, exposiciones</li>
    <li>Publicidad exterior (vallas, espectaculares, transporte)</li>
    <li>Television, radio, streaming</li>
    <li>Cualquier otro medio existente o por existir</li>
  </ul>

  <h3>2.3 Sublicenciamiento</h3>
  <p>
    SICOMMER INT LLC puede sublicenciar los derechos de imagen del Talento a sus clientes,
    marcas y organizaciones sin requerir autorizacion adicional ni compensacion extra al Talento.
  </p>

  <h3>2.4 Perpetuidad</h3>
  <p>
    Esta autorizacion <strong>NO tiene fecha de vencimiento</strong>. El contenido con la imagen
    del Talento puede seguir siendo utilizado indefinidamente despues de que el Talento deje de
    colaborar con la Plataforma o despues de finalizado cualquier proyecto especifico.
  </p>
</section>

<section id="propiedad-contenido">
  <h2>3. PROPIEDAD DEL CONTENIDO — CESION AL CLIENTE</h2>

  <p class="legal-highlight">
    <strong>CLAUSULA ESENCIAL:</strong> Los trabajos y proyectos realizados por el Talento
    <strong>NO son propiedad del Talento</strong>. Son propiedad del Cliente desde el momento
    de su aprobacion.
  </p>

  <h3>3.1 Cesion Automatica de Derechos Patrimoniales</h3>
  <p>
    Al entregar cualquier Contenido a traves de la Plataforma, el Talento <strong>CEDE de manera
    automatica, irrevocable, sin limite temporal y sin restriccion territorial</strong> todos los
    derechos patrimoniales sobre dicho contenido a SICOMMER INT LLC, quien a su vez los transfiere
    o sublicencia al Cliente segun los terminos del proyecto.
  </p>

  <h3>3.2 Derechos Cedidos</h3>
  <p>Esta cesion incluye, sin limitacion:</p>
  <ul>
    <li>Derecho de reproduccion total o parcial por cualquier medio</li>
    <li>Derecho de distribucion por cualquier canal</li>
    <li>Derecho de comunicacion publica</li>
    <li>Derecho de transformacion, adaptacion y creacion de obras derivadas</li>
    <li>Derecho de sublicenciamiento a terceros</li>
    <li>Derecho de uso comercial, publicitario, promocional e institucional</li>
    <li>Derecho de archivo y almacenamiento permanente</li>
  </ul>

  <h3>3.3 Trabajo por Encargo (Work Made for Hire)</h3>
  <p>
    A todos los efectos legales, el Contenido producido por el Talento se considera
    <strong>trabajo por encargo</strong> bajo las leyes aplicables (17 U.S.C. § 101 en USA,
    y legislacion equivalente en jurisdicciones LATAM). El Cliente es considerado el autor
    y propietario original del contenido desde su creacion.
  </p>

  <h3>3.4 Renuncia a Reclamaciones Futuras</h3>
  <p>
    El Talento renuncia expresamente a cualquier reclamacion futura sobre derechos patrimoniales,
    regalias, participacion en ingresos, o compensacion adicional por el uso continuado del
    contenido cedido.
  </p>

  <h3>3.5 Uso de Portfolio</h3>
  <p>
    El Talento <strong>NO puede</strong> utilizar el contenido entregado para su portfolio personal
    sin autorizacion previa y expresa de SICOMMER INT LLC, solicitada a traves de legal@kreoon.com.
  </p>
</section>

<section id="condiciones-pago">
  <h2>4. CONDICIONES DE PAGO — MES VENCIDO</h2>

  <p class="legal-highlight">
    <strong>CLAUSULA ESENCIAL:</strong> El pago al Talento se realiza <strong>DESPUES de aprobado
    el contenido</strong>, en modalidad de <strong>MES VENCIDO</strong>.
  </p>

  <h3>4.1 Requisito Previo: Aprobacion del Contenido</h3>
  <p>
    El Talento <strong>solo recibe pago despues de que el Cliente ha aprobado formalmente
    el Contenido entregado</strong>. No hay anticipos ni pagos parciales por trabajos no aprobados.
  </p>

  <h3>4.2 Periodo de Corte Mensual</h3>
  <p>
    Los cortes de pago se realizan <strong>hasta el dia 10 de cada mes</strong>.
    Todos los trabajos aprobados desde el dia 11 del mes anterior hasta el dia 10 del mes
    actual se incluyen en el corte correspondiente.
  </p>

  <h3>4.3 Pago a Mes Vencido</h3>
  <p>El pago se realiza <strong>UN MES DESPUES del corte</strong>. Ejemplo:</p>
  <ul>
    <li>Trabajo aprobado: 15 de marzo de 2026</li>
    <li>Incluido en corte: 10 de abril de 2026</li>
    <li>Pago efectivo: Mayo de 2026 (entre el dia 1 y el 15)</li>
  </ul>

  <h3>4.4 Calendario de Pagos</h3>
  <table class="legal-table">
    <tr>
      <th>Trabajos aprobados entre</th>
      <th>Corte incluido</th>
      <th>Mes de pago</th>
    </tr>
    <tr>
      <td>11 de enero — 10 de febrero</td>
      <td>10 de febrero</td>
      <td>Marzo</td>
    </tr>
    <tr>
      <td>11 de febrero — 10 de marzo</td>
      <td>10 de marzo</td>
      <td>Abril</td>
    </tr>
    <tr>
      <td>11 de marzo — 10 de abril</td>
      <td>10 de abril</td>
      <td>Mayo</td>
    </tr>
  </table>

  <h3>4.5 Comisiones de KREOON</h3>
  <p>
    Del valor total del proyecto, KREOON retiene una comision segun la tabla vigente
    (generalmente entre 20% y 30%). El Talento recibe el neto despues de comisiones.
  </p>

  <h3>4.6 Impuestos y Retenciones</h3>
  <p>
    El Talento es responsable de sus obligaciones tributarias. KREOON puede aplicar retenciones
    en la fuente cuando sea requerido por ley y emitira certificados correspondientes.
  </p>
</section>

<section id="naturaleza-relacion">
  <h2>5. NATURALEZA DE LA RELACION</h2>

  <h3>5.1 Contratista Independiente</h3>
  <p>
    El Talento actua en todo momento como <strong>contratista independiente</strong> y
    <strong>NO como empleado</strong> de KREOON ni de los Clientes.
  </p>

  <h3>5.2 Ausencia de Relacion Laboral</h3>
  <p>Este Acuerdo NO crea una relacion de trabajo subordinado. El Talento:</p>
  <ul>
    <li>Determina sus propios horarios y metodos de trabajo</li>
    <li>Utiliza sus propios equipos y herramientas</li>
    <li>Puede rechazar proyectos a su discrecion</li>
    <li>Puede trabajar para multiples clientes simultaneamente</li>
    <li>Asume sus propias obligaciones tributarias y de seguridad social</li>
  </ul>
</section>

<section id="obligaciones-talento">
  <h2>6. OBLIGACIONES DEL TALENTO</h2>

  <h3>6.1 Calidad y Profesionalismo</h3>
  <ul>
    <li>Entregar trabajo de calidad profesional segun los estandares acordados</li>
    <li>Cumplir con los plazos establecidos</li>
    <li>Comunicar proactivamente cualquier retraso o inconveniente</li>
    <li>Responder a mensajes de Clientes en tiempo razonable (max. 48 horas)</li>
  </ul>

  <h3>6.2 Originalidad y Legalidad</h3>
  <ul>
    <li>El Contenido debe ser original y no infringir derechos de terceros</li>
    <li>No utilizar material protegido por copyright sin autorizacion</li>
    <li>Garantizar que tiene las autorizaciones de terceros que aparezcan en el contenido</li>
  </ul>

  <h3>6.3 Confidencialidad</h3>
  <p>
    El Talento se compromete a mantener confidenciales los briefs, estrategias, y cualquier
    informacion no publica de los Clientes.
  </p>
</section>

<section id="penalidades">
  <h2>7. PENALIDADES</h2>

  <h3>7.1 Incumplimientos y Consecuencias</h3>
  <table class="legal-table">
    <tr>
      <th>Incumplimiento</th>
      <th>Consecuencia</th>
    </tr>
    <tr>
      <td>No entregar en plazo sin justificacion</td>
      <td>Reduccion de reputacion, posible cancelacion de proyecto</td>
    </tr>
    <tr>
      <td>Entrega de calidad inferior a lo acordado</td>
      <td>Revision obligatoria sin pago adicional</td>
    </tr>
    <tr>
      <td>Contenido que infringe derechos de terceros</td>
      <td>Responsabilidad legal directa del Talento</td>
    </tr>
    <tr>
      <td>Abandono de proyecto</td>
      <td>Suspension de cuenta</td>
    </tr>
    <tr>
      <td>Transacciones fuera de la Plataforma</td>
      <td>Ban permanente</td>
    </tr>
  </table>
</section>

<section id="terminacion">
  <h2>8. TERMINACION</h2>

  <h3>8.1 Terminacion por el Talento</h3>
  <p>
    El Talento puede terminar este Acuerdo en cualquier momento, debiendo completar
    los proyectos activos antes de retirarse.
  </p>

  <h3>8.2 Supervivencia</h3>
  <p>
    Las siguientes disposiciones sobreviven a la terminacion: cesion de derechos de imagen,
    cesion de derechos patrimoniales, confidencialidad, y cualquier obligacion de pago pendiente.
  </p>
</section>

<section id="ley-aplicable">
  <h2>9. LEY APLICABLE Y RESOLUCION DE DISPUTAS</h2>

  <h3>9.1 Ley Aplicable</h3>
  <p>Este Acuerdo se rige por las leyes del Estado de Florida, Estados Unidos.</p>

  <h3>9.2 Resolucion de Disputas</h3>
  <p>
    Cualquier disputa se resolvera primero mediante negociacion directa. De no lograrse
    acuerdo en 30 dias, se sometera a arbitraje vinculante en Miami, Florida.
  </p>
</section>

<section id="contacto">
  <h2>10. CONTACTO</h2>
  <address>
    <strong>SICOMMER INT LLC</strong><br>
    Attn: Talent Relations<br>
    12550 Biscayne Blvd, Ste 218<br>
    North Miami, FL 33181, USA<br><br>
    <strong>Email:</strong> talento@kreoon.com<br>
    <strong>Legal:</strong> legal@kreoon.com
  </address>
</section>

<footer class="legal-footer">
  <p>
    <strong>© 2026 SICOMMER INT LLC. Todos los derechos reservados.</strong><br>
    KREOON es una marca registrada de SICOMMER INT LLC.
  </p>
</footer>

</article>
</body>
</html>',
  true,
  true,
  NOW(),
  NOW()
);

-- -----------------------------------------------------------------------------
-- PARTE 3: Insertar documento CLIENT_AGREEMENT
-- -----------------------------------------------------------------------------

INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  summary,
  content_html,
  is_current,
  is_required,
  created_at,
  updated_at
) VALUES (
  'client_agreement',
  '1.0',
  '2026-03-30',
  'Acuerdo de Cliente KREOON',
  'Acuerdo para clientes. Establece pago anticipado obligatorio, condiciones de acuerdos especiales, y consecuencias por incumplimiento incluyendo bloqueo de plataforma.',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acuerdo de Cliente - KREOON</title>
</head>
<body>
<article class="legal-document">

<header>
  <h1>ACUERDO DE CLIENTE KREOON</h1>
  <p class="legal-meta">
    <strong>Plataforma:</strong> KREOON (https://kreoon.com)<br>
    <strong>Titular:</strong> SICOMMER INT LLC<br>
    <strong>Version:</strong> 1.0<br>
    <strong>Fecha de vigencia:</strong> 30 de marzo de 2026<br>
    <strong>Ultima actualizacion:</strong> 30 de marzo de 2026
  </p>
</header>

<section id="preambulo">
  <h2>PREAMBULO</h2>
  <p>
    Este Acuerdo de Cliente (en adelante, el "Acuerdo") establece los terminos bajo los cuales
    usted (el "Cliente") contrata servicios de creacion de contenido y produccion digital a traves
    de la plataforma KREOON, operada por <strong>SICOMMER INT LLC</strong>, una sociedad de
    responsabilidad limitada constituida bajo las leyes del Estado de Florida, USA, con EIN 87-0943710
    y domicilio en 12550 Biscayne Blvd, Ste 218, North Miami, FL 33181 (en adelante, "KREOON" o la "Plataforma").
  </p>
  <p class="legal-highlight">
    <strong>AL REGISTRARSE COMO CLIENTE EN KREOON, USTED ACEPTA ESTAR LEGALMENTE OBLIGADO POR ESTE ACUERDO.</strong>
  </p>
</section>

<section id="condiciones-pago">
  <h2>2. CONDICIONES DE PAGO — PAGO ANTICIPADO OBLIGATORIO</h2>

  <p class="legal-highlight">
    <strong>CLAUSULA ESENCIAL:</strong> El Cliente <strong>SIEMPRE debe pagar ANTES de iniciar
    cualquier trabajo</strong>. El pago activa el inicio del proyecto.
  </p>

  <h3>2.1 Pago Antes de Iniciar</h3>
  <p>
    Ningun proyecto se iniciara sin que el Cliente haya depositado el 100% del valor acordado
    en el sistema de escrow de KREOON. Esta regla aplica a:
  </p>
  <ul>
    <li>Proyectos individuales</li>
    <li>Paquetes de contenido</li>
    <li>Suscripciones de servicios</li>
    <li>Cualquier encargo de produccion</li>
  </ul>

  <h3>2.2 Activacion del Proyecto</h3>
  <p><strong>En el momento del pago se inicia el trabajo.</strong> El flujo estandar es:</p>
  <ol>
    <li>Cliente crea el proyecto y define requisitos</li>
    <li>Cliente deposita fondos en escrow (100% del valor)</li>
    <li>Sistema activa automaticamente el proyecto</li>
    <li>Talento recibe notificacion y comienza a trabajar</li>
    <li>Cliente revisa y aprueba (o solicita revisiones)</li>
    <li>Fondos se liberan al Talento tras aprobacion</li>
  </ol>

  <h3>2.3 No Hay Trabajos a Credito</h3>
  <p>
    KREOON <strong>NO opera bajo modalidad de credito</strong> para proyectos individuales.
    No se aceptan promesas de pago, pagos diferidos, ni pagos posteriores a la entrega,
    excepto en casos de Acuerdos de Pago Especial formalmente aprobados.
  </p>
</section>

<section id="acuerdos-pago-especial">
  <h2>3. ACUERDOS DE PAGO ESPECIAL</h2>

  <p class="legal-highlight">
    <strong>ADVERTENCIA:</strong> Si existe un Acuerdo de Pago Especial y el Cliente
    <strong>NO cumple con los terminos acordados</strong>, la plataforma sera
    <strong>BLOQUEADA TOTALMENTE</strong>.
  </p>

  <h3>3.1 Que es un Acuerdo de Pago Especial</h3>
  <p>
    Un Acuerdo de Pago Especial es un convenio escrito entre el Cliente y KREOON que permite
    condiciones de pago diferentes al estandar, tales como:
  </p>
  <ul>
    <li>Pago fraccionado (ej: 50% inicio, 50% entrega)</li>
    <li>Facturacion mensual con plazo de pago</li>
    <li>Linea de credito pre-aprobada</li>
    <li>Pagos contra factura (net 15, net 30)</li>
  </ul>

  <h3>3.3 Consecuencias por Incumplimiento</h3>
  <p>
    Si el Cliente con Acuerdo de Pago Especial <strong>NO cumple con los pagos en las fechas
    acordadas</strong>, se aplicaran las siguientes consecuencias de manera <strong>INMEDIATA
    Y AUTOMATICA</strong>:
  </p>
  <table class="legal-table">
    <tr>
      <th>Consecuencia</th>
      <th>Detalle</th>
    </tr>
    <tr>
      <td><strong>Bloqueo de descargas</strong></td>
      <td>El Cliente NO podra descargar ningun proyecto aprobado ni pendiente</td>
    </tr>
    <tr>
      <td><strong>Bloqueo de nuevos proyectos</strong></td>
      <td>El Cliente NO podra crear ni iniciar nuevos proyectos</td>
    </tr>
    <tr>
      <td><strong>Suspension de cuenta</strong></td>
      <td>Acceso limitado a funciones de solo lectura</td>
    </tr>
    <tr>
      <td><strong>Revocacion del Acuerdo Especial</strong></td>
      <td>Perdida permanente del beneficio de pago especial</td>
    </tr>
    <tr>
      <td><strong>Acciones legales</strong></td>
      <td>KREOON puede iniciar cobro judicial del saldo adeudado</td>
    </tr>
  </table>

  <h3>3.4 Reactivacion de Cuenta</h3>
  <p>El bloqueo <strong>solo se levanta</strong> cuando:</p>
  <ul>
    <li>El Cliente paga la totalidad del saldo vencido</li>
    <li>El Cliente paga intereses moratorios aplicables (1.5% mensual)</li>
    <li>El Cliente vuelve al sistema de pago anticipado estandar</li>
  </ul>
</section>

<section id="bloqueo-plataforma">
  <h2>4. BLOQUEO DE PLATAFORMA POR INCUMPLIMIENTO</h2>

  <h3>4.1 Causales de Bloqueo</h3>
  <p>La cuenta del Cliente sera bloqueada automaticamente en los siguientes casos:</p>
  <ul>
    <li>Incumplimiento de Acuerdo de Pago Especial</li>
    <li>Contracargos (chargebacks) no justificados</li>
    <li>Disputas de pago fraudulentas</li>
    <li>Morosidad de mas de 15 dias en cualquier factura</li>
  </ul>

  <h3>4.2 Alcance del Bloqueo</h3>
  <p>Durante el bloqueo, el Cliente:</p>
  <ul>
    <li><strong>NO puede</strong> descargar proyectos (ni aprobados ni pendientes)</li>
    <li><strong>NO puede</strong> iniciar nuevos proyectos</li>
    <li><strong>NO puede</strong> comunicarse con Talento activo</li>
    <li><strong>SI puede</strong> ver su historial (solo lectura)</li>
    <li><strong>SI puede</strong> realizar pagos para desbloquear</li>
  </ul>

  <h3>4.3 Contenido Retenido</h3>
  <p>
    El contenido producido durante el periodo de morosidad <strong>permanece en custodia de
    KREOON</strong> hasta que el Cliente regularice sus pagos. KREOON no es responsable por
    retrasos en campanas o perdidas comerciales derivadas del bloqueo por morosidad.
  </p>
</section>

<section id="propiedad-contenido">
  <h2>5. PROPIEDAD DEL CONTENIDO</h2>

  <h3>5.1 Transferencia de Derechos</h3>
  <p>Una vez aprobado el contenido y liberados los fondos del escrow, el Cliente recibe:</p>
  <ul>
    <li>Derechos patrimoniales completos sobre el contenido</li>
    <li>Licencia de uso de imagen del Talento segun el proyecto</li>
    <li>Derecho de modificacion y adaptacion</li>
    <li>Derecho de uso comercial sin restricciones</li>
  </ul>

  <h3>5.2 Condicion Suspensiva</h3>
  <p>
    La transferencia de derechos esta <strong>condicionada al pago completo</strong>.
    Si hay saldos pendientes, KREOON retiene los derechos hasta la regularizacion.
  </p>
</section>

<section id="ley-aplicable">
  <h2>10. LEY APLICABLE Y RESOLUCION DE DISPUTAS</h2>

  <h3>10.1 Ley Aplicable</h3>
  <p>Este Acuerdo se rige por las leyes del Estado de Florida, Estados Unidos.</p>

  <h3>10.2 Resolucion de Disputas</h3>
  <p>
    Cualquier disputa se resolvera primero mediante negociacion directa. De no lograrse
    acuerdo en 30 dias, se sometera a arbitraje vinculante en Miami, Florida, conforme
    a las reglas de la AAA.
  </p>
</section>

<section id="contacto">
  <h2>11. CONTACTO</h2>
  <address>
    <strong>SICOMMER INT LLC</strong><br>
    Attn: Client Relations<br>
    12550 Biscayne Blvd, Ste 218<br>
    North Miami, FL 33181, USA<br><br>
    <strong>Email:</strong> clientes@kreoon.com<br>
    <strong>Facturacion:</strong> facturacion@kreoon.com<br>
    <strong>Legal:</strong> legal@kreoon.com
  </address>
</section>

<footer class="legal-footer">
  <p>
    <strong>© 2026 SICOMMER INT LLC. Todos los derechos reservados.</strong><br>
    KREOON es una marca registrada de SICOMMER INT LLC.
  </p>
</footer>

</article>
</body>
</html>',
  true,
  true,
  NOW(),
  NOW()
);

-- -----------------------------------------------------------------------------
-- PARTE 4: Insertar documento ORGANIZATION_AGREEMENT
-- -----------------------------------------------------------------------------

INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  summary,
  content_html,
  is_current,
  is_required,
  created_at,
  updated_at
) VALUES (
  'organization_agreement',
  '1.0',
  '2026-03-30',
  'Acuerdo de Organizacion KREOON',
  'Acuerdo para organizaciones. Requiere metodo de pago valido para membresias. Bloqueo total de plataforma si no hay pagos al dia.',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acuerdo de Organizacion - KREOON</title>
</head>
<body>
<article class="legal-document">

<header>
  <h1>ACUERDO DE ORGANIZACION KREOON</h1>
  <p class="legal-meta">
    <strong>Plataforma:</strong> KREOON (https://kreoon.com)<br>
    <strong>Titular:</strong> SICOMMER INT LLC<br>
    <strong>Version:</strong> 1.0<br>
    <strong>Fecha de vigencia:</strong> 30 de marzo de 2026<br>
    <strong>Ultima actualizacion:</strong> 30 de marzo de 2026
  </p>
</header>

<section id="preambulo">
  <h2>PREAMBULO</h2>
  <p>
    Este Acuerdo de Organizacion (en adelante, el "Acuerdo") establece los terminos bajo los cuales
    su empresa u organizacion (en adelante, la "Organizacion") utiliza la plataforma KREOON para
    gestionar equipos de produccion, contenido y operaciones digitales. KREOON es operada por
    <strong>SICOMMER INT LLC</strong>, una sociedad de responsabilidad limitada constituida bajo
    las leyes del Estado de Florida, USA, con EIN 87-0943710 y domicilio en 12550 Biscayne Blvd,
    Ste 218, North Miami, FL 33181 (en adelante, "KREOON" o la "Plataforma").
  </p>
  <p class="legal-highlight">
    <strong>AL REGISTRAR UNA ORGANIZACION EN KREOON, USTED DECLARA TENER AUTORIDAD PARA OBLIGAR
    A LA ORGANIZACION Y ACEPTA ESTAR LEGALMENTE VINCULADO POR ESTE ACUERDO.</strong>
  </p>
</section>

<section id="metodo-pago-obligatorio">
  <h2>2. METODO DE PAGO — REQUISITO OBLIGATORIO</h2>

  <p class="legal-highlight">
    <strong>CLAUSULA ESENCIAL:</strong> La Organizacion <strong>DEBE tener un metodo de pago
    APROBADO Y VALIDO</strong> registrado en la Plataforma para poder operar.
  </p>

  <h3>2.1 Registro de Metodo de Pago</h3>
  <p>
    Durante el proceso de configuracion de la Organizacion, se debe registrar un metodo de pago
    valido que sera utilizado para:
  </p>
  <ul>
    <li>Cobro de membresias y suscripciones mensuales/anuales</li>
    <li>Compra de creditos o servicios adicionales</li>
    <li>Cargos por uso excedente (si aplica al plan)</li>
    <li>Renovaciones automaticas</li>
  </ul>

  <h3>2.2 Validacion del Metodo de Pago</h3>
  <p>
    El metodo de pago debe ser <strong>validado antes de la activacion</strong> de la cuenta
    organizacional. La validacion incluye:
  </p>
  <ul>
    <li>Verificacion de fondos disponibles (cargo de prueba)</li>
    <li>Confirmacion de datos del titular</li>
    <li>Autorizacion de cargos recurrentes</li>
  </ul>

  <h3>2.4 Actualizacion de Metodo de Pago</h3>
  <p>
    La Organizacion es responsable de mantener actualizado su metodo de pago. Si el metodo
    registrado es rechazado, expira, o se cancela, la Organizacion tiene <strong>5 dias habiles</strong>
    para actualizar la informacion antes de que se active el bloqueo.
  </p>
</section>

<section id="bloqueo-incumplimiento">
  <h2>4. BLOQUEO POR INCUMPLIMIENTO DE PAGOS</h2>

  <p class="legal-highlight">
    <strong>ADVERTENCIA CRITICA:</strong> Si la Organizacion <strong>NO tiene sus pagos al dia</strong>,
    la plataforma sera <strong>BLOQUEADA TOTALMENTE</strong> para todos los miembros de la Organizacion.
  </p>

  <h3>4.1 Proceso de Bloqueo</h3>
  <table class="legal-table">
    <tr>
      <th>Dia</th>
      <th>Estado</th>
      <th>Accion</th>
    </tr>
    <tr>
      <td>Dia 0</td>
      <td>Cargo fallido</td>
      <td>Notificacion por email al Administrador</td>
    </tr>
    <tr>
      <td>Dia 3</td>
      <td>Reintento</td>
      <td>Segundo intento de cargo + notificacion</td>
    </tr>
    <tr>
      <td>Dia 5</td>
      <td>Advertencia</td>
      <td>Tercer intento + advertencia de bloqueo inminente</td>
    </tr>
    <tr>
      <td>Dia 7</td>
      <td><strong>BLOQUEO</strong></td>
      <td>Plataforma bloqueada para toda la Organizacion</td>
    </tr>
  </table>

  <h3>4.2 Consecuencias del Bloqueo</h3>
  <p>Cuando la Organizacion esta bloqueada por falta de pago:</p>
  <ul>
    <li><strong>NO se pueden</strong> gestionar equipos ni miembros</li>
    <li><strong>NO se pueden</strong> crear ni editar proyectos</li>
    <li><strong>NO se pueden</strong> descargar contenidos (ni aprobados ni pendientes)</li>
    <li><strong>NO se pueden</strong> acceder a herramientas de colaboracion</li>
    <li><strong>NO se pueden</strong> usar funcionalidades de IA</li>
    <li><strong>SI se puede</strong> acceder en modo solo lectura para ver historial</li>
    <li><strong>SI se puede</strong> actualizar metodo de pago para desbloquear</li>
  </ul>

  <h3>4.3 Bloqueo a Nivel de Organizacion</h3>
  <p>
    El bloqueo aplica a <strong>TODOS los usuarios</strong> asociados a la Organizacion,
    incluyendo Administradores, Team Leaders, y cualquier otro rol. No hay excepciones
    individuales.
  </p>

  <h3>4.4 Retencion de Datos</h3>
  <p>Durante el periodo de bloqueo (hasta 90 dias):</p>
  <ul>
    <li>Los datos de la Organizacion se mantienen intactos</li>
    <li>El contenido producido permanece en custodia de KREOON</li>
    <li>Los proyectos activos quedan pausados</li>
  </ul>
  <p>
    Despues de 90 dias de impago, KREOON se reserva el derecho de eliminar los datos
    de la Organizacion.
  </p>
</section>

<section id="reactivacion">
  <h2>5. REACTIVACION DE CUENTA</h2>

  <h3>5.1 Como Desbloquear</h3>
  <p>Para reactivar una cuenta bloqueada, la Organizacion debe:</p>
  <ol>
    <li>Actualizar el metodo de pago con uno valido</li>
    <li>Pagar el saldo vencido completo</li>
    <li>Pagar la membresia del periodo actual</li>
    <li>Pagar cargos por mora si aplican (1.5% mensual sobre saldo vencido)</li>
  </ol>

  <h3>5.2 Tiempo de Reactivacion</h3>
  <p>
    Una vez procesado el pago, la cuenta se reactiva en un plazo maximo de
    <strong>2 horas habiles</strong>.
  </p>
</section>

<section id="ley-aplicable">
  <h2>11. LEY APLICABLE Y RESOLUCION DE DISPUTAS</h2>

  <h3>11.1 Ley Aplicable</h3>
  <p>Este Acuerdo se rige por las leyes del Estado de Florida, Estados Unidos.</p>

  <h3>11.2 Resolucion de Disputas</h3>
  <p>
    Cualquier disputa se resolvera primero mediante negociacion directa. De no lograrse
    acuerdo en 30 dias, se sometera a arbitraje vinculante en Miami, Florida, conforme
    a las reglas de la AAA.
  </p>
</section>

<section id="contacto">
  <h2>12. CONTACTO</h2>
  <address>
    <strong>SICOMMER INT LLC</strong><br>
    Attn: Enterprise Relations<br>
    12550 Biscayne Blvd, Ste 218<br>
    North Miami, FL 33181, USA<br><br>
    <strong>Email:</strong> enterprise@kreoon.com<br>
    <strong>Facturacion:</strong> facturacion@kreoon.com<br>
    <strong>Legal:</strong> legal@kreoon.com<br>
    <strong>DPO:</strong> dpo@kreoon.com
  </address>
</section>

<footer class="legal-footer">
  <p>
    <strong>© 2026 SICOMMER INT LLC. Todos los derechos reservados.</strong><br>
    KREOON es una marca registrada de SICOMMER INT LLC.
  </p>
</footer>

</article>
</body>
</html>',
  true,
  true,
  NOW(),
  NOW()
);

-- -----------------------------------------------------------------------------
-- PARTE 5: Configurar requirements por account_type
-- -----------------------------------------------------------------------------

-- Eliminar requirements anteriores que puedan conflictuar
DELETE FROM legal_consent_requirements
WHERE document_type IN ('talent_agreement', 'client_agreement', 'organization_agreement');

-- Insertar requirements para Talento
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  account_type,
  is_required,
  trigger_event,
  display_order
) VALUES (
  'talent_agreement',
  'all',
  'talent',
  true,
  'registration',
  5
);

-- Insertar requirements para Cliente
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  account_type,
  is_required,
  trigger_event,
  display_order
) VALUES (
  'client_agreement',
  'all',
  'client',
  true,
  'registration',
  5
);

-- Insertar requirements para Organizacion
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  account_type,
  is_required,
  trigger_event,
  display_order
) VALUES (
  'organization_agreement',
  'all',
  'organization',
  true,
  'registration',
  5
);

-- -----------------------------------------------------------------------------
-- FIN DE LA MIGRACION
-- -----------------------------------------------------------------------------

-- Verificar que los documentos se insertaron correctamente
DO $$
DECLARE
  talent_count INT;
  client_count INT;
  org_count INT;
BEGIN
  SELECT COUNT(*) INTO talent_count FROM legal_documents WHERE document_type = 'talent_agreement';
  SELECT COUNT(*) INTO client_count FROM legal_documents WHERE document_type = 'client_agreement';
  SELECT COUNT(*) INTO org_count FROM legal_documents WHERE document_type = 'organization_agreement';

  RAISE NOTICE 'Documentos insertados: talent_agreement=%, client_agreement=%, organization_agreement=%',
    talent_count, client_count, org_count;
END $$;
