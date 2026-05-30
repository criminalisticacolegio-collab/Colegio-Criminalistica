/**
 * Script one-shot: sincroniza todos los matriculados de Sanity → Firebase Auth.
 * Lógica de 4 pasos: UID guardado → email → numeroMatricula → crear.
 * Ejecutar: node scripts/sync-firebase.mjs
 */

import { createClient } from '@sanity/client';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Cargar .env ──────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
const envVars = {};
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
});

// ── Firebase Admin ───────────────────────────────────────────
const svcAccount = JSON.parse(envVars.FIREBASE_SERVICE_ACCOUNT);
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(svcAccount) });
const auth = getAuth(app);

// ── Sanity ───────────────────────────────────────────────────
const sanity = createClient({
  projectId: envVars.PUBLIC_SANITY_PROJECT_ID || '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: envVars.SANITY_API_WRITE_TOKEN,
});

// ── Fetch matriculados ────────────────────────────────────────
console.log('Obteniendo matriculados de Sanity...');
const matriculados = await sanity.fetch(`
  *[_type == "matriculado" && defined(email) && defined(numeroMatricula)]{
    _id, email, nombreCompleto, numeroMatricula, estado, firebaseUid,
    "especialidad": especialidad->titulo,
    "jurisdiccion": jurisdiccion->titulo
  }
`);
console.log(`Total encontrados: ${matriculados.length}\n`);

let creados = 0, actualizados = 0, errores = 0;

for (const mat of matriculados) {
  const email = mat.email?.trim().toLowerCase();
  if (!email) continue;

  try {
    let uid = null;

    // Paso 1: por UID guardado en Sanity
    if (mat.firebaseUid) {
      try {
        const u = await auth.getUser(mat.firebaseUid);
        uid = u.uid;
        const upd = { displayName: mat.nombreCompleto };
        if (u.email !== email) { upd.email = email; process.stdout.write(`  → email actualizado: ${u.email} → ${email}\n`); }
        await auth.updateUser(uid, upd);
      } catch { uid = null; }
    }

    // Paso 2: por email actual
    if (!uid) {
      try {
        const u = await auth.getUserByEmail(email);
        uid = u.uid;
        await auth.updateUser(uid, { displayName: mat.nombreCompleto });
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }
    }

    // Paso 3: por numeroMatricula en claims (email cambió)
    if (!uid) {
      let pt;
      do {
        const page = await auth.listUsers(1000, pt);
        for (const u of page.users) {
          if (u.customClaims?.numeroMatricula === mat.numeroMatricula) {
            uid = u.uid;
            const upd = { displayName: mat.nombreCompleto };
            if (u.email !== email) { upd.email = email; process.stdout.write(`  → email corregido por matrícula: ${u.email} → ${email}\n`); }
            await auth.updateUser(uid, upd);
            break;
          }
        }
        pt = page.pageToken;
      } while (pt && !uid);
    }

    // Paso 4: crear cuenta nueva
    if (!uid) {
      const created = await auth.createUser({
        email,
        password: mat.numeroMatricula,
        displayName: mat.nombreCompleto,
        disabled: false,
      });
      uid = created.uid;
      process.stdout.write(`✓ creado:      ${email}  (pass: ${mat.numeroMatricula})\n`);
      creados++;
    } else {
      process.stdout.write(`↻ actualizado: ${email}\n`);
      actualizados++;
    }

    // Claims
    await auth.setCustomUserClaims(uid, {
      numeroMatricula: mat.numeroMatricula,
      estado: mat.estado || 'Activo',
      especialidad: mat.especialidad || null,
      jurisdiccion: mat.jurisdiccion || null,
    });

    // Guardar UID en Sanity para futuros lookups
    if (mat.firebaseUid !== uid) {
      await sanity.patch(mat._id).set({ firebaseUid: uid }).commit();
    }

  } catch (err) {
    process.stdout.write(`✗ error:       ${email} → ${err.message}\n`);
    errores++;
  }
}

console.log(`\n══════════════════════════════════`);
console.log(`Creados:      ${creados}`);
console.log(`Actualizados: ${actualizados}`);
console.log(`Errores:      ${errores}`);
console.log(`══════════════════════════════════`);

// Correr el sync para guardar los UIDs en Sanity
process.exit(0);
