import { createClient } from '@sanity/client';

export const prerender = false;

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  useCdn: true,
  apiVersion: '2023-05-03',
});

export const GET = async ({ url }) => {
  const email = url.searchParams.get('email');

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const matriculado = await client.fetch(
      `*[_type == "matriculado" && lower(email) == lower($email)][0]`,
      { email }
    );

    return new Response(JSON.stringify({ exists: !!matriculado }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Sanity fetch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
