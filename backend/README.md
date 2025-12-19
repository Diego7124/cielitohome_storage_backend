# Backend - Sistema de Inventario

API REST completa para el Sistema de Inventario, construida con Node.js, Express y Firebase Admin SDK.

## 🚀 Características

- **Autenticación** con Firebase Auth (verificación de tokens)
- **Autorización** basada en roles (admin, inventario, usuario)
- **Control de acceso** por áreas
- **Rate limiting** para protección contra ataques
- **Logging** con Winston
- **Validación de datos** con express-validator
- **Manejo centralizado de errores**

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── firebase.js        # Configuración de Firebase Admin
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── productos.controller.js
│   │   ├── areas.controller.js
│   │   ├── usuarios.controller.js
│   │   ├── movimientos.controller.js
│   │   ├── reportes.controller.js
│   │   └── dashboard.controller.js
│   ├── middleware/
│   │   ├── auth.js            # Middleware de autenticación
│   │   └── errorHandler.js    # Manejo de errores
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── productos.routes.js
│   │   ├── areas.routes.js
│   │   ├── usuarios.routes.js
│   │   ├── movimientos.routes.js
│   │   ├── reportes.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/
│   │   └── logger.js          # Configuración de Winston
│   └── server.js              # Punto de entrada
├── logs/                      # Archivos de log (generados automáticamente)
├── .env.example               # Variables de entorno de ejemplo
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Instalación

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

### 3. Configurar Firebase Admin SDK

#### Opción A: Usar archivo de credenciales (Recomendado)

1. Ve a la consola de Firebase: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** > **Cuentas de servicio**
4. Haz clic en **Generar nueva clave privada**
5. Guarda el archivo como `serviceAccountKey.json` en la carpeta `backend/`
6. En `.env`, configura:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   ```

#### Opción B: Usar variables de entorno

En `.env`, configura:
```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Iniciar el servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

El servidor estará disponible en `http://localhost:5000`

## 📡 Endpoints de la API

### Health Check
- `GET /api/health` - Verificar estado del servidor

### Autenticación
- `POST /api/auth/verify` - Verificar token de Firebase
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/register` - Registrar usuario en Firestore

### Productos
- `GET /api/productos` - Obtener todos los productos
- `GET /api/productos/:id` - Obtener producto por ID
- `GET /api/productos/area/:area` - Obtener productos por área
- `GET /api/productos/stock/bajo` - Obtener productos con stock bajo
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto
- `POST /api/productos/:id/descontar` - Descontar stock

### Áreas
- `GET /api/areas` - Obtener todas las áreas
- `GET /api/areas/:id` - Obtener área por ID
- `POST /api/areas` - Crear área (Admin)
- `PUT /api/areas/:id` - Actualizar área (Admin)
- `DELETE /api/areas/:id` - Eliminar área (Admin)

### Usuarios
- `GET /api/usuarios` - Obtener todos los usuarios (Admin)
- `GET /api/usuarios/me` - Obtener usuario actual
- `GET /api/usuarios/:id` - Obtener usuario por ID (Admin)
- `POST /api/usuarios` - Crear usuario (Admin)
- `PUT /api/usuarios/:id` - Actualizar usuario (Admin)
- `DELETE /api/usuarios/:id` - Eliminar usuario (Admin)

### Movimientos
- `GET /api/movimientos` - Obtener movimientos (paginado)
- `GET /api/movimientos/area/:area` - Movimientos por área
- `GET /api/movimientos/usuario/:email` - Movimientos por usuario
- `GET /api/movimientos/fecha` - Movimientos por rango de fechas
- `GET /api/movimientos/estadisticas` - Estadísticas (Admin)
- `POST /api/movimientos` - Crear movimiento

### Reportes
- `GET /api/reportes/inventario` - Reporte de inventario
- `GET /api/reportes/movimientos` - Reporte de movimientos (Admin)
- `GET /api/reportes/stock-bajo` - Reporte de stock bajo
- `GET /api/reportes/por-area` - Reporte por área
- `GET /api/reportes/actividad-usuarios` - Actividad de usuarios (Admin)

### Dashboard
- `GET /api/dashboard/kpis` - KPIs principales
- `GET /api/dashboard/resumen` - Resumen completo
- `GET /api/dashboard/alertas` - Alertas de stock
- `GET /api/dashboard/tendencias` - Tendencias de movimientos

## 🔐 Autenticación

Todas las rutas protegidas requieren un token de Firebase en el header:

```
Authorization: Bearer <firebase-id-token>
```

### Obtener token en el frontend:

```javascript
import { auth } from './firebase';

// Obtener el token del usuario actual
const token = await auth.currentUser.getIdToken();

// Usar en las peticiones
fetch('/api/productos', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 👥 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso completo a todas las funciones |
| `inventario` | CRUD de productos, descontar stock, ver historial |
| `usuario` | Solo lectura de productos en áreas permitidas |

## 🔧 Variables de Entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto del servidor | 5000 |
| `NODE_ENV` | Ambiente (development/production) | development |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al archivo de credenciales | - |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase | - |
| `FIREBASE_CLIENT_EMAIL` | Email de la cuenta de servicio | - |
| `FIREBASE_PRIVATE_KEY` | Clave privada | - |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos | http://localhost:3000 |
| `RATE_LIMIT_WINDOW_MS` | Ventana de rate limiting (ms) | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requests por ventana | 100 |

## 📝 Ejemplos de Uso

### Crear producto
```bash
curl -X POST http://localhost:5000/api/productos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "area": "Almacén",
    "nombre": "Producto Test",
    "cantidad": 100,
    "precio": 50.00
  }'
```

### Descontar stock
```bash
curl -X POST http://localhost:5000/api/productos/<id>/descontar \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 5}'
```

### Obtener KPIs del dashboard
```bash
curl http://localhost:5000/api/dashboard/kpis \
  -H "Authorization: Bearer <token>"
```

## 🐛 Manejo de Errores

Todos los errores siguen el formato:

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [] // Solo en errores de validación
}
```

Códigos de estado comunes:
- `200` - Éxito
- `201` - Creado
- `400` - Error de validación
- `401` - No autenticado
- `403` - No autorizado
- `404` - No encontrado
- `429` - Demasiadas solicitudes
- `500` - Error del servidor

## � Despliegue en Render

### Pasos para desplegar:

1. **Preparación del repositorio**
   - Asegúrate de que tu código esté en un repositorio de GitHub/GitLab
   - Verifica que el archivo `render.yaml` esté en la raíz del proyecto
   - Confirma que `.gitignore` excluya `node_modules`, `.env` y `serviceAccountKey.json`

2. **Crear servicio en Render**
   - Ve a [Render.com](https://render.com) y crea una cuenta
   - Haz clic en "New +" y selecciona "Web Service"
   - Conecta tu repositorio de GitHub/GitLab
   - Render detectará automáticamente `render.yaml`

3. **Configurar variables de entorno**
   
   En el dashboard de Render, ve a "Environment" y añade:
   
   ```
   NODE_ENV=production
   FIREBASE_PROJECT_ID=tu-proyecto-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_CLAVE...\n-----END PRIVATE KEY-----
   ALLOWED_ORIGINS=https://tu-frontend.onrender.com
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

   **Importante sobre FIREBASE_PRIVATE_KEY:**
   - Copia el valor completo de `private_key` desde `serviceAccountKey.json`
   - Incluye `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
   - Los `\n` deben mantenerse como texto literal (Render los procesará)

4. **Obtener credenciales de Firebase**
   ```bash
   # En tu serviceAccountKey.json encontrarás:
   {
     "project_id": "...",           # -> FIREBASE_PROJECT_ID
     "client_email": "...",          # -> FIREBASE_CLIENT_EMAIL
     "private_key": "..."            # -> FIREBASE_PRIVATE_KEY
   }
   ```

5. **Verificar despliegue**
   - Render construirá e iniciará el servicio automáticamente
   - Prueba el endpoint: `https://tu-servicio.onrender.com/api/health`
   - Revisa los logs en el dashboard si hay errores

### Notas importantes:

- **Plan gratuito:** El servicio se dormirá después de 15 minutos de inactividad
- **Primera solicitud:** Puede tardar 30-60 segundos en despertar
- **CORS:** Actualiza `ALLOWED_ORIGINS` con la URL de tu frontend
- **Logs:** Disponibles en el dashboard de Render en tiempo real
- **Auto-deploy:** Render desplegará automáticamente cuando hagas push a la rama principal

### Solución de problemas:

- **Error de Firebase:** Verifica que `FIREBASE_PRIVATE_KEY` tenga el formato correcto con `\n`
- **CORS error:** Añade la URL exacta de tu frontend a `ALLOWED_ORIGINS`
- **Servicio inactivo:** El plan gratuito se duerme, la primera petición tardará más

## �📄 Licencia

ISC
