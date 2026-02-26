-- Actualizar descripción de Mastershop (sin mencionar UGC Colombia)
UPDATE partner_communities
SET
    description = 'Comunidad exclusiva de emprendedores y marcas de Mastershop. Obtén beneficios especiales: 2 meses gratis en tu primer plan, descuento permanente en comisiones del marketplace, y una etiqueta especial en tu perfil.',
    partner_contact_email = 'hola@mastershop.co',
    notes = 'Comunidad de Mastershop',
    updated_at = NOW()
WHERE slug = 'mastershop';
