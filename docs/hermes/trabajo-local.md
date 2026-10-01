# Trabajar en local con Hermes

Claude (nube) y tu PC comparten **solo la rama** `claude/focused-mendel-es4xcv`. Hermes vive en tu servidor y se alcanza
desde tu PC. Nada de claves en el chat ni en el repo.

## Una vez

```powershell
cd D:\Github\01-kreoon\kreoon
.\scripts\local\sincronizar.ps1          # trae la rama, instala dependencias, crea .env.local si falta
```

Completa `.env.local` con la URL y la clave **anon** de Supabase (la anon es publica; nunca pongas la service role).

## Cada sesion

1. `.\scripts\local\sincronizar.ps1 -Hermes` — actualiza la rama y recoge lo que Hermes haya terminado.
2. `npm run dev -- --host 127.0.0.1` y abre http://127.0.0.1:8080
3. Tareas para Hermes: Claude las deja en `docs/hermes/cola/`; tu las envias con `node scripts/hermes/cola.mjs enviar --ensayo`
   y luego sin `--ensayo`. Recoge con `recoger --commit`.
4. Si cambias algo tu, haz commit y `git push`; Claude lo ve al hacer `git pull` en la nube.

## Reparto

- **Hermes**: copys, guiones, investigacion con fuentes, variantes, revision de estilo. Todo es borrador.
- **Claude**: arquitectura, seguridad, migraciones, integracion, revision de lo que devuelve Hermes.
- **Tu**: autorizas despliegues, envias a Hermes, decides lo legal y lo de imagen de personas.
