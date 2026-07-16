# Guía detallada de implementación de seguridad

> Documento complementario a `SECURITY_CONTROLS.md`, `SECURITY_ARCHITECTURE.md`,
> `ASSET_INVENTORY.md`, `THREAT_MODEL.md` y `SECURITY_OPERATIONS.md`. Aquí se
> explica **cómo está construido cada control**, qué archivos lo implementan, qué
> problema resuelve, qué decisiones se tomaron, cómo se verifica, y qué
> pendientes quedan abiertos antes de exponer el sistema a Internet.

Fecha de referencia: 2026-07-14.

---

## Tabla de contenidos

1. [Visión general y arquitectura de confianza](#1-visión-general-y-arquitectura-de-confianza)
2. [Identidad, contraseñas y registro](#2-identidad-contraseñas-y-registro)
3. [Sesiones: JWT y cookie defensiva](#3-sesiones-jwt-y-cookie-defensiva)
4. [Autorización por rol y propiedad](#4-autorización-por-rol-y-propiedad)
5. [Cifrado de datos sensibles en reposo](#5-cifrado-de-datos-sensibles-en-reposo)
6. [Gestión de secretos y claves](#6-gestión-de-secretos-y-claves)
7. [Defensa HTTP: cabeceras, CORS, CSRF y tamaño](#7-defensa-http-cabeceras-cors-csrf-y-tamaño)
8. [Validación de entradas y cálculo autoritativo](#8-validación-de-entradas-y-cálculo-autoritativo)
9. [Auditoría y trazabilidad](#9-auditoría-y-trazabilidad)
10. [Errores seguros y minimización de información](#10-errores-seguros-y-minimización-de-información)
11. [Aislamiento de contenedores](#11-aislamiento-de-contenedores)
12. [Red y exposición](#12-red-y-exposición)
13. [Hardening del host Windows](#13-hardening-del-host-windows)
14. [Verificación técnica reproducible](#14-verificación-técnica-reproducida)
15. [Riesgos abiertos y trabajo pendiente](#15-riesgos-abiertos-y-trabajo-pendiente)
16. [Recomendaciones priorizadas para producción](#16-recomendaciones-priorizadas-para-producción)

---

## 1. Visión general y arquitectura de confianza

Puyo Express está pensado como una **aplicación local de tres contenedores**
publicados en una sola dirección. El navegador nunca habla directamente con la
base de datos ni con el backend: todo el tráfico sale y entra por el proxy
inverso Nginx que sirve el frontend.

```
Navegador  ──HTTP/HTTPS local──▶  Frontend Nginx  :8080   (único puerto publicado)
                                       │
                                       │ red Docker app_net
                                       ▼
                                Backend Spring Boot  :8080
                                       │
                                       │ red Docker data_net (interna)
                                       ▼
                                  PostgreSQL  :5432
```

Archivos relevantes:

- `docker-compose.yml:84-88` declara dos redes. `app_net` permite el flujo
  frontend ↔ backend; `data_net` se marca como `internal: true`, lo que en
  Docker significa que **no hay ruta hacia Internet** y que ningún contenedor
  externo al stack puede unirse a ella. Esto aísla PostgreSQL del exterior.
- `docker-compose.yml:68` publica el frontend **únicamente en `127.0.0.1:8088`**.
  El backend y PostgreSQL usan `expose:` (visible solo dentro de la red Docker,
  no mapeado al host), por lo que un atacante en la red local no llega a
  ellos.
- `docker-compose.yml:93-99` monta los secretos (`postgres_password`,
  `jwt_secret`, `data_encryption_key`) como **Docker secrets**. El backend los
  lee en `backend/docker-entrypoint.sh:8-10` desde `/run/secrets/` y los
  inyecta como variables de entorno antes de arrancar la JVM.

**Para qué sirve este diseño:** reduce la superficie de ataque a un único
proceso público (Nginx) que se mantiene stateless, no almacena sesiones y
delega el control de acceso al backend. Si Nginx cae, no se filtran datos del
backend porque nunca los tuvo. Si el backend cae, no se filtran credenciales
porque la cookie no contiene estado y la base no es accesible desde Internet.

---

## 2. Identidad, contraseñas y registro

### 2.1 Hash de contraseñas con BCrypt (costo 12)

**Problema que resuelve:** si alguien obtiene una copia de la base de datos,
no debe poder recuperar las contraseñas reales de los usuarios.

**Implementación:** `backend/src/main/java/com/puyoexpress/backend/config/SecurityConfig.java:63-65`

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
}
```

- Algoritmo: **BCrypt**, variante de Blowfish con sal aleatoria por contraseña.
- Costo: **12** (`2^12 = 4096` iteraciones). Aproximadamente 200-300 ms por
  verificación en hardware moderno, lo que vuelve impracticable un ataque
  masivo de fuerza bruta incluso si la base se filtra.
- La sal se incluye en el propio hash, por lo que dos usuarios con la misma
  contraseña tienen hashes diferentes.
- El `PasswordEncoder` se inyecta en `AuthService.java:114` y se usa con
  `passwordEncoder.encode(...)`. La verificación la hace Spring automáticamente
  en `DaoAuthenticationProvider` (`SecurityConfig.java:67-73`).

**Para qué sirve:** protege credenciales aun cuando la base se vea comprometida.
El hash es **irreversible** por diseño: no se puede descifrar, solo comparar.

**Limitación consciente:** BCrypt trunca contraseñas a 72 bytes. El backend
impide contraseñas mayores con la validación de `RegisterRequest` (máx. 120,
pero BCrypt solo usará los primeros 72). En la práctica esto no es un
problema, pero conviene saberlo.

### 2.2 Validación de credenciales en login

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/dto/LoginRequest.java`

```java
@NotBlank(message = "El usuario o correo es obligatorio")
private String username;

@NotBlank(message = "La contraseña es obligatoria")
private String password;
```

- `username` acepta **usuario o correo** (la búsqueda se hace primero por
  username y luego por email, ver `UserDetailsServiceImpl.java:28-32`).
- `password` se valida como no vacío pero **sin política de complejidad**:
  esa decisión se delega al usuario y al hasheo (BCrypt neutraliza contraseñas
  triviales a nivel de almacenamiento, no de suplantación).

### 2.3 Registro público controlado

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/service/AuthService.java:80-140`

El registro es la pieza que **evita la escalada de privilegios** desde el
exterior. Sin ella, cualquiera podría crear una cuenta con `ROLE_ADMIN` (si
existiera) o `ROLE_RESTAURANT` y empezar a manipular pedidos.

```java
role = ERole.valueOf(normalizedRole);
if (role != ERole.ROLE_CUSTOMER && role != ERole.ROLE_DRIVER) {
    throw new IllegalArgumentException(
        "El registro público solo permite cuentas de cliente o repartidor."
    );
}
```

- **Solo** se permiten los roles `CUSTOMER` y `DRIVER`. El rol `RESTAURANT`
  no es autoasignable; debe crearse por un administrador en base de datos.
- La normalización `trim().toUpperCase()` y el prefijo `ROLE_` se aplican
  para aceptar tanto `"CUSTOMER"` como `"ROLE_CUSTOMER"` y rechazar valores
  arbitrarios.
- Antes de crear el usuario se valida unicidad de `username` y `email`
  (constraints únicos en `User.java:14-17` más verificación previa en
  `AuthService.java:84-89`).
- Si el rol es `DRIVER`, se crea automáticamente un perfil de repartidor
  asociado (`AuthService.java:120-132`) con coordenadas iniciales en Puyo,
  vehículo "moto", rating 5.0 y estado "offline". Esto ata la cuenta de
  usuario al perfil operativo desde el primer momento.

**Para qué sirve:** un atacante que se registra no puede saltarse al panel
de restaurantes ni manipular pedidos ajenos. La asociación automática
driver ↔ user impide además que un driver se haga pasar por otro.

---

## 3. Sesiones: JWT y cookie defensiva

### 3.1 Generación del token

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/security/JwtUtils.java:89-97`

```java
public String generateToken(String username, String role) {
    return Jwts.builder()
            .subject(username)
            .claim("role", role)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(getSigningKey())
            .compact();
}
```

- **Algoritmo:** HMAC-SHA. La clave se deriva en `getSigningKey()`
  (`JwtUtils.java:151-154`) decodificando Base64 el secreto configurado en
  `app.jwt.secret` y pasando esos bytes a `Keys.hmacShaKeyFor`.
- **Claims:** `sub` = username, `role` = autoridad Spring, `iat` y `exp`
  con expiración de 24h (`JWT_EXPIRATION_MS=86400000` en `.env.example`).
- **Firma:** HS256 por defecto (la lib JJWT elige el algoritmo según el
  tamaño de la clave: 256 bits → HS256, 384 → HS384, 512 → HS512). Con 32
  bytes (256 bits) del script de secretos, el token queda firmado con HS256.

### 3.2 Cookie con flags defensivos

**Archivo:** `JwtUtils.java:61-71`

```java
return ResponseCookie.from(cookieName, token)
        .path("/")
        .maxAge(jwtExpirationMs / 1000)
        .httpOnly(true)        // JavaScript del navegador NO puede leerla
        .secure(secureCookie)  // Solo se envía por HTTPS si true
        .sameSite("Lax")       // No se envía en cross-site POSTs
        .build();
```

| Flag | Valor | Por qué |
|---|---|---|
| `HttpOnly` | `true` | Mitiga XSS: un script inyectado en la página no puede robar el token. |
| `SameSite=Lax` | fijo | Mitiga CSRF en envíos cross-site de tipo POST. |
| `Secure` | configurable | En local es `false`; en producción **debe ser `true`** (`JWT_SECURE_COOKIE=true`). |
| `Path=/` | fijo | La cookie se envía a todas las rutas del backend. |
| `Max-Age` | 24h | Igual a la expiración del JWT, alineando caducidad. |

**Limitación documentada:** mientras `JWT_SECURE_COOKIE=false` (modo HTTP
local), la cookie viaja en texto claro dentro del propio host. Es aceptable
porque sólo escucha en `127.0.0.1`, pero **no debe desplegarse así** en
Internet (ver `THREAT_MODEL.md` §1).

### 3.3 Validación por cookie en cada solicitud

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/security/JwtAuthFilter.java:38-67`

```java
String jwt = jwtUtils.getJwtFromCookies(request);

if (jwt != null && jwtUtils.validateToken(jwt)) {
    String username = jwtUtils.getUsernameFromToken(jwt);
    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
    // ...construye autenticación y la pone en SecurityContext
}
```

- El filtro **lee exclusivamente de la cookie** (`getJwtFromCookies`), no de
  un header `Authorization`. Esto centraliza el transporte del token y
  elimina la posibilidad de tokens duplicados por ambos canales.
- `validateToken` (`JwtUtils.java:126-146`) distingue cinco excepciones
  específicas (firma inválida, malformado, expirado, no soportado, claims
  vacíos) y las registra en el log sin filtrar el contenido del token.
- Si la validación pasa, se reconstruye el `UserDetails` desde la base (no
  del JWT) y se le asignan las autoridades. Esto significa que **si un
  usuario cambia de rol, el token anterior queda automáticamente obsoleto**
  porque al reconstruir el contexto se usa el rol vigente en BD.

**Para qué sirve:** evita el clásico problema de "tokens viejos con
privilegios revocados" sin necesidad de listas de revocación.

### 3.4 Logout

**Archivo:** `JwtUtils.java:76-84` + `AuthController.java:83-93`

El logout **no invalida el JWT en el servidor** (la API es stateless y no
mantiene un denylist). En su lugar, devuelve una cookie "vacía" con
`Max-Age=0` que el navegador elimina. El token seguiría siendo
criptográficamente válido hasta su `exp`, pero como ya no está en el
navegador, no puede presentarse de nuevo.

**Limitación consciente:** un atacante que robó la cookie antes del logout
podría seguir usándola hasta `exp`. Esto se mitiga porque: (a) la cookie es
`HttpOnly`, así que solo se roba con acceso al equipo; (b) la expiración
es corta (24h). Para una revocación inmediata, habría que añadir un
denylist (Redis o tabla `revoked_jwts`) o cambiar a tokens opacos con
estado en servidor.

---

## 4. Autorización por rol y propiedad

### 4.1 Separación de rutas por rol

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/config/SecurityConfig.java:132-144`

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

    .requestMatchers("/api/customer/**").hasAuthority("ROLE_CUSTOMER")
    .requestMatchers("/api/restaurant/**").hasAuthority("ROLE_RESTAURANT")
    .requestMatchers("/api/driver/**").hasAuthority("ROLE_DRIVER")

    .anyRequest().authenticated()
)
```

- Las rutas `/api/auth/**` son públicas (login, register, logout, /me).
- Las rutas por rol están segregadas por prefijo. Un cliente que intenta
  `GET /api/restaurant/admin/orders` recibe 403 sin ni siquiera llegar al
  controlador.
- El resto requiere autenticación (token válido) sin importar el rol.
- `@EnableMethodSecurity` (línea 45) habilita `@PreAuthorize` en métodos
  específicos como red de seguridad adicional.

### 4.2 Transiciones de estado de pedido

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/controller/OrderController.java:33-39, 130-177`

```java
private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
        "pending", Set.of("accepted"),
        "accepted", Set.of("preparing"),
        "preparing", Set.of("ready_for_pickup"),
        "ready_for_pickup", Set.of("picked_up"),
        "picked_up", Set.of("delivered")
);
```

El flujo normal es: cliente crea (`pending`) → restaurante acepta
(`accepted`) → prepara (`preparing`) → marca listo (`ready_for_pickup`) →
repartidor recoge (`picked_up`) → entrega (`delivered`).

Cada transición valida **dos cosas**: que el estado origen permita el destino
y que el rol del solicitante pueda realizarla.

```java
String requiredAuthority = Set.of("accepted", "preparing", "ready_for_pickup")
        .contains(newStatus) ? "ROLE_RESTAURANT" : "ROLE_DRIVER";
```

- `accepted`, `preparing`, `ready_for_pickup` → solo `ROLE_RESTAURANT`.
- `picked_up`, `delivered` → solo `ROLE_DRIVER`.

### 4.3 Propiedad del pedido (IDOR)

La regla más importante: **un driver solo puede modificar pedidos asignados
a su propio perfil**.

```java
if ("ROLE_DRIVER".equals(requiredAuthority)) {
    Long currentDriverId = currentDriverId();
    if (currentDriverId == null || order.getDriverId() == null
            || !order.getDriverId().equals(currentDriverId)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Este pedido no está asignado a tu perfil de repartidor."));
    }
}
```

`currentDriverId()` (`OrderController.java:221-229`) busca el `Driver` cuyo
`user_id` coincide con el usuario autenticado. Si el `Driver` del pedido no
es ese, se rechaza con 403. **Esto cierra la vulnerabilidad IDOR** (Insecure
Direct Object Reference): un driver no puede aceptar pedidos ajenos ni
marcar como entregado un pedido que no recogió.

Lo mismo aplica a `assignDriver` (`OrderController.java:179-215`): si el
solicitante es `ROLE_DRIVER`, sólo puede asignarse a sí mismo.

`DriverController.java:36-39` replica el patrón para cambios de estado del
propio repartidor: `driver.getUserId()` debe coincidir con el `id` del
usuario autenticado.

**Para qué sirve:** garantiza que un atacante que conozca IDs de pedidos
(no son secretos) no pueda manipularlos cruzando cuentas.

### 4.4 Pendiente conocido: propiedad de restaurantes

`THREAT_MODEL.md` §4 documenta que un usuario con `ROLE_RESTAURANT` aún no
se vincula de forma unívoca a una entidad `Restaurant` específica. En la
implementación actual (`RestaurantController.java`, sólo expone un `GET`),
el riesgo es bajo, pero antes de multi-tenant se debe introducir un campo
`owner_user_id` en `Restaurant` y filtrar todas las operaciones por él.

---

## 5. Cifrado de datos sensibles en reposo

### 5.1 Algoritmo y formato

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/security/SensitiveStringConverter.java`

- **Algoritmo:** AES-256 en modo **GCM** (Galois/Counter Mode).
- **IV:** 12 bytes aleatorios generados con `SecureRandom` por cada escritura.
  El modo GCM requiere IV único por clave+mensaje; usar `SecureRandom` hace
  la colisión astronómicamente improbable con 96 bits de espacio.
- **Tag de autenticación:** 128 bits, verificado al descifrar. Si alguien
  manipula el ciphertext en la base, el descifrado **falla con excepción**
  (línea 73), no devuelve datos corruptos silenciosamente.
- **Codificación:** Base64 con prefijo `enc:v1:`. El prefijo versiona el
  formato y permite detectar valores que aún estén en texto plano para la
  migración.

Estructura almacenada en BD:

```
enc:v1:<base64(IV(12) || ciphertext || tag(16))>
```

### 5.2 Aplicación a campos concretos

**Archivo:** `Order.java:28-30, 45-47` y `Driver.java:21-23`

```java
@Column(name = "customer_phone", length = 512)
@Convert(converter = SensitiveStringConverter.class)
private String customerPhone;

@Column(name = "delivery_address", length = 2048)
@Convert(converter = SensitiveStringConverter.class)
private String deliveryAddress;
```

```java
@Column(length = 512)
@Convert(converter = SensitiveStringConverter.class)
private String phone;
```

- `Order.customerPhone` y `Order.deliveryAddress`: teléfonos y dirección del
  cliente. Se cifran porque revelan PII operativa (dónde entregar y a
  quién llamar).
- `Driver.phone`: teléfono del repartidor. Se cifra porque es PII y solo
  personal autorizado (cliente en su pedido) debe poder verlo.
- `users.email` **no** se cifra: se usa para búsqueda, unicidad y login, y
  un cifrado aleatorio por campo impediría esas operaciones. La protección
  recae en el cifrado de disco y los permisos de BD (ver §6.5).

**Por qué AES-256-GCM y no AES-256-CBC o 3DES:** GCM es AEAD
(Authenticated Encryption with Associated Data), lo que da confidencialidad
e integridad en una sola operación. CBC requiere un MAC separado y es
sensible a padding oracles.

### 5.3 Migración de datos legados

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/service/DataEncryptionMigration.java:28-37`

```java
@EventListener(ApplicationReadyEvent.class)
@Transactional
public void encryptLegacyValues() {
    int migrated = migrate("orders", "customer_phone")
            + migrate("orders", "delivery_address")
            + migrate("drivers", "phone");
    if (migrated > 0) {
        LOGGER.info("Migrated {} legacy sensitive values to AES-GCM storage.", migrated);
    }
}
```

Al arrancar la aplicación (después de que el contexto está listo), busca
valores que **no** empiezan por `enc:v1:` y los cifra. Esto permite desplegar
la aplicación sobre una base de datos preexistente con PII en claro y
migrar sin tiempo de inactividad.

**Para qué sirve:** desplegar el control sin migración manual ni ventana de
mantenimiento. Es idempotente: si se ejecuta dos veces, la segunda no hace
nada porque todos los valores ya tienen el prefijo.

**Riesgo:** la migración se ejecuta dentro de una transacción. En bases con
muchos registros esto puede bloquear escrituras. En producción habría que
loteear con un job externo y paginación.

---

## 6. Gestión de secretos y claves

### 6.1 Generación de secretos

**Archivo:** `scripts/initialize-secrets.ps1`

```powershell
function New-RandomBase64([int]$byteCount) {
    $bytes = New-Object byte[] $byteCount
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes)
}

Write-Secret 'postgres_password.txt' 36
Write-Secret 'jwt_secret.txt' 32
Write-Secret 'data_encryption_key.txt' 32
```

- `RandomNumberGenerator.Fill` es la API .NET recomendada para criptografía
  (usa `BCryptGenRandom` o equivalente del sistema operativo, no
  `System.Random`).
- Tres secretos, cada uno con bytes suficientes para su uso:
  - `postgres_password.txt`: 36 bytes → ~48 caracteres Base64. Contraseña
    del rol `POSTGRES_USER` de PostgreSQL.
  - `jwt_secret.txt`: 32 bytes (256 bits) → Base64. Clave de firma del JWT.
  - `data_encryption_key.txt`: 32 bytes (256 bits) → Base64. Clave AES-256
    para el cifrado de PII.

**Por qué 256 bits:** HMAC-SHA256 y AES-256 son las primitivas estándar
modernas; 256 bits ofrece margen frente a criptoanálisis futuro.

### 6.2 Almacenamiento fuera del repositorio

**Archivo:** `.gitignore:14-21`

```
.env*
!.env.example
*.pem
*.key
*.crt
secrets/
docs/security/SERVER_HARDENING_REPORT.md
```

- `.env*` se ignora por defecto, pero se permite `.env.example` (plantilla
  sin secretos).
- `secrets/` se ignora completo.
- `SERVER_HARDENING_REPORT.md` también se ignora porque puede incluir
  detalles del host que no deberían versionarse.

**Riesgo detectado (ver §15.1):** existe un `.env` real con secretos
visibles en `C:\Users\mesia\Desktop\softwareSeguro\puyo-express\.env`. Si
se hizo `git add` antes de configurar `.gitignore`, ese archivo puede
estar en el historial aunque ahora se ignore. Verificar con
`git log --all --full-path -- .env`.

### 6.3 Inyección al contenedor backend

**Archivo:** `backend/docker-entrypoint.sh`

```sh
export POSTGRES_PASSWORD="$(read_secret /run/secrets/postgres_password)"
export JWT_SECRET="$(read_secret /run/secrets/jwt_secret)"
export DATA_ENCRYPTION_KEY="$(read_secret /run/secrets/data_encryption_key)"

exec java -XX:MaxRAMPercentage=75 -XX:+UseContainerSupport \
     -Djava.security.egd=file:/dev/urandom -jar /app/application.jar
```

- Docker monta los secretos como archivos en `/run/secrets/`. El script los
  lee, elimina CRLF y los exporta al entorno. La JVM los ve como variables
  de entorno normales.
- `-Djava.security.egd=file:/dev/urandom` evita que某些 operaciones que
  usan SecureRandom (como la generación de IV en `SensitiveStringConverter`)
  se bloqueen esperando entropía en sistemas con `/dev/random` conservador.

### 6.4 Mapeo a la aplicación

**Archivo:** `backend/src/main/resources/application.yml:47-58`

```yaml
app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: ${JWT_EXPIRATION_MS:86400000}
    cookie-name: puyo_jwt
    secure-cookie: ${JWT_SECURE_COOKIE:false}

  crypto:
    data-key: ${DATA_ENCRYPTION_KEY}

  http:
    max-request-bytes: ${MAX_REQUEST_BYTES:1048576}
```

- Las variables se inyectan en `@Value` directamente desde el entorno
  (`JwtUtils.java:26-36`, `SensitiveStringConverter.java:27-38`).
- Los valores por defecto solo se aplican a cosas no sensibles (`expiration-ms`,
  `max-request-bytes`). Si `JWT_SECRET` o `DATA_ENCRYPTION_KEY` no están
  definidas, Spring falla al arrancar: no hay fallback inseguro.

### 6.5 Email en claro (decisión consciente)

`users.email` no se cifra a nivel de campo (ver §5.2). La protección
documentada en `ASSET_INVENTORY.md` se delega a:

1. **Cifrado de disco** (BitLocker en el host Windows, idealmente verificado
   con permisos de administrador — actualmente **no verificado**).
2. **Permisos estrictos de PostgreSQL**: el rol `puyo_admin` no se usa para
   la aplicación; la aplicación conecta con un rol de menor privilegio.
3. **Backups cifrados** (pendiente — ver `THREAT_MODEL.md` §5).

**Para que el lector lo entienda:** el email **es** PII y debe protegerse
en reposo, pero cifrarlo a nivel de campo rompe la búsqueda. La decisión
técnica adoptada es razonable si se cumple la cadena (disco + backups
cifrados + permisos). Si no, hay que migrar a un esquema de cifrado
determinista (HMAC sobre el email normalizado) para mantener búsqueda y
cifrado por campo.

---

## 7. Defensa HTTP: cabeceras, CORS, CSRF y tamaño

### 7.1 Cabeceras en Nginx (frontend)

**Archivo:** `frontend/nginx.conf:4-11`

```nginx
server_tokens off;
client_max_body_size 1m;

add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://tile.openstreetmap.org; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
```

| Cabecera | Valor | Mitigación |
|---|---|---|
| `X-Content-Type-Options: nosniff` | siempre | Evita que el navegador "adivine" el tipo MIME y ejecute contenido malicioso. |
| `X-Frame-Options: DENY` | siempre | Anti-clickjacking: la página no se puede embeber en `<iframe>`. |
| `Referrer-Policy: strict-origin-when-cross-origin` | siempre | Solo se envía el origen (no la ruta) al cruzar a otro sitio. |
| `Permissions-Policy` | deniega cámara/microgeo/pago | Reduce superficie si un XSS intenta acceder a sensores. |
| `Content-Security-Policy` | detallada abajo | Política estricta de orígenes permitidos. |
| `server_tokens off` | siempre | Oculta la versión de Nginx en respuestas y páginas de error. |

**CSP detallada:**

- `default-src 'self'`: por defecto, todo viene del mismo origen.
- `script-src 'self'`: solo scripts locales (no inline, no CDN). Esto **es
  estricto**; el frontend debe estar compilado sin scripts inline.
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`: permite
  estilos inline (necesario para muchas librerías como React/Vite) y
  Google Fonts. **El `'unsafe-inline'` es la mayor debilidad** de la CSP
  actual: un XSS con CSS injection podría exfiltrar datos. Si el frontend
  no requiere estilos inline, conviene quitarlo.
- `img-src 'self' data: https://tile.openstreetmap.org`: imágenes del
  mismo origen, data URIs y las teselas del mapa. Se necesita `data:` para
  íconos SVG inline.
- `connect-src 'self'`: solo fetch al mismo origen (pasa por Nginx →
  backend).
- `frame-ancestors 'none'`: redundante con `X-Frame-Options: DENY` pero
  cumple la versión moderna de la directiva.
- `base-uri 'self'`: impide que un atacante cambie la URL base de los
  relativos.
- `form-action 'self'`: los formularios solo pueden enviarse al mismo
  origen.

### 7.2 Cabeceras en Spring (backend)

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/config/SecurityConfig.java:120-129`

```java
.headers(headers -> headers
    .contentTypeOptions(contentType -> {})
    .frameOptions(frame -> frame.deny())
    .referrerPolicy(referrer -> referrer
        .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
    .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()"))
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'none'; frame-ancestors 'none'"))
)
```

Las cabeceras que el navegador ve son las de **Nginx**, porque Nginx
también las oculta en el proxy (`nginx.conf:19-24`):

```nginx
proxy_hide_header Server;
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-Frame-Options;
proxy_hide_header Referrer-Policy;
proxy_hide_header Permissions-Policy;
proxy_hide_header Content-Security-Policy;
```

**Por qué se configuran en ambos niveles:** defensa en profundidad. Si en
el futuro se accede al backend directamente (sin pasar por Nginx), las
cabeceras siguen activas. Nginx las **oculta** para que no se dupliquen en
la respuesta al cliente.

### 7.3 CORS

**Archivo:** `SecurityConfig.java:91-102`

```java
CorsConfiguration configuration = new CorsConfiguration();
configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "X-Request-ID"));
configuration.setAllowCredentials(true);
configuration.setMaxAge(3600L);
```

- Orígenes configurados por variable de entorno `CORS_ALLOWED_ORIGINS`.
- Solo métodos necesarios (no se permite `TRACE` ni `CONNECT`).
- Solo cabeceras necesarias (no se permite `*`).
- `Allow-Credentials: true` para que la cookie HttpOnly cruce.
- Cache de preflight: 1 hora (3600s) — reduce tráfico OPTIONS.

**Limitación:** CORS no es un control de seguridad perimetral; el navegador
lo aplica. Un atacante con `curl` o Postman ignora CORS. La protección real
es la combinación: CORS + cookies `HttpOnly` + `SameSite=Lax` + autenticación
obligatoria en todas las rutas excepto `/api/auth/**`.

### 7.4 CSRF

**Estado:** **desactivado** (`SecurityConfig.java:113`).

```java
.csrf(csrf -> csrf.disable())
```

**Justificación documentada:** la API es stateless, la cookie es `HttpOnly`
y `SameSite=Lax`, y CORS está restringido. Esto bloquea los vectores CSRF
clásicos (formularios cross-site, AJAX cross-site sin preflight).

**Riesgo aceptado:** si en el futuro se relaja `SameSite` o CORS, debe
reactivarse CSRF. La propia documentación (`THREAT_MODEL.md` §2) lo marca
como riesgo y recomienda evaluar token CSRF antes de producción pública.

### 7.5 Límite de tamaño de solicitud (413)

**Tres capas independientes:**

1. **Nginx** (`nginx.conf:5`): `client_max_body_size 1m` — Nginx rechaza con
   413 si la cabecera `Content-Length` o el stream excede 1 MiB.
2. **Filtro backend** (`RequestSizeLimitFilter.java`): cachea hasta
   `maxBytes + 1` y devuelve 413 si se pasa. Solo aplica a POST/PUT/PATCH.
3. **Tomcat** (`application.yml:17-19`): `max-http-form-post-size: 1MB`,
   `max-swallow-size: 1MB`, `max-parameter-count: 100`.

**Para qué sirve:** mitigar denegación de servicio por payloads enormes.
Un atacante no puede enviar 10 GB esperando que el backend los procese y
consuma memoria.

### 7.6 Validación de cabeceras de petición

**Archivo:** `application.yml:9`

```yaml
max-http-request-header-size: 16KB
```

Las cabeceras de petición se limitan a 16 KiB. Esto cierra ataques de tipo
"header stuffing" o intentos de explotar parsers HTTP permisivos.

---

## 8. Validación de entradas y cálculo autoritativo

### 8.1 Bean Validation en DTOs

**Archivos:** `LoginRequest.java`, `RegisterRequest.java`

- `@NotBlank` rechaza cadenas vacías o solo espacios.
- `@Size(min, max)` acota longitudes.
- `@Email` valida formato.

Las anotaciones se activan con `@Valid` en los controladores
(`AuthController.java:43, 64`). Si la validación falla, Spring responde 400
con detalles estructurados (configurable en `application.yml:10-15` para
que no se filtre información sensible).

### 8.2 Recálculo de importes en el backend

**Archivo:** `OrderController.java:80-128`

```java
MenuItem menuItem = menuItemRepository.findById(...).orElse(null);
if (menuItem == null || menuItem.getRestaurant() == null
        || !menuItem.getRestaurant().getId().equals(restaurant.getId())) {
    return badRequest("Uno de los productos no pertenece al restaurante seleccionado.");
}

double foodTotal = 0;
for (OrderItem requestedItem : requestedItems) {
    foodTotal += menuItem.getPrice() * requestedItem.getQuantity();
}

double distanceKm = calculateDistanceKm(restaurant.getPosition(), landmark.getPosition());
double commission = 2 + Math.max(0, distanceKm - 2) * 0.5;
```

**Decisión clave:** el backend **ignora** los precios, cantidades o importes
que envíe el cliente. Recalcula:

- `foodTotal` desde los `MenuItem` en base de datos.
- `distanceKm` con fórmula de Haversine entre coordenadas del restaurante
  y del punto de entrega.
- `commission` como `2 + max(0, distancia - 2) * 0.5` (tarifa base + 0.50
  por km sobre 2 km).
- `total` = `foodTotal + commission`.

**Para qué sirve:** un atacante que manipule el JSON enviado (cambiar
`"price": 1` en lugar de `"price": 100`) **no logra** reducir el importe;
el backend usa sus propios datos. Esto cierra una clase entera de ataques
de manipulación de carrito.

### 8.3 Validación de pertenencia restaurante-producto

```java
if (!menuItem.getRestaurant().getId().equals(restaurant.getId())) {
    return badRequest("Uno de los productos no pertenece al restaurante seleccionado.");
}
```

El cliente no puede "colar" un producto de otro restaurante en un pedido.
El backend verifica que cada `MenuItem` pertenezca al `Restaurant`
seleccionado.

---

## 9. Auditoría y trazabilidad

### 9.1 Logger dedicado

**Archivo:** `backend/src/main/resources/application.yml:73`

```yaml
logging:
  level:
    SECURITY_AUDIT: INFO
```

**Archivo:** `backend/src/main/java/com/puyoexpress/backend/service/SecurityAuditService.java`

```java
private static final Logger AUDIT = LoggerFactory.getLogger("SECURITY_AUDIT");

public void record(String event, String outcome, String actor, String sourceIp, String details) {
    AUDIT.info("event={} outcome={} actor={} sourceIp={} details={}",
            clean(event), clean(outcome), clean(actor), clean(sourceIp), clean(details));
}
```

Se usa un logger con nombre propio (`SECURITY_AUDIT`) para que:

- En producción se pueda enrutar a un colector/almacén distinto del log de
  aplicación.
- Se pueda aplicar un nivel de log diferente (ej. silenciar INFO normal pero
  mantener auditoría).
- Las herramientas de SIEM lo detecten por nombre.

### 9.2 Filtro de auditoría por solicitud

**Archivo:** `AuditLogFilter.java`

```java
String requestId = UUID.randomUUID().toString();
response.setHeader("X-Request-ID", requestId);
long started = System.nanoTime();
try {
    filterChain.doFilter(request, response);
} finally {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String actor = authentication != null && authentication.isAuthenticated()
            ? authentication.getName() : "anonymous";
    long durationMs = (System.nanoTime() - started) / 1_000_000;
    audit.record("HTTP_REQUEST", Integer.toString(response.getStatus()), actor,
            request.getRemoteAddr(),
            "requestId=" + requestId + " method=" + request.getMethod()
                    + " path=" + request.getRequestURI() + " durationMs=" + durationMs);
}
```

- Cada request recibe un `requestId` único que se devuelve al cliente en la
  cabecera `X-Request-ID`. Esto permite correlacionar logs del backend con
  logs del cliente cuando hay un incidente.
- El actor es el nombre del usuario autenticado o `anonymous` si no lo está.
- Se registra método, ruta, código HTTP, IP y duración. **No se registra el
  cuerpo, ni el JWT, ni contraseñas.**

### 9.3 Eventos de autenticación

**Archivo:** `AuthController.java:42-93`

```java
audit.record("AUTH_LOGIN", "SUCCESS", result.response().getUsername(), ...);
audit.record("AUTH_LOGIN", "FAILURE", request.getUsername(), ..., "invalid_credentials");
audit.record("AUTH_REGISTER", "SUCCESS", response.getUsername(), ...);
audit.record("AUTH_REGISTER", "FAILURE", request.getUsername(), ..., "validation_rejected");
audit.record("AUTH_LOGOUT", "SUCCESS", actor, ..., "cookie_cleared");
```

**Para qué sirve:** permite detectar:

- Picos de `AUTH_LOGIN` con `FAILURE` (fuerza bruta).
- Registros desde IPs sospechosas.
- Logouts anómalos.

### 9.4 Sanitización

**Archivo:** `SecurityAuditService.java:17-21`

```java
private String clean(String value) {
    if (value == null || value.isBlank()) return "-";
    String sanitized = value.replace('\n', '_').replace('\r', '_').replace('\t', '_');
    return sanitized.length() > 160 ? sanitized.substring(0, 160) : sanitized;
}
```

- Reemplaza saltos de línea por `_` para evitar **log injection** (un
  atacante que mete `\n` en un username no puede falsificar una línea de log).
- Trunca a 160 caracteres para evitar líneas absurdamente largas.

### 9.5 Pendiente: centralización, retención y alertas

`THREAT_MODEL.md` §6 y `SECURITY_CONTROLS.md` `LOG-04` documentan que los
logs solo van a stdout de Docker. Esto no es un control de auditoría
real en producción porque:

- Un atacante con acceso al host puede borrar los logs.
- No hay correlación entre contenedores ni alertas automáticas.
- No hay retención definida.

**Para producción:** enviar a un colector central con almacenamiento
inmutable (WORM, S3 con Object Lock, syslog remoto firmado), alertas por
eventos anómalos y retención mínima de 90-180 días según normativa.

---

## 10. Errores seguros y minimización de información

### 10.1 Sin stack traces en producción

**Archivo:** `application.yml:10-15`

```yaml
server:
  error:
    include-message: never
    include-binding-errors: never
    include-stacktrace: never
    whitelabel:
      enabled: false
```

- `include-stacktrace: never`: las excepciones 500 no devuelven el stack.
- `include-message: never`: no se filtra el mensaje interno.
- `whitelabel.enabled: false`: desactiva la página de error HTML por defecto
  de Spring Boot (que incluye versión y demás metadatos).

### 10.2 Mensajes genéricos en login fallido

**Archivo:** `AuthController.java:51-56`

```java
} catch (AuthenticationException exception) {
    audit.record("AUTH_LOGIN", "FAILURE", request.getUsername(), ...);
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "Credenciales incorrectas."));
}
```

El mensaje es siempre el mismo, sin distinguir entre "usuario no existe",
"contraseña incorrecta" o "cuenta bloqueada". Esto evita **enumeración de
usuarios**.

### 10.3 Cabecera `Server` oculta

- Nginx: `server_tokens off` + `proxy_hide_header Server;`
- Spring: `application.yml:7 server-header: ""`

El navegador no ve la versión del software, lo que reduce la superficie
para exploits conocidos (un atacante no sabe si la versión es vulnerable).

---

## 11. Aislamiento de contenedores

### 11.1 Dockerfile backend (multi-stage)

**Archivo:** `backend/Dockerfile`

```dockerfile
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S -G app -u 10001 app
WORKDIR /app
COPY --from=build /workspace/target/backend-*.jar /app/application.jar
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod 0500 /app/docker-entrypoint.sh && chown -R app:app /app
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/docker-entrypoint.sh"]
```

- **Build multi-stage:** la imagen final usa solo JRE + el JAR compilado,
  no incluye Maven ni código fuente. Reduce tamaño y superficie.
- **Usuario no root:** UID 10001 sin shell, sólo para correr el JAR.
- **Permisos del entrypoint:** `0500` = lectura+ejecución sólo para el dueño.
- El JAR no es world-readable.

### 11.2 Dockerfile frontend (multi-stage)

**Archivo:** `frontend/Dockerfile`

```dockerfile
FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html
EXPOSE 8080
```

- `npm ci` en lugar de `npm install` para builds reproducibles (usa el lock
  exacto).
- Imagen base `nginx-unprivileged`: ya corre con UID no root por defecto.
- No hay `USER` explícito porque la imagen base ya lo gestiona.

### 11.3 Hardening runtime

**Archivo:** `docker-compose.yml`

Backend:
```yaml
read_only: true
tmpfs:
  - /tmp:size=64m,noexec,nosuid,nodev
cap_drop:
  - ALL
security_opt:
  - no-new-privileges:true
pids_limit: 150
```

Frontend:
```yaml
read_only: true
tmpfs:
  - /tmp:size=32m,noexec,nosuid,nodev
  - /var/cache/nginx:size=32m,noexec,nosuid,nodev
  - /var/run:size=2m,noexec,nosuid,nodev
cap_drop:
  - ALL
security_opt:
  - no-new-privileges:true
pids_limit: 100
```

PostgreSQL:
```yaml
security_opt:
  - no-new-privileges:true
pids_limit: 200
```

**Qué hace cada control:**

- `read_only: true`: el sistema de archivos raíz es de sólo lectura. El
  proceso no puede escribir fuera de los `tmpfs` declarados. Un atacante
  que explote el backend no puede descargar herramientas a `/tmp` y
  ejecutarlas.
- `tmpfs` con `noexec,nosuid,nodev`: aunque algo se escriba en `/tmp` (logs
  de Nginx, archivos temporales de Spring), no se puede ejecutar. `nosuid`
  bloquea binarios con setuid.
- `cap_drop: ALL`: se eliminan **todas** las capacidades Linux. El
  contenedor no puede montar sistemas de archivos, manipular red, hacer
  raw sockets, etc.
- `no-new-privileges`: aunque un binario tenga setuid, no se elevan
  privilegios. Cierra una clase de escapes de contenedor.
- `pids_limit`: tope de procesos. Evita fork bombs.

### 11.4 Healthcheck

**Archivo:** `docker-compose.yml:19-23`

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

El backend no arranca hasta que PostgreSQL responde `pg_isready` cinco
veces seguidas. Esto evita race conditions donde el backend intenta
conectar antes de que la BD esté lista.

---

## 12. Red y exposición

### 12.1 Segmentación de redes

**Archivo:** `docker-compose.yml:84-88`

```yaml
networks:
  app_net:
    internal: false
  data_net:
    internal: true
```

- `app_net`: une frontend y backend. `internal: false` significa que tiene
  ruta por defecto (necesaria para descargar imágenes, etc., en build).
- `data_net`: une backend y PostgreSQL. **`internal: true` significa que
  esta red no tiene puerta de enlace a Internet**. El contenedor de
  PostgreSQL **no puede hablar con nada fuera del stack**, ni siquiera
  para descargar actualizaciones. Esto aísla la base incluso si el
  atacante tiene shell en el contenedor del backend.

### 12.2 Único puerto publicado

**Archivo:** `docker-compose.yml:68`

```yaml
ports:
  - "127.0.0.1:${APP_PORT:-8088}:8080"
```

- **Sólo el frontend** publica puerto al host.
- La dirección es **`127.0.0.1`**: sólo aceptable desde el propio equipo.
  Equipos de la misma LAN no pueden conectar.
- Si `APP_PORT` no está definido, usa 8088.

**Verificación en host** (`SERVER_HARDENING_REPORT.md:53-55`):

| Servicio | Puerto publicado |
|---|---|
| puyo-express-frontend-1 | `127.0.0.1:8088->8080/tcp` |
| puyo-express-backend-1 | `8080/tcp` (sólo dentro de la red Docker) |
| puyo-express-postgres-1 | `5432/tcp` (sólo dentro de `data_net`) |

---

## 13. Hardening del host Windows

**Archivo:** `docs/security/SERVER_HARDENING_REPORT.md` (generado por
`scripts/audit-server-hardening.ps1`).

| Control | Estado | Detalle |
|---|---|---|
| Firewall en todos los perfiles | CUMPLE | Domain, Private y Public activos |
| Antivirus y protección en tiempo real | CUMPLE | Microsoft Defender activo |
| Cifrado de disco del sistema | **NO VERIFICADO** | BitLocker requiere admin |
| SMBv1 desactivado | CUMPLE | `EnableSMB1Protocol=False` |
| Sistema soportado | CUMPLE | Windows 11 Home |
| Puertos de app no expuestos globalmente | CUMPLE | Sólo 127.0.0.1:8088 |

**Lo que el script audita y lo que no:**

- Sí: perfiles de firewall, estado de Defender, versión de Windows, estado
  de SMBv1, puertos TCP en escucha, puertos publicados por Docker.
- No: configuración detallada de reglas de firewall, BitLocker (sin
  privilegios), directivas de grupo, actualizaciones pendientes, cuentas
  con MFA, configuración de red perimetral (router), cuentas de servicio.

**Para qué sirve:** asegurar que el sistema operativo que hospeda los
contenedores no es el eslabón más débil. Un BitLocker sin verificar es un
hueco: si el equipo se pierde, los datos de PostgreSQL (aunque cifrados
por campo) podrían extraerse del volumen.

---

## 14. Verificación técnica reproducida

Comandos exactos (de `SECURITY_VERIFICATION.md`) y qué confirman.

### 14.1 Arranque correcto

```bash
docker compose config --quiet   # Valida sintaxis y referencias
docker compose up --build -d
docker compose ps
```

Salida esperada: tres contenedores `running (healthy)`. Sólo `frontend`
muestra puerto publicado.

### 14.2 Cabeceras HTTP

```bash
curl -I http://localhost:8088/
```

Debe incluir: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Content-Security-Policy`. La cabecera `Server` no
debe contener número de versión.

### 14.3 Límite de 1 MiB

```powershell
$largeBody = '{"username":"' + ('A' * 1048576) + '"}'
$response = Invoke-WebRequest http://localhost:8088/api/auth/login `
    -Method POST -ContentType 'application/json' -Body $largeBody `
    -SkipHttpErrorCheck
$response.StatusCode
```

Salida esperada: `413`. Confirma que el filtro `RequestSizeLimitFilter`
funciona.

### 14.4 Cifrado en base de datos

```bash
docker compose exec postgres psql -U puyo_admin -d puyo_express_db -c \
  "SELECT id, left(customer_phone,7), left(delivery_address,7) FROM orders ORDER BY id DESC LIMIT 5;"
```

Los valores de teléfono y dirección deben empezar por `enc:v1:`. Si
empezaran por texto legible, la migración de arranque no se ejecutó o la
clave cambió.

### 14.5 Logs de auditoría

```bash
docker compose logs backend | grep SECURITY_AUDIT
```

Debe haber líneas con `event=AUTH_LOGIN outcome=SUCCESS` tras un login
exitoso, y `event=HTTP_REQUEST ...` por cada request.

### 14.6 Suite de tests backend

```bash
cd backend && ./mvnw test
```

Incluye:

- Tests de `SensitiveStringConverter`: cifrado, descifrado, aleatoriedad
  del IV, rechazo de alteración del tag.
- Tests de `RequestSizeLimitFilter`: 200 bajo el límite, 413 sobre el
  límite.
- Tests de controladores de auth.

### 14.7 Lint del frontend

```bash
cd frontend && npm run lint
```

---

## 15. Riesgos abiertos y trabajo pendiente

Lista derivada de `THREAT_MODEL.md` y verificada contra el código.

### 15.1 Riesgo crítico: `.env` con secretos reales

**Archivo:** `C:\Users\mesia\Desktop\softwareSeguro\puyo-express\.env`

Contiene valores reales para `POSTGRES_PASSWORD`, `JWT_SECRET` y
`API_MAPS_KEY` (Google). Aunque `.env*` está en `.gitignore`, esto
**no protege el historial de Git si el archivo se añadió antes** de que el
ignore estuviera configurado, ni impide que un `git add .` descuidado lo
rastree.

**Acción inmediata:**

```bash
git ls-files | grep -E '(^|/)(\.env|\.env\..*)$'
git log --all --full-path -- .env
```

Si aparece en el output, **rotar inmediatamente**:

1. `POSTGRES_PASSWORD` — cambiar el rol `puyo_admin` en PostgreSQL y
   reescribir `secrets/postgres_password.txt` con `initialize-secrets.ps1 -Force`.
2. `JWT_SECRET` — regenerar y reiniciar backend (invalida todas las
   sesiones activas).
3. `API_MAPS_KEY` — revocar en Google Cloud Console y crear nueva clave
   con restricción de referer y API.

**Adicional:** el `JWT_SECRET` del `.env` actual (línea 11) tiene 100
caracteres hexadecimales. `JwtUtils.getSigningKey()` decodifica con
`Base64.getDecoder()`, así que ese valor hex **no es Base64 válido** y
producirá una clave degenerada. La generación correcta está en
`initialize-secrets.ps1` (32 bytes → Base64). Es decir: si ese `.env` es
el que está en uso, la "fortaleza" de 256 bits del JWT es ficticia.

### 15.2 TLS y cookie Secure (pendiente para producción)

`docker-compose.yml:36` define `JWT_SECURE_COOKIE:-false`. El Compose
escucha en `127.0.0.1:8088` y todo va en HTTP plano. Antes de exponer a
Internet se requiere:

- Reverse proxy TLS (Caddy, Traefik, nginx con certbot).
- `APP_ORIGIN=https://app.example.com`.
- `JWT_SECURE_COOKIE=true`.
- Renovar CSP con el dominio final (si hoy permite `https://fonts.googleapis.com`
  y similares, mantenerlos; añadir solo orígenes reales).

### 15.3 CSRF desactivado

`SecurityConfig.java:113`. Aceptable en local con CORS restringido y
`SameSite=Lax`. Para producción: añadir token CSRF (doble cookie o
header `X-CSRF-TOKEN`) o migrar a API-only con Authorization header en
lugar de cookie.

### 15.4 Sin rate limiting ni bloqueo

`SECURITY_CONTROLS.md:API-07`. No hay límite por IP ni por usuario. Un
atacante puede iterar miles de logins por segundo.

**Opciones para producción:**

- Nginx: `limit_req_zone` + `limit_req` por IP y por ruta `/api/auth/login`.
- Backend: bucket4j-spring-boot-starter o Resilience4j RateLimiter con
  almacenamiento Redis.
- Fail2ban sobre los logs de Docker.

### 15.5 Backups cifrados

`THREAT_MODEL.md` §5. Hoy: no existen. Para producción: job externo
(`pg_dump` + cifrado con `gpg` o age) copiado a almacenamiento inmutable,
con prueba periódica de restauración y RPO/RTO medido.

### 15.6 Centralización de logs

`THREAT_MODEL.md` §6. Hoy: stdout de Docker. Para producción: pila
ELK/Opensearch/Loki con alertas por patrones anómalos (picos de 401,
accesos cross-AS, etc.).

### 15.7 Cadena de suministro

`SECURITY_CONTROLS.md:CTR-04`. Hoy: imágenes por tag (`postgres:16-alpine`,
`eclipse-temurin:21-jre-alpine`). Riesgo: el tag puede mutar a una imagen
con código malicioso en rebuilds futuros.

**Mejoras:** fijar por digest (`postgres:16-alpine@sha256:...`),
herramientas de escaneo (`trivy`, `grype`), SBOM firmado
(`syft` + `cosign`).

### 15.8 Rotación de claves AES

`THREAT_MODEL.md` §7. `SensitiveStringConverter` lee una clave estática.
No hay procedimiento de rotación ni mecanismo para que convivan dos
claves (doble `AttributeConverter` o columna adicional).

**Procedimiento cuando se implemente:**

1. Backup completo de la base.
2. Generar nueva clave.
3. Desplegar versión que lee clave anterior y cifra con nueva.
4. Re-cifrar todos los registros en batch.
5. Re-desplegar versión que solo lee la nueva.
6. Retirar la clave anterior.

### 15.9 `ddl-auto: update`

`application.yml:38`. Hibernate modifica el esquema al arrancar. Útil en
desarrollo; peligroso en producción porque puede perder datos si una
modificación de modelo se interpreta como drop.

**Reemplazo:** Flyway o Liquibase con migraciones versionadas y revisadas
en PR.

### 15.10 Email en claro

`ASSET_INVENTORY.md` decisión consciente: email no se cifra por campo
(necesario para búsqueda y login). La protección actual depende de
BitLocker (no verificado) y backups cifrados (no implementados). El riesgo
es bajo si la cadena está completa; alto si falta cualquiera de los dos.

### 15.11 Atribución y disponibilidad del mapa

`THREAT_MODEL.md` §12. La CSP actual confía en
`https://tile.openstreetmap.org` (servicio público, sin SLA). Para tráfico
elevado se necesita un proveedor con SLA o servidor de teselas propio.

### 15.12 CSP con `'unsafe-inline'` en `style-src`

`frontend/nginx.conf:11`. Permite CSS inline, lo que debilita la CSP
contra exfiltración vía selectores CSS. Si el frontend no requiere
estilos inline, conviene eliminarlos en build y quitar la directiva.

---

## 16. Recomendaciones priorizadas para producción

Ordenadas por impacto y costo de implementación.

### Antes de exponer a Internet (obligatorio)

1. **TLS** con reverse proxy administrado. Renovar `APP_ORIGIN`,
   `JWT_SECURE_COOKIE=true`, CSP con dominio final.
2. **Rate limiting** en Nginx (`limit_req_zone`) o capa aplicación.
3. **CSRF token** (doble cookie o header) o migrar a Authorization header.
4. **Verificar BitLocker** del host con cuenta administrativa.
5. **Rotar los secretos del `.env`** actual (ver §15.1).

### Primera semana de producción

6. Implementar **backups cifrados** con `pg_dump` + `age` o `gpg`,
   almacenamiento inmutable, prueba de restauración documentada.
7. **Colector de logs** (Loki + Grafana o ELK) con alertas por patrones
   (`AUTH_LOGIN FAILURE > 10/min`, `403 > 50/min`, etc.).
8. **Fijar imágenes Docker por digest** y escanear con `trivy` en CI.

### Primer mes

9. **Migrar a Flyway o Liquibase** y desactivar `ddl-auto: update`.
10. Implementar **rotación de clave AES** con doble cifrado durante
    transición.
11. Reforzar **autorización por restaurante** (campo `owner_user_id`,
    filtros en `RestaurantController`).
12. **SBOM firmado** de imágenes y dependencias, verificación en deploy.

### Continuo

13. Auditoría de host periódica (`audit-server-hardening.ps1`).
14. Revisión de dependencias y CVEs (`dependabot` / `renovate`).
15. Pruebas de restauración de backups con cadencia mensual.
16. Pruebas de penetración anuales y revisión de `THREAT_MODEL.md`.

---

## Apéndice A: Mapa de archivos

| Archivo | Función |
|---|---|
| `backend/Dockerfile` | Imagen backend multi-stage, usuario no root |
| `backend/docker-entrypoint.sh` | Carga secretos de `/run/secrets/` al entorno |
| `backend/pom.xml` | Dependencias (Spring Boot 3, Spring Security, JJWT) |
| `backend/src/main/resources/application.yml` | Config servidor, JPA, JWT, logging |
| `backend/src/main/java/.../config/SecurityConfig.java` | BCrypt, CORS, CSP, filtros, autorización |
| `backend/src/main/java/.../config/WebConfig.java` | Placeholder para futuras personalizaciones web |
| `backend/src/main/java/.../security/JwtUtils.java` | Generación y validación de JWT, cookie defensiva |
| `backend/src/main/java/.../security/JwtAuthFilter.java` | Filtro OncePerRequest que carga SecurityContext |
| `backend/src/main/java/.../security/SensitiveStringConverter.java` | AES-256-GCM para PII |
| `backend/src/main/java/.../security/AuditLogFilter.java` | X-Request-ID + log a SECURITY_AUDIT |
| `backend/src/main/java/.../security/RequestSizeLimitFilter.java` | 413 sobre maxBytes |
| `backend/src/main/java/.../security/UserDetailsImpl.java` | Adaptador Spring Security para User |
| `backend/src/main/java/.../security/UserDetailsServiceImpl.java` | Login por username o email |
| `backend/src/main/java/.../service/AuthService.java` | Login, registro controlado, logout |
| `backend/src/main/java/.../service/SecurityAuditService.java` | Logger dedicado SECURITY_AUDIT con sanitización |
| `backend/src/main/java/.../service/DataEncryptionMigration.java` | Migración de PII legado al arrancar |
| `backend/src/main/java/.../controller/AuthController.java` | Endpoints públicos de autenticación |
| `backend/src/main/java/.../controller/OrderController.java` | Transiciones, IDOR check, cálculo autoritativo |
| `backend/src/main/java/.../controller/DriverController.java` | IDOR check para drivers |
| `backend/src/main/java/.../controller/RestaurantController.java` | Listado público de restaurantes |
| `backend/src/main/java/.../model/User.java` | Entidad con constraints únicos |
| `backend/src/main/java/.../model/Order.java` | PII cifrada con @Convert |
| `backend/src/main/java/.../model/Driver.java` | Teléfono cifrado, user @JsonIgnore |
| `frontend/Dockerfile` | Imagen multi-stage con nginx-unprivileged |
| `frontend/nginx.conf` | Cabeceras defensivas, proxy_pass, oculta versiones |
| `docker-compose.yml` | Orquestación con secrets, redes, hardening |
| `scripts/initialize-secrets.ps1` | Genera secretos con RandomNumberGenerator |
| `scripts/audit-server-hardening.ps1` | Auditoría del host Windows |
| `.gitignore` | Excluye `.env*`, `secrets/`, etc. |
| `docs/security/SECURITY_CONTROLS.md` | Matriz de controles |
| `docs/security/SECURITY_ARCHITECTURE.md` | Flujo de confianza |
| `docs/security/ASSET_INVENTORY.md` | Decisiones criptográficas |
| `docs/security/THREAT_MODEL.md` | Amenazas cubiertas y riesgos abiertos |
| `docs/security/SECURITY_OPERATIONS.md` | Operación, respuesta a incidentes |
| `docs/security/SECURITY_VERIFICATION.md` | Comandos de verificación |
| `docs/security/SERVER_HARDENING_REPORT.md` | Resultado de auditoría del host |

---

## Apéndice B: Glosario

- **AEAD**: Authenticated Encryption with Associated Data. AES-GCM es AEAD;
  aporta confidencialidad e integridad.
- **CSRF**: Cross-Site Request Forgery. Solicitudes desde un sitio externo
  que ejecutan acciones en nombre del usuario autenticado.
- **CSP**: Content-Security-Policy. Cabecera que restringe orígenes de
  scripts, estilos, imágenes, etc.
- **CSPRNG**: Cryptographically Secure Pseudo-Random Number Generator.
  `SecureRandom` en Java, `RandomNumberGenerator` en .NET, `/dev/urandom`
  en Linux.
- **GCM**: Galois/Counter Mode. Modo de operación de AES que produce
  ciphertext + tag de autenticación.
- **HMAC**: Hash-based Message Authentication Code. Usado para firmar JWT
  en este proyecto.
- **HttpOnly**: Flag de cookie que impide acceso desde JavaScript.
- **IDOR**: Insecure Direct Object Reference. Acceso a objetos por ID sin
  verificar propiedad.
- **IV**: Initialization Vector. Valor aleatorio único que evita que dos
  mensajes iguales produzcan el mismo ciphertext.
- **JWT**: JSON Web Token. Estructura firmada que transporta claims.
- **PII**: Personally Identifiable Information. Datos que identifican a
  una persona.
- **SameSite**: Flag de cookie que restringe envío cross-site.
- **Secure**: Flag de cookie que sólo permite transmisión por HTTPS.
- **stateless**: Política de Spring Security que no crea ni mantiene
  sesión HTTP en servidor.
- **WORM**: Write Once Read Many. Almacenamiento inmutable para logs y
  backups.
