const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db = null;
let auth = null;

/**
 * Inicializa Firebase Admin SDK
 */
const initializeFirebase = () => {
  try {
    // Verificar si ya está inicializado
    if (admin.apps.length > 0) {
      db = admin.firestore();
      auth = admin.auth();
      return;
    }

    // Opción 1: Usar archivo de credenciales
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    } 
    // Opción 2: Usar variables de entorno individuales
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else {
      throw new Error('No se encontraron credenciales de Firebase. Configure GOOGLE_APPLICATION_CREDENTIALS o las variables individuales.');
    }

    db = admin.firestore();
    auth = admin.auth();

    logger.info('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    logger.error('❌ Error al inicializar Firebase Admin:', error);
    throw error;
  }
};

/**
 * Obtiene la instancia de Firestore
 */
const getFirestore = () => {
  if (!db) {
    throw new Error('Firebase no ha sido inicializado. Llama a initializeFirebase() primero.');
  }
  return db;
};

/**
 * Obtiene la instancia de Firebase Auth
 */
const getAuth = () => {
  if (!auth) {
    throw new Error('Firebase no ha sido inicializado. Llama a initializeFirebase() primero.');
  }
  return auth;
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  admin
};
