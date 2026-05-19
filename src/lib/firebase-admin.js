import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminAuth = null;

const svcAccountStr = import.meta.env.FIREBASE_SERVICE_ACCOUNT;

if (svcAccountStr) {
  try {
    const svcAccount = JSON.parse(svcAccountStr);
    const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(svcAccount) });
    adminAuth = getAuth(app);
  } catch (e) {
    console.warn('[firebase-admin] Inicialización fallida:', e.message);
  }
} else {
  console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT no configurado.');
}

export { adminAuth };
