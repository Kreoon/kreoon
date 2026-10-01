#!/usr/bin/env node
/**
 * Puente Claude ↔ Hermes (se ejecuta en TU PC; la sesión en la nube no alcanza el servidor).
 *
 *   node scripts/hermes/cola.mjs estado
 *   node scripts/hermes/cola.mjs enviar  [--ensayo] [--solo 005-nombre] [--reenviar]
 *   node scripts/hermes/cola.mjs recoger [--commit]
 *   node scripts/hermes/cola.mjs explorar            (solo lectura: descubre qué ofrece tu Hermes)
 *
 * Cola:        docs/hermes/cola/*.md          (frontmatter: perfil, titulo, max_runtime opcional)
 * Estado:      docs/hermes/estado.json        (una tarea ya enviada NO se reenvía: evita duplicados)
 * Resultados:  docs/hermes/resultados/*.md    (lo que devuelve Hermes, para que Claude lo revise)
 *
 * Variables: HERMES_SSH (host, por defecto servidor-casa) · HERMES_SSH_BIN (por defecto ssh).
 * Sin dependencias: solo Node 18+.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = path.join(ROOT, "docs/hermes");
const COLA = path.join(DIR, "cola");
const RESULTADOS = path.join(DIR, "resultados");
const ESTADO = path.join(DIR, "estado.json");
const HOST = process.env.HERMES_SSH || "servidor-casa";
const SSH = process.env.HERMES_SSH_BIN || "ssh";
const WORKSPACE_DEFECTO = "dir:/opt/data/workspace/proyectos/kreoon";
const HERMES = "docker exec -u hermes hermes hermes";

/** Patrones que delatan un secreto: una tarea que los contenga NO se envía (regla: nada con secretos a Hermes). */
const SECRETOS = [
  /sk-[A-Za-z0-9_-]{16,}/, /AKIA[0-9A-Z]{16}/, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(password|passwd|contraseña|secret|token|api[_-]?key|service[_-]?role)\s*[:=]\s*\S{6,}/i, /ghp_[A-Za-z0-9]{20,}/, /xox[bap]-[A-Za-z0-9-]{10,}/,
];

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n) => args.includes(`--${n}`);
const valor = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const leerEstado = () => (fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, "utf8")) : { version: 1, tareas: {} });
const guardarEstado = (e) => fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2) + "\n");
const comillaSimple = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const idValido = (s) => /^[A-Za-z0-9_-]{1,64}$/.test(s);

function leerTarea(archivo) {
  const crudo = fs.readFileSync(path.join(COLA, archivo), "utf8").replace(/\r\n/g, "\n");
  const m = crudo.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${archivo}: falta el frontmatter (--- perfil / titulo ---)`);
  const meta = Object.fromEntries(
    m[1].split("\n").filter((l) => l.includes(":")).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]),
  );
  const cuerpo = m[2].trim();
  const nombre = archivo.replace(/\.md$/, "");
  if (!/^[a-z0-9_-]{2,40}$/.test(meta.perfil ?? "")) throw new Error(`${archivo}: «perfil» inválido (solo a-z, 0-9, guion).`);
  if (!meta.titulo || meta.titulo.length > 120) throw new Error(`${archivo}: «titulo» obligatorio (máx. 120).`);
  if (cuerpo.length < 40) throw new Error(`${archivo}: el cuerpo es demasiado corto para ser autocontenido.`);
  const max = Number(meta.max_runtime ?? 900);
  if (!Number.isInteger(max) || max < 60 || max > 3600) throw new Error(`${archivo}: max_runtime debe estar entre 60 y 3600.`);
  for (const rx of SECRETOS) if (rx.test(cuerpo) || rx.test(meta.titulo)) throw new Error(`${archivo}: parece contener un secreto (${rx}). No se envía nada con claves a Hermes.`);
  return { nombre, perfil: meta.perfil, titulo: meta.titulo, max, workspace: meta.workspace || WORKSPACE_DEFECTO, cuerpo };
}

function listarCola() {
  return fs.readdirSync(COLA).filter((f) => f.endsWith(".md")).sort();
}

/** Script bash con una tarea por bloque; el cuerpo viaja en un heredoc con delimitador aleatorio (sin problemas de comillas). */
function construirScript(tareas) {
  const partes = ["set -u"];
  for (const t of tareas) {
    const delim = `HB_${crypto.randomBytes(6).toString("hex")}`;
    if (t.cuerpo.includes(delim)) throw new Error("colisión de delimitador, reintenta");
    partes.push(
      `echo '@@INICIO ${t.nombre}@@'`,
      `CUERPO=$(cat <<'${delim}'\n${t.cuerpo}\n${delim}\n)`,
      `${HERMES} kanban create ${comillaSimple(t.titulo)} --assignee ${t.perfil} --workspace ${comillaSimple(t.workspace)} --body "$CUERPO" --max-runtime ${t.max} --json`,
      `echo`,
      `echo '@@FIN ${t.nombre}@@'`,
    );
  }
  return partes.join("\n") + "\n";
}

function ssh(comando, entrada) {
  const r = spawnSync(SSH, [HOST, comando], { input: entrada, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (r.error) throw new Error(`No pude ejecutar «${SSH}»: ${r.error.message}`);
  return { out: r.stdout ?? "", err: r.stderr ?? "", code: r.status };
}

function extraerJson(texto) {
  const i = texto.indexOf("{");
  const j = texto.lastIndexOf("}");
  if (i < 0 || j < i) return null;
  try {
    return JSON.parse(texto.slice(i, j + 1));
  } catch {
    // Respaldo: si el JSON viene malformado, al menos rescata id y estado.
    const id = texto.match(/"id"\s*:\s*"([A-Za-z0-9_-]{1,64})"/)?.[1];
    const status = texto.match(/"status"\s*:\s*"([^"]{1,40})"/)?.[1];
    return id ? { id, status } : null;
  }
}

function cmdEstado() {
  const e = leerEstado();
  const archivos = listarCola();
  console.log("Tarea".padEnd(36), "Perfil".padEnd(12), "Estado".padEnd(10), "Id");
  for (const a of archivos) {
    const n = a.replace(/\.md$/, "");
    const s = e.tareas[n];
    let perfil = s?.perfil ?? "-";
    if (!s) try { perfil = leerTarea(a).perfil; } catch { perfil = "?"; }
    console.log(n.padEnd(36), perfil.padEnd(12), (s?.estado ?? "pendiente").padEnd(10), s?.id ?? "");
  }
}

function cmdEnviar() {
  const e = leerEstado();
  const solo = valor("solo");
  const pendientes = [];
  for (const a of listarCola()) {
    const nombre = a.replace(/\.md$/, "");
    if (solo && nombre !== solo) continue;
    const previa = e.tareas[nombre];
    if (previa?.id && !flag("reenviar")) {
      console.log(`· ${nombre}: ya enviada (${previa.id}); se omite. Usa --reenviar para forzar.`);
      continue;
    }
    pendientes.push(leerTarea(a)); // valida y corta ante secretos
  }
  if (!pendientes.length) return console.log("Nada pendiente que enviar.");
  const script = construirScript(pendientes);

  if (flag("ensayo")) {
    console.log(`[ENSAYO] Se enviarían ${pendientes.length} tarea(s) a ${HOST}:\n`);
    for (const t of pendientes) console.log(`  - ${t.nombre} → perfil ${t.perfil} · «${t.titulo}» · ${t.cuerpo.length} caracteres · máx ${t.max}s`);
    console.log("\n(No se creó nada.)");
    return;
  }
  const { out, err, code } = ssh("bash -s", script);
  if (err.trim()) console.error(err.trim());
  for (const t of pendientes) {
    const bloque = out.match(new RegExp(`@@INICIO ${t.nombre}@@([\\s\\S]*?)@@FIN ${t.nombre}@@`));
    const json = bloque ? extraerJson(bloque[1]) : null;
    if (json?.id && idValido(json.id)) {
      e.tareas[t.nombre] = { id: json.id, perfil: t.perfil, estado: json.status ?? "enviada", enviada: new Date().toISOString() };
      console.log(`✔ ${t.nombre} → ${json.id} (${json.status ?? "enviada"})`);
    } else {
      console.log(`✘ ${t.nombre}: no pude leer el id. Salida:\n${bloque ? bloque[1].trim().slice(0, 400) : "(sin salida)"}`);
    }
  }
  guardarEstado(e);
  if (code) console.error(`ssh terminó con código ${code}`);
}

function cmdRecoger() {
  const e = leerEstado();
  fs.mkdirSync(RESULTADOS, { recursive: true });
  let nuevos = 0;
  for (const [nombre, s] of Object.entries(e.tareas)) {
    if (!s.id || !idValido(s.id) || ["completada", "done", "completed"].includes(s.estado)) continue;
    const { out, err } = ssh(`${HERMES} kanban show ${s.id}`);
    if (!out.trim()) {
      console.log(`· ${nombre} (${s.id}): sin respuesta ${err.trim().slice(0, 120)}`);
      continue;
    }
    const json = extraerJson(out);
    const estado = json?.status ?? "desconocido";
    s.estado = estado;
    const resultado = json?.result ?? null;
    const cabecera = `---\ntarea: ${nombre}\nid: ${s.id}\nperfil: ${s.perfil}\nestado: ${estado}\nrecogido: ${new Date().toISOString()}\nrevision_claude: pendiente\n---\n`;
    const cuerpo = resultado
      ? (typeof resultado === "string" ? resultado : JSON.stringify(resultado, null, 2))
      : `(Sin resultado todavía. Respuesta cruda de Hermes:)\n\n\`\`\`\n${out.trim().slice(0, 6000)}\n\`\`\``;
    fs.writeFileSync(path.join(RESULTADOS, `${nombre}.md`), cabecera + "\n" + cuerpo + "\n");
    console.log(`· ${nombre} (${s.id}): ${estado}${resultado ? " — resultado guardado" : ""}`);
    if (resultado) nuevos++;
  }
  guardarEstado(e);
  if (flag("commit") && nuevos > 0) {
    for (const g of [["add", "docs/hermes"], ["commit", "-m", "chore(hermes): resultados recogidos de Hermes (pendientes de revisión)"], ["push"]]) {
      const r = spawnSync("git", g, { cwd: ROOT, stdio: "inherit" });
      if (r.status !== 0) return console.error(`git ${g[0]} falló; revísalo a mano.`);
    }
  }
}

function cmdExplorar() {
  const consultas = [
    `${HERMES} --help`,
    `${HERMES} kanban --help`,
    `${HERMES} profile --help`,
    `${HERMES} skills --help`,
    "ls -1 /opt/data /opt/data/workspace /opt/data/workspace/proyectos",
  ];
  const salida = ["# Descubrimiento de Hermes (solo lectura)", `Fecha: ${new Date().toISOString()}`, ""];
  for (const c of consultas) {
    const { out, err } = ssh(`${c} 2>&1 || true`);
    salida.push(`## ${c}`, "```", (out || err).trim().slice(0, 5000), "```", "");
    console.log(`✔ ${c}`);
  }
  const archivo = path.join(DIR, "descubrimiento.md");
  fs.writeFileSync(archivo, salida.join("\n"));
  console.log(`\nGuardado en ${path.relative(ROOT, archivo)}. Pégalo en el chat (o súbelo con git) para que Claude diseñe los perfiles con comandos reales.`);
}

try {
  if (cmd === "estado") cmdEstado();
  else if (cmd === "enviar") cmdEnviar();
  else if (cmd === "recoger") cmdRecoger();
  else if (cmd === "explorar") cmdExplorar();
  else console.log("Uso: node scripts/hermes/cola.mjs <estado|enviar|recoger|explorar> [--ensayo] [--solo nombre] [--reenviar] [--commit]");
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exit(1);
}
