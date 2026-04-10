# Public Registration API

Widget de registro embebido para ugccolombia.co que crea usuarios directamente en KREOON.

## URL de Produccion

```
https://wjkbqcrxwsmvtxmqgiqc.functions.supabase.co/public-registration
```

## Endpoint

### POST /public-registration

Registra un nuevo usuario (creador o marca) en KREOON y lo asigna a la organizacion UGC Colombia.

#### Registro de Creador

```json
{
  "type": "creator",
  "email": "creador@ejemplo.com",
  "password": "minimo8caracteres",
  "full_name": "Nombre Completo",
  "phone": "+57 300 123 4567",
  "legal_accepted": true
}
```

#### Registro de Marca

```json
{
  "type": "brand",
  "email": "marca@empresa.com",
  "password": "minimo8caracteres",
  "company_name": "Nombre de la Empresa",
  "contact_name": "Nombre del Contacto",
  "phone": "+57 300 123 4567",
  "legal_accepted": true
}
```

> **Nota**: `legal_accepted` es obligatorio. Representa la aceptacion de Terminos, Politica de Privacidad y Tratamiento de Datos (Ley 1581).
> Los datos adicionales (redes sociales, categorias, ciudad, etc.) se completan en el onboarding de KREOON.

#### Respuesta Exitosa

```json
{
  "success": true,
  "message": "Registro exitoso. Revisa tu email para verificar tu cuenta.",
  "user_id": "uuid",
  "login_url": "https://kreoon.com/auth"
}
```

## Que hace la funcion

1. Crea usuario en Supabase Auth
2. Crea perfil en `profiles`
3. Agrega a organizacion UGC Colombia
4. Asigna rol (`creator` o `client`)
5. Si es creador: crea `creator_profile` para el marketplace
6. Si es marca: crea registro en `clients`
7. Envia email de bienvenida via Resend

## CORS

Origenes permitidos:
- `https://ugccolombia.co`
- `https://www.ugccolombia.co`
- `*.vercel.app`
- `http://localhost:3000`

## Deploy

```bash
supabase functions deploy public-registration --no-verify-jwt --project-ref wjkbqcrxwsmvtxmqgiqc
```
