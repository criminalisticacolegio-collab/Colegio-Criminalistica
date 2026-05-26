import { MercadoPagoConfig, Preference } from 'mercadopago';

export const prerender = false;

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return res({ error: 'Cuerpo inválido' }, 400);
  }

  const { total, email } = body;

  if (!total || total <= 0) {
    return res({ error: 'Total inválido' }, 400);
  }

  const accessToken = import.meta.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res({ error: 'Los pagos estarán disponibles próximamente. Contacte al colegio: criminalisticacolegio@gmail.com' }, 503);
  }

  const origin = new URL(request.url).origin;

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            title: 'Mantenimiento Web — CPCC',
            unit_price: Number(total),
            quantity: 1,
            currency_id: 'ARS',
          },
        ],
        payer: { email: email || 'admin@colegio.com' },
        external_reference: `mantenimiento-${Date.now()}`,
        notification_url: `${origin}/api/mp-webhook`,
        back_urls: {
          success: `${origin}/mantenimiento?status=approved`,
          failure: `${origin}/mantenimiento?status=failure`,
          pending: `${origin}/mantenimiento?status=pending`,
        },
        auto_return: 'approved',
      },
    });

    return res({ id: result.id, init_point: result.init_point });
  } catch (err) {
    console.error('[pagar-mantenimiento] Error MP:', err);
    return res({ error: 'Error al crear preferencia de pago' }, 500);
  }
};

function res(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
