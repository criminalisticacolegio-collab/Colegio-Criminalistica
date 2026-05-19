import { db } from '../../lib/firebase-server.js';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { enviarCertificadoCurso } from '../../lib/email.js';

export const prerender = false;

export const POST = async ({ request }) => {
  // Requiere ADMIN_SECRET en el header Authorization
  const authHeader = request.headers.get('Authorization') || '';
  const adminSecret = import.meta.env.ADMIN_SECRET || '';
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return json({ error: 'No autorizado' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { cursoKey, email } = body;

  if (!cursoKey || !email) {
    return json({ error: 'Requeridos: cursoKey, email' }, 400);
  }

  const enrollId = `${cursoKey}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const enrollRef = doc(collection(db, 'inscripciones'), enrollId);
  const snap = await getDoc(enrollRef);

  if (!snap.exists()) {
    return json({ error: 'Inscripción no encontrada' }, 404);
  }

  const data = snap.data();
  const fechaCompletado = new Date().toISOString();

  await updateDoc(enrollRef, {
    estado: 'COMPLETADO',
    fechaCompletado,
  });

  try {
    await enviarCertificadoCurso({
      nombre: data.nombre || email,
      email,
      cursoTitulo: data.cursoTitulo || 'Curso CPC CTM',
      fecha: new Date(fechaCompletado),
    });
  } catch (err) {
    console.error('[completar-curso] Error enviando certificado:', err);
    return json({ success: true, warning: 'Estado actualizado pero falló el envío del certificado.' });
  }

  return json({ success: true, message: 'Curso marcado como completado y certificado enviado.' });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
