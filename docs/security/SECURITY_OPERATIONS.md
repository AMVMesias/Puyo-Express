# Operación segura

## Arranque y parada

Desde WSL Ubuntu, en la raíz del proyecto:

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose down
```

No se debe iniciar Vite ni Spring Boot manualmente mientras Compose esté activo. El frontend se consulta en `http://127.0.0.1:8088`.

## Revisión diaria básica

```bash
docker compose ps
docker compose logs --since 24h backend
docker compose logs --since 24h backend | grep SECURITY_AUDIT
```

Revisar reinicios inesperados, estados no saludables, fallos repetidos de autenticación, respuestas 401/403/413/5xx y cambios no autorizados de pedidos. Los logs no deben copiarse a canales públicos porque contienen identificadores, IP y rutas, aunque excluyen secretos y PII sensible.

## Gestión de secretos

- Crear secretos con `scripts/initialize-secrets.ps1`; nunca escribirlos en README, `.env`, tickets o logs.
- Mantener `secrets/` fuera de Git y limitar sus permisos en el host.
- No borrar la clave AES mientras existan datos cifrados.
- Una rotación AES exige: backup, clave anterior disponible, migración controlada, validación de descifrado y retirada posterior de la clave antigua.
- Tras sospecha de robo del secreto JWT, reemplazarlo y reiniciar el backend; las sesiones existentes quedarán invalidadas.
- Tras sospecha de robo de la contraseña de BD, cambiarla coordinadamente en PostgreSQL y Docker secret.

## Cambios y actualizaciones

Antes de desplegar:

```bash
docker compose build --pull
docker compose config --quiet
cd backend && ./mvnw test
```

En Windows, la prueba equivalente es `cd backend; .\mvnw.cmd test`. Además, ejecutar `npm run lint` dentro de `frontend` y repetir [SECURITY_VERIFICATION.md](SECURITY_VERIFICATION.md). Revisar especialmente puertos publicados, cabeceras, tamaño máximo y logs.

## Backup y recuperación

El proyecto aún no automatiza backups. Antes de producción debe definirse un trabajo externo que:

1. Genere backup consistente de PostgreSQL.
2. Lo cifre con una clave distinta de la clave de datos de la aplicación.
3. Lo copie fuera del host con retención y acceso mínimo.
4. Registre resultado sin incluir datos sensibles.
5. Pruebe restauración periódicamente y mida RPO/RTO.

Un archivo de backup sin prueba de restauración no se considera un control verificado.

## Respuesta a incidentes

1. Contener: retirar acceso público o enlazar el puerto a loopback sin destruir volúmenes.
2. Preservar: exportar logs, tiempos, hashes de imágenes y configuración efectiva sin copiar secretos.
3. Identificar: cuentas, pedidos, endpoints, IP, request ID y periodo afectados.
4. Erradicar: corregir la causa, actualizar imágenes y rotar únicamente los secretos comprometidos con su procedimiento.
5. Recuperar: restaurar datos validados, desplegar y ejecutar todas las verificaciones.
6. Aprender: documentar causa raíz, alcance, controles fallidos y acciones con responsables/fecha.

No ejecutar `docker compose down -v` durante un incidente: eliminaría el volumen de datos y puede destruir evidencia.

## Paso a producción

- Reverse proxy administrado con TLS moderno y redirección HTTP a HTTPS.
- Solo 443 público; PostgreSQL y backend permanecen internos.
- `CORS_ALLOWED_ORIGINS` con el dominio exacto y `JWT_SECURE_COOKIE=true`.
- Backups, colector de logs, alertas, rate limiting y monitorización.
- Supervisión del consumo de teselas y cumplimiento de la política de OpenStreetMap; para tráfico elevado, contratar o alojar un proveedor de teselas con SLA.
- Verificación administrativa de cifrado de disco, actualizaciones y cuentas con MFA.
