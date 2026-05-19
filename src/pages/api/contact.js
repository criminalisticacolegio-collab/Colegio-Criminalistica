export const prerender = false;

import { enviarConsultaContacto } from '../../lib/email.js';

export async function POST({ request }) {
  try {
    const { nombre, email, mensaje } = await request.json();

    if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
      return new Response(JSON.stringify({ error: 'Campos requeridos incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mensaje.trim().length > 2000) {
      return new Response(JSON.stringify({ error: 'El mensaje no puede superar 2000 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await enviarConsultaContacto({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      mensaje: mensaje.trim(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/contact] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno al enviar mensaje' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
