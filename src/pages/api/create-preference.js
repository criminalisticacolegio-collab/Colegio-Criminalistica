import { MercadoPagoConfig, Preference } from 'mercadopago';

export const prerender = false;

export const POST = async ({ request }) => {
  if (!import.meta.env.MP_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Los pagos estarán disponibles próximamente. Contacte al colegio: criminalisticacolegio@gmail.com' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const body = await request.json();
  const { amount, email, title } = body;

  const origin = new URL(request.url).origin;

  const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN || '',
  });

  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            title: title || 'Cuota Social Colegio',
            unit_price: Number(amount),
            quantity: 1,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: email,
        },
        // external_reference permite identificar al pagador en el webhook
        external_reference: email,
        notification_url: `${origin}/api/mp-webhook`,
        back_urls: {
          success: `${origin}/success`,
          failure: `${origin}/matriculados`,
          pending: `${origin}/matriculados`,
        },
        auto_return: 'approved',
      },
    });

    return new Response(
      JSON.stringify({ id: result.id, init_point: result.init_point }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-preference] Error MP:', error);
    return new Response(
      JSON.stringify({ error: 'Error al crear la preferencia' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
