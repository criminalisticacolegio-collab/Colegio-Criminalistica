import type { APIRoute } from 'astro';
// El HTML del Studio se importa en tiempo de build (sanity build corre antes que astro build)
import studioHTML from '../../public/admin-colegio/index.html?raw';

export const GET: APIRoute = () =>
  new Response(studioHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
