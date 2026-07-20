# Puyo Express

Aplicación web de pedidos y entregas locales en Puyo, con paneles para clientes, restaurantes y repartidores.

## Configuración

1. Instala dependencias:
   `npm install`
2. Crea `.env` a partir de `.env.example`.
3. Configura `VITE_API_URL` con la URL del backend.
4. Ejecuta `npm run dev` solo si Docker no está activo. Cuando el despliegue Docker responde en `127.0.0.1:8088`, el script evita iniciar un segundo Vite en el puerto 3000.

La autenticación usa el backend y una cookie JWT HttpOnly.

El mapa usa Leaflet y OpenStreetMap; no necesita clave API ni cuenta de facturación. Debe conservarse visible la atribución de OpenStreetMap y respetarse su política de uso de teselas.

## Seguridad y despliegue

- [Índice y estado real de seguridad](docs/security/README.md)
- [Matriz completa de controles](docs/security/SECURITY_CONTROLS.md)
- [Arquitectura de seguridad](docs/security/SECURITY_ARCHITECTURE.md)
- [Inventario y decisiones criptográficas](docs/security/ASSET_INVENTORY.md)
- [Modelo de amenazas y riesgos pendientes](docs/security/THREAT_MODEL.md)
- [Operación segura y respuesta a incidentes](docs/security/SECURITY_OPERATIONS.md)
- [Guía de verificación técnica](docs/security/SECURITY_VERIFICATION.md)
- [Informe de auditoría de la aplicación](docs/security/SECURITY_AUDIT_REPORT.md)
- [Correcciones aplicadas y operación pendiente](docs/security/SECURITY_REMEDIATION.md)
- [Colección Postman y guía de ejecución](docs/security/POSTMAN_TESTING.md)
- [Informe de hardening del host](docs/security/SERVER_HARDENING_REPORT.md)

Para el despliegue Docker endurecido, crea `.env` desde `.env.example`, ejecuta `scripts/initialize-secrets.ps1` y luego `docker compose up --build -d`.

El usuario local del restaurante se configura con
`BOOTSTRAP_RESTAURANT_USERNAME` (por defecto `restaurante`). Su contraseña se
encuentra en `secrets/restaurant_owner_password.txt`; no se guarda en `.env`.

El Compose actual es un despliegue local: publica únicamente `127.0.0.1:8088`. Antes de exponerlo a Internet se requiere TLS, cookie Secure y completar los controles pendientes descritos en la documentación.
