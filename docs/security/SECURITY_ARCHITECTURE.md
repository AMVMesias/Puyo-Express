# Arquitectura de seguridad

## Flujo y límites de confianza

```text
Navegador
   |
   | HTTP local 127.0.0.1:8088
   v
Frontend Nginx (único puerto publicado)
   |
   | red Docker app_net
   v
Backend Spring Boot :8080
   |
   | red Docker interna data_net
   v
PostgreSQL :5432

Docker secrets ---> Backend (JWT, AES y contraseña de BD)
Backend stdout ---> logs de aplicación y SECURITY_AUDIT
```

El navegador no accede directamente al backend ni a PostgreSQL. Nginx sirve el frontend y reenvía `/api`; Docker mantiene la red de datos como interna. El despliegue actual solo escucha en loopback, por lo que no es un despliegue público.

## Autenticación y autorización

1. El usuario presenta credenciales por `/api/auth/login`.
2. La contraseña se compara con BCrypt; nunca se recupera desde su hash.
3. El backend emite un JWT firmado en una cookie HttpOnly, SameSite=Lax.
4. Cada solicitud autenticada reconstruye la identidad y sus autoridades.
5. Los controladores aplican roles `CUSTOMER`, `RESTAURANT` y `DRIVER`, además de validar las transiciones de estado de los pedidos.
6. El registro público permite clientes y repartidores. Cada repartidor obtiene un perfil operativo asociado a su usuario; el rol restaurante no puede autoasignarse.

La cookie usa `Secure=false` únicamente en el entorno HTTP local. En producción debe existir TLS y `JWT_SECURE_COOKIE=true`.

## Protección de datos

- Contraseñas: hash BCrypt con costo 12.
- Teléfono de cliente, dirección de entrega y teléfono de repartidor: AES-256-GCM con IV aleatorio por escritura y formato versionado `enc:v1:`.
- Claves: archivos de Docker secrets ignorados por Git y separados de PostgreSQL.
- Migración: al arrancar, el backend cifra valores legados que aún estén en texto plano.
- Correo: no tiene cifrado aleatorio por campo porque se usa para búsqueda y unicidad; depende de acceso restringido a BD y cifrado del disco/backups.

## Defensa HTTP

Nginx y Spring aplican controles complementarios: CSP, protección contra MIME sniffing y framing, política de referente, permisos del navegador, CORS restringido y respuestas de error sin trazas. Nginx oculta su número de versión y la cabecera del backend. Ambos niveles limitan las solicitudes a 1 MiB.

## Aislamiento de ejecución

Los contenedores de aplicación ejecutan usuarios no root, filesystem de solo lectura, `/tmp` temporal con opciones restrictivas, `no-new-privileges`, eliminación de capacidades Linux y límites de procesos. Las imágenes usan compilaciones multi-etapa para no incluir herramientas de desarrollo en tiempo de ejecución.

## Registro de seguridad

`SECURITY_AUDIT` registra autenticación, registro, cierre de sesión y solicitudes con método, ruta, estado, actor, IP de origen, identificador y duración. Se excluyen cuerpos, contraseñas, JWT, teléfonos y direcciones. Hoy los eventos viven en stdout de Docker; aún no existe un colector central inmutable.
