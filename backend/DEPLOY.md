# Guía Rápida: Desplegar en Render

## 📋 Checklist Pre-Despliegue

- [ ] Código subido a GitHub/GitLab
- [ ] Archivo `render.yaml` en la raíz del proyecto
- [ ] `.gitignore` excluye archivos sensibles
- [ ] Credenciales de Firebase listas (del archivo serviceAccountKey.json)

## 🚀 Pasos para Desplegar

### 1. Crear Servicio en Render

1. Ve a [render.com](https://render.com)
2. Crea una cuenta o inicia sesión
3. Click en **"New +"** → **"Web Service"**
4. Conecta tu repositorio de GitHub/GitLab
5. Selecciona el repositorio `InventarioBackend`
6. Render detectará automáticamente la configuración desde `render.yaml`

### 2. Configurar Variables de Entorno

En el dashboard de Render, ve a **"Environment"** y añade estas variables:

#### Variables Requeridas:

```
NODE_ENV=production

FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...tu clave privada completa...
-----END PRIVATE KEY-----

ALLOWED_ORIGINS=https://tu-frontend.onrender.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### ⚠️ Importante para FIREBASE_PRIVATE_KEY:

1. Abre tu archivo `serviceAccountKey.json`
2. Copia el valor COMPLETO de `private_key`
3. Incluye los delimitadores `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
4. Los `\n` deben estar como texto literal (Render los procesará automáticamente)

**Ejemplo:**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...
...resto de la clave...
...varias líneas...
-----END PRIVATE KEY-----
```

### 3. Obtener Credenciales de Firebase

Abre tu archivo `serviceAccountKey.json` y localiza:

```json
{
  "project_id": "mi-proyecto-12345",           // → FIREBASE_PROJECT_ID
  "client_email": "firebase-adminsdk-...",      // → FIREBASE_CLIENT_EMAIL
  "private_key": "-----BEGIN PRIVATE KEY..."    // → FIREBASE_PRIVATE_KEY
}
```

### 4. Iniciar Despliegue

1. Haz clic en **"Create Web Service"**
2. Render comenzará a:
   - Clonar tu repositorio
   - Ejecutar `npm install`
   - Ejecutar `npm start`
3. Espera 2-5 minutos para el primer despliegue

### 5. Verificar Funcionamiento

Una vez desplegado, prueba tu API:

```bash
# Reemplaza con tu URL de Render
curl https://tu-servicio.onrender.com/api/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Servidor funcionando correctamente",
  "timestamp": "2025-12-19T...",
  "environment": "production"
}
```

## 🔧 Configuración Adicional

### Actualizar ALLOWED_ORIGINS

Cuando tengas tu frontend desplegado, actualiza la variable `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://tu-frontend.onrender.com
```

### Auto-Deploy

Render desplegará automáticamente cuando hagas push a tu rama principal (main/master).

Para desactivar:
- Ve a **Settings** → **Build & Deploy**
- Desactiva **"Auto-Deploy"**

## ⚠️ Limitaciones del Plan Gratuito

- ⏰ El servicio se **dormirá** después de 15 minutos sin actividad
- 🐢 La primera solicitud después de dormir puede tardar **30-60 segundos**
- 💾 **750 horas** de uso gratuito por mes (suficiente para proyectos personales)

### Solución: Mantener el servicio activo

Puedes usar un servicio como [Uptime Robot](https://uptimerobot.com/) o [Cron-job.org](https://cron-job.org) para hacer ping cada 10-14 minutos:

```
https://tu-servicio.onrender.com/api/health
```

## 🐛 Solución de Problemas

### Error: Firebase Admin no inicializa

**Síntoma:** Logs muestran "Error al inicializar Firebase Admin"

**Solución:**
1. Verifica que `FIREBASE_PRIVATE_KEY` tenga el formato correcto
2. Asegúrate de incluir `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
3. Los `\n` deben estar como texto literal, NO como saltos de línea reales

### Error: CORS

**Síntoma:** Frontend muestra "CORS policy blocked"

**Solución:**
1. Ve a Environment variables en Render
2. Actualiza `ALLOWED_ORIGINS` con la URL EXACTA de tu frontend
3. No incluyas la barra final: ✅ `https://app.com` ❌ `https://app.com/`

### Error: Cannot GET /

**Síntoma:** La raíz del servicio muestra error 404

**Solución:**
- Esto es normal, las rutas de la API están bajo `/api/`
- Prueba: `https://tu-servicio.onrender.com/api/health`

### Servicio muy lento

**Síntoma:** Primera petición tarda más de 30 segundos

**Solución:**
- Es normal en el plan gratuito cuando el servicio está dormido
- Considera actualizar al plan Starter ($7/mes) para servicio activo 24/7
- O usa un servicio de ping cada 10-14 minutos

### Ver Logs en Tiempo Real

1. Ve al dashboard de tu servicio en Render
2. Click en **"Logs"** en el menú lateral
3. Filtra por tipo: `Deploy`, `Runtime`, `All`

## 🎯 Próximos Pasos

Una vez desplegado:

1. ✅ Prueba todos los endpoints con Postman/Insomnia
2. ✅ Conecta tu frontend actualizando la URL de la API
3. ✅ Configura dominios personalizados (opcional, en Settings)
4. ✅ Monitorea logs y métricas en el dashboard

## 📚 Recursos

- [Documentación de Render](https://render.com/docs)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express-app)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

¿Problemas? Revisa los logs en Render o contacta al equipo de desarrollo.
