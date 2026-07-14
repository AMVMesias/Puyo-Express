# Matriz de controles de seguridad

Fecha de revisión: 2026-07-14.

| ID | Control | Implementación/evidencia | Estado |
|---|---|---|---|
| IAM-01 | Hash de contraseñas | `BCryptPasswordEncoder(12)` | Implementado |
| IAM-02 | Sesión firmada | JWT HMAC con secreto de 256 bits desde Docker secret | Implementado |
| IAM-03 | Cookie defensiva | HttpOnly y SameSite=Lax; Secure configurable | Implementado local |
| IAM-04 | Menor privilegio por rol | Spring Security y `@PreAuthorize` en operaciones críticas | Implementado |
| IAM-05 | Registro público controlado | Solo permite rol cliente | Implementado |
| IAM-06 | Sesiones sin estado | Política stateless; el servidor no conserva sesión HTTP | Implementado |
| DAT-01 | Cifrado de PII | AES-256-GCM para teléfonos y direcciones | Implementado |
| DAT-02 | IV único e integridad | IV aleatorio de 96 bits y tag GCM por valor | Implementado |
| DAT-03 | Migración de texto legado | Migración automática al iniciar | Implementado |
| DAT-04 | Separación de claves | JWT, AES y contraseña de BD en Docker secrets fuera de Git | Implementado |
| DAT-05 | Cifrado de disco | Auditoría no pudo verificar BitLocker sin privilegios administrativos | No verificado |
| DAT-06 | Backups cifrados y restaurados | Procedimiento recomendado, sin automatización ni evidencia de restauración | Pendiente |
| API-01 | Validación de entradas | Bean Validation en autenticación/registro y validaciones de dominio | Implementado |
| API-02 | Cálculo autoritativo | Backend recalcula precios, comisión y distancia; no confía en importes del cliente | Implementado |
| API-03 | Límite de solicitud | 1 MiB en Nginx y backend; devuelve 413 | Implementado |
| API-04 | Errores seguros | Sin stack traces ni detalles internos en respuestas de producción | Implementado |
| API-05 | CORS | Orígenes, métodos y cabeceras explícitos; credenciales controladas | Implementado |
| API-06 | CSRF | Desactivado; mitigación parcial por SameSite=Lax, CORS y proxy mismo origen | Riesgo aceptado local |
| API-07 | Rate limiting/bloqueo | No hay limitación por IP/usuario ni bloqueo progresivo demostrado | Pendiente |
| WEB-01 | Cabeceras | CSP, nosniff, frame deny, no-referrer y Permissions-Policy | Implementado |
| WEB-02 | Ocultar versiones | `server_tokens off` y cabecera upstream ocultada | Implementado |
| WEB-03 | TLS | No forma parte del Compose local | Pendiente para producción |
| LOG-01 | Auditoría de autenticación | Éxitos y fallos de login/registro/logout | Implementado |
| LOG-02 | Trazabilidad de solicitudes | Actor, IP, request ID, resultado y duración | Implementado |
| LOG-03 | Minimización de logs | No registra cuerpos, secretos ni PII operativa | Implementado |
| LOG-04 | Centralización, retención y alertas | Solo stdout de Docker actualmente | Pendiente |
| NET-01 | Exposición mínima | Solo `127.0.0.1:8088`; backend y BD sin puerto del host | Implementado |
| NET-02 | Segmentación | `app_net` y `data_net`; red de datos interna | Implementado |
| CTR-01 | Usuario no root | Imágenes de backend y frontend con usuario sin privilegios | Implementado |
| CTR-02 | Filesystem inmutable | `read_only`, `tmpfs` restrictivo | Implementado |
| CTR-03 | Privilegios mínimos | `cap_drop: ALL`, `no-new-privileges`, límite de PID | Implementado |
| CTR-04 | Cadena de suministro | Imágenes versionadas, pero no fijadas por digest ni escaneo/SBOM automatizado | Parcial |
| HOST-01 | Firewall | Todos los perfiles activos en el informe local | Verificado |
| HOST-02 | Antimalware | Defender y protección en tiempo real activos | Verificado |
| HOST-03 | Protocolo legado | SMBv1 desactivado | Verificado |
| HOST-04 | Puertos de la app | Ningún puerto de backend/BD expuesto globalmente | Verificado |

## Evidencia automatizada disponible

- Pruebas unitarias del cifrado: cifrado/descifrado, aleatoriedad y rechazo de alteraciones.
- Pruebas del filtro de tamaño: aceptación bajo el límite y respuesta 413 sobre el límite.
- Lint del frontend.
- `docker compose config`, estado/healthcheck y consultas de cabeceras/puertos.
- Script `scripts/audit-server-hardening.ps1` y su informe generado.

Los comandos exactos están en [SECURITY_VERIFICATION.md](SECURITY_VERIFICATION.md).

