import type { APIRoute } from 'astro';
import studioHTML from '../../../public/admin-colegio/index.html?raw';

export const GET: APIRoute = () =>
  new Response(studioHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
