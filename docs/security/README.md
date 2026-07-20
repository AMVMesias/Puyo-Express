# Seguridad de Puyo Express

Este directorio reúne el estado de seguridad **realmente implementado y verificable** de Puyo Express al 14 de julio de 2026. Los controles marcados como pendientes no deben presentarse como activos en producción.

## Estado resumido

| Área | Estado actual |
|---|---|
| Contraseñas | BCrypt con costo 12 |
| Datos sensibles | Teléfonos y direcciones cifrados con AES-256-GCM |
| Sesiones | JWT firmado en cookie HttpOnly y SameSite=Lax |
| Autorización | Spring Security, roles y validación de transiciones de pedidos |
| Auditoría | Eventos de autenticación y solicitudes en `SECURITY_AUDIT`, sin cuerpos ni secretos |
| Red | Solo frontend en `127.0.0.1:8088`; backend y PostgreSQL internos |
| Contenedores | Usuario no root, filesystem de solo lectura, capacidades eliminadas y límites de procesos |
| HTTP | Gateway mínimo sin banner `Server`; CSP y cabeceras defensivas; solicitudes limitadas a 1 MiB |
| Host revisado | Firewall, Defender, SMBv1, sistema y puertos; BitLocker no verificado |
| Producción externa | Pendiente TLS, cookie Secure, backups, centralización de logs y controles operativos |

## Documentos

- [Arquitectura y límites de confianza](SECURITY_ARCHITECTURE.md)
- [Matriz completa de controles](SECURITY_CONTROLS.md)
- [Inventario y decisiones criptográficas](ASSET_INVENTORY.md)
- [Modelo de amenazas y riesgos pendientes](THREAT_MODEL.md)
- [Operación segura y respuesta a incidentes](SECURITY_OPERATIONS.md)
- [Procedimiento de verificación](SECURITY_VERIFICATION.md)
- [Resultado del hardening del host](SERVER_HARDENING_REPORT.md)

## Significado de los estados

- **Implementado:** existe en código o configuración y puede verificarse.
- **Implementado local:** protege el despliegue actual en la máquina, pero necesita configuración adicional para exposición pública.
- **No verificado:** el control puede existir en el host, pero no se obtuvo evidencia suficiente.
- **Pendiente:** todavía requiere implementación; aparece para no confundir una recomendación con una protección activa.
