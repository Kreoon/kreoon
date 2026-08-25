-- ============================================================================
-- Acuerdo de Cliente v2.0 (2026-08-24)
-- ============================================================================
-- Fuente: contrato de prestación de servicios UGC Colombia / SICOMMER INT LLC
-- (modelo usado con clientes reales en agosto de 2026), generalizado: los datos
-- de cada empresa salen de su ficha de onboarding y el detalle del paquete de
-- `client_packages` + la factura, no del texto del documento.
--
-- Es el documento que el cliente acepta en el paso 0 del link de onboarding
-- (clickwrap). Reemplaza la v1.0 (que solo cubría pago anticipado y bloqueo).
-- ============================================================================

UPDATE public.legal_documents
SET is_current = false, updated_at = now()
WHERE document_type = 'client_agreement' AND is_current = true;

INSERT INTO public.legal_documents (
  document_type, version, version_date, title, title_en, summary,
  is_current, is_required, applies_to, published_at, content_html
)
SELECT
  'client_agreement',
  '2.0',
  DATE '2026-08-24',
  'Acuerdo de Servicios de Producción de Contenido (UGC)',
  'UGC Content Production Services Agreement',
  'Condiciones del servicio de producción de contenido UGC: alcance, metodología en Kreoon, tiempos, pago 100% anticipado, licencia de uso de 1 año, rondas de corrección, responsabilidades del cliente, confidencialidad y liquidación en caso de terminación.',
  true,
  true,
  ARRAY['brand','client'],
  now(),
  $html$
<article class="legal-document">

<header>
  <h1>ACUERDO DE SERVICIOS DE PRODUCCIÓN DE CONTENIDO AUDIOVISUAL (UGC)</h1>
  <p class="legal-meta">
    <strong>Prestador:</strong> SICOMMER INT LLC (marca comercial UGC Colombia · plataforma KREOON)<br>
    <strong>Versión:</strong> 2.0<br>
    <strong>Fecha de vigencia:</strong> 24 de agosto de 2026
  </p>
</header>

<section id="partes">
  <h2>CLÁUSULA 1 — IDENTIFICACIÓN DE LAS PARTES</h2>
  <h3>1.1 El Prestador</h3>
  <p>
    <strong>SICOMMER INT LLC</strong>, sociedad de responsabilidad limitada constituida bajo las leyes del Estado de Florida, Estados Unidos,
    Registro No. L21000234908, EIN 87-0943710, con domicilio en 1989 NE 163rd St, North Miami Beach, FL 33162, USA,
    representada legalmente por Johan Alexander Castaño, que opera bajo la marca comercial <strong>UGC Colombia</strong> y la plataforma
    <strong>KREOON</strong> (https://kreoon.com). Correo de contacto: founder@kreoon.com. En adelante, "EL PRESTADOR".
  </p>
  <h3>1.2 El Cliente</h3>
  <p>
    La persona jurídica o natural identificada con los datos registrados en su ficha de empresa en KREOON (razón social,
    número de identificación tributaria, representante legal, correo electrónico, contacto operativo y dirección fiscal),
    en adelante "EL CLIENTE". EL CLIENTE declara que la información registrada es veraz y que la persona que acepta este
    Acuerdo está facultada para obligarlo.
  </p>
  <p>En conjunto, EL PRESTADOR y EL CLIENTE serán denominados "LAS PARTES".</p>
  <p class="legal-highlight">
    <strong>AL ACEPTAR ESTE ACUERDO EN KREOON, EL CLIENTE QUEDA LEGALMENTE OBLIGADO POR SUS CLÁUSULAS. LA ACEPTACIÓN
    ELECTRÓNICA (FECHA, HORA, DIRECCIÓN IP Y VERSIÓN DEL DOCUMENTO REGISTRADAS EN LA PLATAFORMA) TIENE EL VALOR DE FIRMA.</strong>
  </p>
</section>

<section id="objeto">
  <h2>CLÁUSULA 2 — OBJETO</h2>
  <p>
    EL PRESTADOR se obliga a producir para EL CLIENTE el paquete de contenido audiovisual contratado, con enfoque
    estratégico bajo las metodologías internas VIRAL-360#, CONVEXIA# y UGC-Triad#, incluyendo estrategia, guiones,
    producción, edición y variaciones, conforme a la metodología de trabajo descrita en la Cláusula 4.
  </p>
  <p>
    El <strong>detalle del paquete contratado</strong> (cantidad de videos, variaciones por video, cantidad de guiones,
    duración, plataformas de optimización, período de licencia, valor y forma de pago) es el registrado en la sección
    <em>Paquetes</em> de la empresa en KREOON y en la factura o invoice correspondiente. Ese registro hace parte integral
    de este Acuerdo y prevalece sobre cualquier comunicación informal.
  </p>
</section>

<section id="alcance">
  <h2>CLÁUSULA 3 — ALCANCE DEL SERVICIO</h2>
  <p>El servicio comprende, en todos los casos:</p>
  <ul>
    <li>Construcción del ADN de marca y ADN de producto como base estratégica del contenido.</li>
    <li>Guiones estratégicos elaborados y gestionados en la plataforma KREOON.</li>
    <li>Grabación profesional con creador(es) seleccionado(s) por EL PRESTADOR y aprobado(s) por EL CLIENTE.</li>
    <li>Edición completa y variaciones según el paquete contratado.</li>
    <li>Optimización para las plataformas indicadas en el paquete (Meta Ads, TikTok Ads, YouTube Shorts u otras).</li>
    <li>Revisión de guiones y de contenido final a través de la plataforma KREOON.</li>
  </ul>
  <p>
    El servicio incluye un total de <strong>cuatro (4) rondas de corrección por pieza</strong>: dos (2) sobre los guiones,
    previas a la grabación, y dos (2) sobre el video final, una vez entregado el contenido editado. Correcciones
    adicionales o cambios que modifiquen el enfoque aprobado inicialmente serán cotizados como servicio adicional.
  </p>
  <p><strong>El servicio NO incluye:</strong></p>
  <ul>
    <li>Manejo de redes sociales.</li>
    <li>Administración de campañas publicitarias.</li>
    <li>Locaciones externas, transportes o viáticos del personal.</li>
    <li>Nuevos guiones después de aprobados.</li>
    <li>Cambios de enfoque o estrategia luego de iniciada la grabación.</li>
    <li>Cambios en la estética o apariencia del creador.</li>
    <li>Licencias para medios tradicionales (TV, radio, prensa, vallas).</li>
  </ul>
  <p>
    La duración estimada de cada video será la indicada en el paquete (por defecto, entre treinta (30) y setenta (70)
    segundos), ajustándose a las mejores prácticas de contenido para plataformas digitales y pauta publicitaria. Todo lo
    no contemplado en el alcance será cotizado como servicio adicional.
  </p>
</section>

<section id="metodologia">
  <h2>CLÁUSULA 4 — METODOLOGÍA DE TRABAJO</h2>
  <p>EL CLIENTE reconoce y acepta que el proyecto se ejecuta en la plataforma KREOON bajo el siguiente flujo:</p>
  <ol>
    <li>Onboarding y brief estratégico completo (formulario de la empresa en KREOON).</li>
    <li>Envío del producto físico por parte de EL CLIENTE, cuando aplique.</li>
    <li>Construcción del ADN de marca y ADN de producto, y validación con EL CLIENTE.</li>
    <li>Desarrollo de guiones estratégicos en KREOON.</li>
    <li>Aprobación de guiones por EL CLIENTE en KREOON (hasta 2 rondas de ajuste).</li>
    <li>Producción: grabación con el creador asignado.</li>
    <li>Edición y generación de variaciones.</li>
    <li>Revisión del contenido final por EL CLIENTE en KREOON (hasta 2 rondas de ajuste).</li>
    <li>Entrega final y activación de la licencia de uso.</li>
  </ol>
  <p class="legal-highlight"><strong>Ninguna grabación se realizará sin la aprobación total de los guiones por parte de EL CLIENTE.</strong></p>
</section>

<section id="tiempos">
  <h2>CLÁUSULA 5 — TIEMPOS DE ENTREGA</h2>
  <p>EL PRESTADOR se compromete a:</p>
  <ul>
    <li>Entregar guiones en máximo dos (2) días hábiles después de recibir el brief completo y validado el ADN de marca y producto.</li>
    <li>Entregar el contenido final en máximo cinco (5) días hábiles después de la aprobación de los guiones y de la recepción del producto físico por parte del creador asignado.</li>
    <li>Realizar correcciones en un plazo de uno (1) a dos (2) días hábiles por ronda.</li>
  </ul>
  <p>
    EL CLIENTE deberá aprobar o solicitar ajustes a los materiales entregados en un plazo máximo de <strong>cuarenta y ocho (48)
    horas hábiles</strong> contadas a partir de su disponibilidad en la plataforma KREOON.
  </p>
  <p>
    Si EL CLIENTE notifica expresamente dentro de dicho plazo que no podrá realizar la revisión en ese tiempo, los tiempos se
    ajustarán al plazo informado, sin que ello constituya incumplimiento. Si EL CLIENTE no realiza observaciones ni notifica
    imposibilidad de revisión dentro del plazo establecido, EL PRESTADOR podrá continuar con el proceso para no afectar el
    cronograma general del proyecto, entendiéndose el material como aprobado para efectos de avance.
  </p>
</section>

<section id="onboarding">
  <h2>CLÁUSULA 6 — REUNIÓN DE ONBOARDING</h2>
  <p>
    Se realizará una reunión inicial entre LAS PARTES antes de iniciar la producción, con el fin de definir el tono
    comunicacional, los lineamientos creativos, el estilo narrativo y los objetivos estratégicos del contenido. En esta
    reunión, o a través del formulario de onboarding en KREOON, EL CLIENTE entregará la información completa del producto
    (componentes, precios, garantías, diferenciales y restricciones legales o de comunicación).
  </p>
</section>

<section id="pago">
  <h2>CLÁUSULA 7 — COMPENSACIÓN Y FORMA DE PAGO</h2>
  <p>EL CLIENTE pagará a EL PRESTADOR la suma indicada en el paquete contratado, en la moneda allí expresada.</p>
  <ul>
    <li><strong>Forma de pago:</strong> cien por ciento (100%) anticipado, salvo pacto distinto consignado por escrito en el paquete.</li>
    <li><strong>Medio de pago:</strong> los medios autorizados por EL PRESTADOR (pasarela de pago de KREOON o transferencia bancaria a la cuenta indicada en la factura o invoice).</li>
    <li>Las comisiones bancarias o de intermediación del envío estarán a cargo de EL CLIENTE.</li>
    <li><strong>La producción inicia únicamente con el pago confirmado</strong> en la cuenta de EL PRESTADOR.</li>
  </ul>
  <p>
    EL CLIENTE podrá hacer uso del contenido de cada paquete una vez este haya sido pagado en su totalidad, sin necesidad de
    haber cancelado los demás paquetes contratados.
  </p>
</section>

<section id="licencias">
  <h2>CLÁUSULA 8 — LICENCIAS, USO Y DERECHOS</h2>
  <p>
    EL PRESTADOR concede a EL CLIENTE una licencia de uso de imagen y contenido por el período indicado en el paquete (por
    defecto, <strong>un (1) año</strong> contado a partir de la entrega final), para los siguientes fines: uso en redes
    sociales, pauta digital paga (Meta Ads, TikTok Ads, YouTube Ads) y uso orgánico e interno de marca.
  </p>
  <p>
    Durante este período, EL CLIENTE podrá invertir en publicidad paga sin restricción sobre el contenido entregado. Una vez
    finalizada la licencia, EL CLIENTE podrá seguir utilizando el contenido de forma orgánica, pero no podrá continuar
    realizando pauta paga con dicho material, salvo renovación. Esta condición está alineada con los contratos suscritos
    entre EL PRESTADOR y los creadores de contenido, quienes ceden el derecho de imagen bajo los mismos términos temporales.
  </p>
  <table class="legal-table">
    <tr><th>Ampliación</th><th>Valor de referencia</th></tr>
    <tr><td>Renovación de licencia digital (1 año adicional)</td><td>20% – 30% del valor total del proyecto inicial</td></tr>
    <tr><td>Licencia para medios tradicionales</td><td>50% – 100% del valor total del proyecto inicial</td></tr>
  </table>
  <p>Toda ampliación de licencia debe ser cotizada y pactada por separado.</p>
</section>

<section id="aprobaciones">
  <h2>CLÁUSULA 9 — APROBACIONES Y USO DEL MATERIAL</h2>
  <ul>
    <li>La plataforma KREOON es el <strong>canal oficial</strong> de aprobación de guiones y contenido. El registro de aprobaciones, comentarios y fechas en KREOON constituye evidencia válida del estado del proyecto para todos los efectos de este Acuerdo.</li>
    <li>EL CLIENTE solo podrá usar material expresamente aprobado y correspondiente a paquetes pagados en su totalidad.</li>
    <li>Queda prohibido el uso total o parcial (incluyendo fragmentos, tomas de apoyo, capturas o audios) de material en proceso, no aprobado o no pagado. El uso no autorizado causará el cobro del valor total de la(s) pieza(s) utilizada(s) más la licencia correspondiente.</li>
    <li>En caso de terminación del Acuerdo, EL CLIENTE deberá abstenerse de usar cualquier material no liquidado y eliminar el material en proceso que tenga en su poder.</li>
  </ul>
</section>

<section id="produccion-adicional">
  <h2>CLÁUSULA 10 — CONDICIONES ADICIONALES DE PRODUCCIÓN</h2>
  <p>
    Si la producción requiere desplazamiento a locaciones externas, EL CLIENTE cubrirá los viáticos del personal y un cargo
    adicional de <strong>$300.000 COP</strong> por traslado de equipos y videógrafos, por cada cuatro (4) horas de trabajo.
    Las horas adicionales serán cotizadas por separado.
  </p>
</section>

<section id="responsabilidades">
  <h2>CLÁUSULA 11 — RESPONSABILIDADES DEL CLIENTE</h2>
  <p>EL CLIENTE se compromete a:</p>
  <ul>
    <li>Entregar los productos físicos a tiempo y en las cantidades requeridas para la producción.</li>
    <li>Completar el brief y proporcionar información veraz y completa sobre el producto, incluyendo restricciones legales de comunicación (claims permitidos).</li>
    <li>Aprobar o solicitar ajustes dentro de los tiempos establecidos en la Cláusula 5.</li>
    <li>Brindar retroalimentación clara, consolidada y por el canal oficial (KREOON).</li>
    <li>No interferir con los procesos operativos internos ni contactar directamente a creadores o editores para modificar el alcance sin autorización de EL PRESTADOR.</li>
  </ul>
  <p>
    EL CLIENTE es el único responsable de la veracidad de la información y de las afirmaciones sobre su producto
    suministradas para la elaboración de guiones y contenido.
  </p>
</section>

<section id="producto-fisico">
  <h2>CLÁUSULA 12 — PRODUCTO FÍSICO Y DEVOLUCIONES</h2>
  <ul>
    <li>Los costos de envío del producto hacia los creadores estarán a cargo de EL CLIENTE, salvo pacto en contrario en el paquete.</li>
    <li>Las unidades de producto utilizadas en la producción (abiertas, manipuladas o consumidas en grabación) no son objeto de devolución.</li>
    <li>En caso de terminación del Acuerdo, EL CLIENTE podrá solicitar la devolución de las unidades no utilizadas dentro de los quince (15) días calendario siguientes a la terminación, asumiendo el costo del flete de retorno. Vencido este plazo sin solicitud ni coordinación de recogida por parte de EL CLIENTE, EL PRESTADOR quedará liberado de la obligación de custodia a los treinta (30) días calendario.</li>
  </ul>
</section>

<section id="confidencialidad">
  <h2>CLÁUSULA 13 — CONFIDENCIALIDAD</h2>
  <p>
    Ambas PARTES se comprometen a mantener confidencialidad sobre las estrategias, la información comercial, el contenido en
    desarrollo y los procesos internos de la otra parte, durante la vigencia del Acuerdo y hasta dos (2) años después de su
    terminación.
  </p>
</section>

<section id="naturaleza">
  <h2>CLÁUSULA 14 — NATURALEZA DEL ACUERDO</h2>
  <p>
    Este es un acuerdo de prestación de servicios entre partes independientes. No genera relación laboral, sociedad, agencia
    ni representación entre LAS PARTES. Cada parte es responsable de sus propias obligaciones tributarias en su jurisdicción.
  </p>
</section>

<section id="comunicaciones">
  <h2>CLÁUSULA 15 — COMUNICACIONES OFICIALES</h2>
  <p>
    Las comunicaciones oficiales del proyecto se realizarán a través de la plataforma KREOON (aprobaciones y entregas) y de
    los correos electrónicos registrados por LAS PARTES (notificaciones contractuales). El grupo de WhatsApp del proyecto es
    un canal de coordinación operativa y no reemplaza los canales oficiales para efectos contractuales.
  </p>
</section>

<section id="terminacion">
  <h2>CLÁUSULA 16 — TERMINACIÓN Y LIQUIDACIÓN</h2>
  <h3>16.1 Terminación por incumplimiento</h3>
  <p>
    El presente Acuerdo podrá darse por terminado por cualquiera de LAS PARTES en caso de incumplimiento grave de las
    obligaciones contractuales, previa notificación escrita al correo registrado, otorgando a la parte incumplida un plazo de
    cinco (5) días hábiles para subsanar.
  </p>
  <h3>16.2 Incumplimiento del Prestador</h3>
  <p>
    En caso de incumplimiento atribuible a EL PRESTADOR, este se compromete a corregir la situación en un plazo razonable
    acordado entre LAS PARTES, o a devolver a EL CLIENTE el valor proporcional correspondiente a los servicios no ejecutados,
    dentro de los treinta (30) días calendario siguientes a la liquidación.
  </p>
  <h3>16.3 Terminación anticipada por el Cliente</h3>
  <p>
    En caso de terminación anticipada por parte de EL CLIENTE sin causa atribuible a EL PRESTADOR, no habrá lugar a reembolso
    de los valores correspondientes a servicios ejecutados o en curso. Para efectos de liquidación, LAS PARTES acuerdan la
    siguiente valoración del trabajo ejecutado por pieza o por paquete, según el avance registrado en KREOON:
  </p>
  <table class="legal-table">
    <tr><th>Etapa ejecutada</th><th>Valoración</th></tr>
    <tr><td>Estrategia, onboarding y ADN de marca/producto aprobados</td><td>15% del valor</td></tr>
    <tr><td>Guiones elaborados y/o aprobados</td><td>25% del valor</td></tr>
    <tr><td>Grabación realizada</td><td>30% del valor</td></tr>
    <tr><td>Edición y variaciones</td><td>20% del valor</td></tr>
    <tr><td>Entrega final y licencias</td><td>10% del valor</td></tr>
  </table>
  <p>
    El eventual saldo a favor de EL CLIENTE, correspondiente únicamente a etapas no iniciadas, será reembolsado dentro de los
    treinta (30) días calendario siguientes a la firma del acta de liquidación por ambas PARTES.
  </p>
</section>

<section id="disputas">
  <h2>CLÁUSULA 17 — RESOLUCIÓN DE DISPUTAS</h2>
  <p>
    Toda diferencia derivada de este Acuerdo se intentará resolver primero mediante arreglo directo entre LAS PARTES dentro
    de los quince (15) días calendario siguientes a la notificación escrita de la diferencia. De no lograrse acuerdo, LAS
    PARTES acudirán a mecanismos de conciliación o mediación antes de cualquier acción judicial. El registro de la plataforma
    KREOON y las comunicaciones por los canales oficiales servirán como soporte probatorio del estado del proyecto.
  </p>
</section>

<section id="aceptacion">
  <h2>CLÁUSULA 18 — ACEPTACIÓN ELECTRÓNICA</h2>
  <p>
    EL CLIENTE acepta este Acuerdo marcando la casilla correspondiente en KREOON. La plataforma registra la fecha y hora de
    aceptación, la dirección IP, el navegador y la versión del documento aceptada. LAS PARTES reconocen que dicho registro
    constituye manifestación válida de consentimiento y equivale a la firma del Acuerdo. Cada paquete contratado
    posteriormente se rige por esta misma versión salvo que EL PRESTADOR publique una nueva y EL CLIENTE la acepte.
  </p>
</section>

<section id="contacto">
  <h2>CONTACTO</h2>
  <address>
    <strong>SICOMMER INT LLC</strong> · UGC Colombia · KREOON<br>
    1989 NE 163rd St, North Miami Beach, FL 33162, USA<br>
    <strong>Email:</strong> founder@kreoon.com · <strong>Legal:</strong> legal@kreoon.com
  </address>
</section>

<footer class="legal-footer">
  <p><strong>© 2026 SICOMMER INT LLC. Todos los derechos reservados.</strong><br>KREOON y UGC Colombia son marcas de SICOMMER INT LLC.</p>
</footer>

</article>
$html$
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_documents WHERE document_type = 'client_agreement' AND version = '2.0'
);

UPDATE public.legal_documents
SET content_hash = encode(sha256(convert_to(content_html, 'UTF8')), 'hex')
WHERE document_type = 'client_agreement' AND version = '2.0';

NOTIFY pgrst, 'reload schema';
