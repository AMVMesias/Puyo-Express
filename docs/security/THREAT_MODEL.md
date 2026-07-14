# Modelo de amenazas y riesgos pendientes

## Alcance

Incluye navegador, frontend Nginx, API Spring Boot, PostgreSQL, contenedores, secretos y host Windows/WSL. No incluye la seguridad física, la cuenta de Google Cloud, el router ni un proxy TLS externo todavía no desplegado.

## Amenazas cubiertas

| Amenaza | Mitigaciones actuales |
|---|---|
| Robo de una copia de la base | BCrypt; AES-256-GCM para teléfonos/direcciones; clave AES fuera de la BD |
| Manipulación de datos cifrados | Tag de autenticación GCM; el descifrado falla ante alteración |
| Robo de contraseña desde BD | Hash BCrypt irreversible con costo 12 |
| Escalada de rol desde registro | Backend limita el registro a cliente/repartidor y bloquea el rol restaurante |
| Alteración de precios/estados desde frontend | Recalculo y validación autoritativa en backend; transiciones por rol |
| Acceso directo a BD/API | Puertos no publicados y segmentación de redes Docker |
| Clickjacking, MIME sniffing y carga de orígenes no previstos | X-Frame-Options, nosniff y CSP |
| Fuga de secretos en repositorio | Docker secrets y archivos locales ignorados por Git |
| Fuga de PII por logs | No se registran cuerpos, tokens, teléfonos ni direcciones |
| Contenedor comprometido | Usuario no root, solo lectura, sin capacidades y sin nuevos privilegios |
| Solicitud excesivamente grande | Límite de 1 MiB en proxy y aplicación |

## Riesgos que siguen abiertos

1. **TLS y cookie Secure:** el entorno actual es local HTTP. Antes de acceso remoto se debe terminar TLS, publicar solo 443 y activar `JWT_SECURE_COOKIE=true`.
2. **CSRF:** la API usa cookie y tiene CSRF desactivado. SameSite=Lax, CORS restringido y mismo origen reducen el riesgo, pero producción debe evaluar token CSRF o una arquitectura equivalente.
3. **Fuerza bruta y abuso:** falta rate limiting, bloqueo progresivo y alertas por repetición de fallos.
4. **Autorización por propiedad de restaurantes:** clientes y repartidores quedan vinculados a su identidad, pero el modelo todavía no vincula cada cuenta restaurante con una única entidad. Debe reforzarse antes de operar con múltiples restaurantes no confiables.
5. **Disponibilidad:** no existe evidencia de backup automatizado, cifrado de backup ni simulacro de restauración.
6. **Logs:** stdout local no aporta inmutabilidad, retención, correlación central ni alertas.
7. **Rotación de claves:** no está automatizada; cambiar la clave AES sin migración vuelve ilegibles los datos existentes.
8. **Cifrado del host:** BitLocker quedó sin verificar por falta de permisos administrativos.
9. **Cadena de suministro:** faltan fijación de imágenes por digest, SBOM y escaneo automatizado de imágenes/dependencias.
10. **Migraciones de esquema:** `ddl-auto:update` resulta práctico localmente, pero producción requiere migraciones versionadas y revisables.
11. **Correo electrónico:** permanece consultable en BD; requiere cifrado de disco, backups cifrados y permisos estrictos.
12. **Disponibilidad del mapa:** OpenStreetMap no exige una clave, pero su servicio público de teselas no ofrece SLA y puede bloquear usos intensivos. Para tráfico elevado se necesita un proveedor o servidor de teselas propio.

## Prioridad recomendada antes de producción

1. TLS, cookie Secure, dominio/origen definitivo y revisión CSRF.
2. Corregir autorización por propiedad y añadir rate limiting.
3. Backups cifrados con prueba de restauración y rotación documentada de claves.
4. Colector de logs con retención, alertas e integridad.
5. Verificar BitLocker y endurecimiento con cuenta administrativa.
6. Añadir migraciones versionadas, escaneo de dependencias/imágenes y SBOM.
