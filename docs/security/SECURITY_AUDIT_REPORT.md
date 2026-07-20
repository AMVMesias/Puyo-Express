# Auditoría de seguridad de Puyo Express

Fecha: 2026-07-16

## Alcance y método

Se revisaron el backend Spring Boot, el frontend React/Vite, la configuración de
Spring Security, JWT, CORS, Nginx, Docker Compose, persistencia JPA, manejo de
secretos y dependencias npm. Se buscaron, entre otros: inyección SQL, XSS,
inyección HTML, control de acceso, IDOR/BOLA, manipulación de precios, valores
numéricos extremos, textos anómalos, abuso de recursos, CSRF, exposición de
secretos y configuración insegura.

La revisión inicial fue estática. Durante la remediación se localizó Java 21,
se ejecutaron las pruebas Maven y se añadieron pruebas negativas. No fue posible
realizar pruebas dinámicas con contenedores porque Docker no está disponible.

## Resumen ejecutivo

Estado: **no apta para producción sin correcciones**.

- Críticos: 1
- Altos: 5
- Medios: 8
- Bajos: 4

No se encontró una ruta explotable de inyección SQL clásica ni uso de
`dangerouslySetInnerHTML`. JPA usa consultas derivadas o parámetros enlazados y
React escapa texto al renderizar. Sin embargo, esto no compensa los problemas
críticos de secretos, autorización y validación de entradas.

## Hallazgos críticos

### SEC-01 — Secretos reales versionados en `secrets.zip`

**Severidad:** Crítica

`secrets.zip` está rastreado por Git y contiene:

- `secrets/jwt_secret.txt`
- `secrets/data_encryption_key.txt`
- `secrets/postgres_password.txt`

El archivo aparece en el historial desde el commit `4cb2d8f`. Ignorar
`secrets/` no protege un ZIP ya versionado. Cualquier persona con acceso al
repositorio puede firmar JWT, descifrar datos personales y acceder a la base de
datos si esta es alcanzable.

**Corrección inmediata:**

1. Rotar las tres credenciales. No basta con borrar el ZIP.
2. Invalidar todos los JWT actuales.
3. Recifrar los datos con una clave nueva mediante una migración controlada.
4. Eliminar `secrets.zip` del árbol actual y del historial Git.
5. Añadir `secrets.zip` y archivos ZIP sensibles a `.gitignore`.
6. Revisar accesos y logs desde la fecha del commit.

## Hallazgos altos

### SEC-02 — Pedidos y datos personales visibles para roles no relacionados

**Severidad:** Alta

`GET /api/orders` solo filtra para clientes. Cualquier restaurante o repartidor
recibe `findAll()`, incluyendo nombre, teléfono y dirección de todos los
pedidos. `GET /api/drivers` también devuelve todos los perfiles, incluido el
teléfono descifrado.

**Impacto:** fuga masiva de PII y violación del principio de mínimo privilegio.

**Corrección:** filtrar siempre por la identidad autenticada:

- cliente: únicamente sus pedidos;
- restaurante: únicamente pedidos de su restaurante;
- repartidor: únicamente pedidos asignados y, si aplica, un listado mínimo de
  pedidos disponibles sin PII;
- no devolver teléfonos u otros campos sensibles en DTOs generales.

### SEC-03 — Un restaurante puede modificar pedidos de otro restaurante

**Severidad:** Alta

`PUT /api/orders/{id}/status` verifica el rol requerido, pero no comprueba que
el pedido pertenezca al restaurante autenticado. Un usuario `ROLE_RESTAURANT`
puede avanzar cualquier pedido conocido por ID de `pending` a
`ready_for_pickup`.

`PUT /api/orders/{id}/assign-driver` presenta el mismo problema: cualquier
restaurante puede asignar repartidor a pedidos ajenos.

**Corrección:** relacionar cada cuenta de restaurante con un `restaurantId` y
validar propiedad en cada lectura y escritura. Preferir consultas como
`findByIdAndRestaurantId(...)` para que el control exista en el acceso a datos.

### SEC-04 — Ausencia de límites de negocio para cantidades y número de ítems

**Severidad:** Alta

La creación de pedidos acepta cualquier `Integer` positivo como cantidad. Por
ejemplo, `2147483647` es válido. No existe máximo de cantidad por producto,
máximo de líneas, máximo monetario ni validación de precio finito/positivo en
los datos persistidos.

Un número con cientos de dígitos normalmente será rechazado al deserializar a
`Integer`, pero números extremos dentro del rango sí pasan. Una solicitud menor
de 1 MB puede contener miles de líneas y producir muchas consultas e
inserciones, amplificando el trabajo en base de datos.

**Corrección sugerida:**

- cantidad por línea: `1..50`;
- líneas distintas: máximo `50`;
- total de unidades: máximo `200`;
- total monetario: límite explícito y `BigDecimal`, no `double`;
- rechazar precios no positivos, `NaN` e infinitos en datos administrativos;
- cargar productos en lote, no una consulta por elemento.

### SEC-05 — Textos de pedidos sin validación de formato ni longitud

**Severidad:** Alta

`createOrder` recibe directamente la entidad `Order`. `customerName`,
`customerPhone` y `deliveryAddress` no tienen `@Valid`, `@NotBlank`, `@Size` ni
reglas de formato. Se aceptan vacío, solo números en un nombre, etiquetas HTML,
caracteres de control y textos de tamaño cercano al límite global de 1 MB.

Además, el cifrado AES-GCM y Base64 expande el texto. Un valor que cabe como
entrada puede exceder las columnas cifradas de 512/2048 caracteres y causar
errores 500 o presión operativa.

**Corrección:** usar un DTO dedicado y una política de allowlist por campo:

- nombre: 2–80 caracteres, letras Unicode, espacios y puntuación humana
  limitada; debe contener al menos una letra;
- teléfono: formato E.164 o formato local normalizado, 7–15 dígitos;
- dirección/referencia: 5–300 caracteres, sin caracteres de control;
- normalizar Unicode a NFC, recortar espacios y rechazar texto invisible
  anómalo;
- dimensionar las columnas considerando la expansión del cifrado.

No se debe “sanitizar SQL” manualmente ni borrar todos los símbolos. Se debe
validar según el significado del campo y mantener consultas parametrizadas.

### SEC-06 — Sin rate limiting ni protección contra fuerza bruta

**Severidad:** Alta

Login y registro son públicos y no tienen límites por IP, cuenta o ventana de
tiempo. BCrypt con coste 12 hace que cada intento sea deliberadamente costoso,
por lo que también puede utilizarse para agotar CPU. El login no limita la
longitud de usuario ni contraseña.

**Corrección:** rate limiting en proxy y aplicación, retraso progresivo,
bloqueo temporal prudente, métricas/alertas y límites de longitud antes de
consultar o ejecutar BCrypt. Ejemplo inicial: 5 intentos por cuenta y 20 por IP
en 15 minutos, ajustado con métricas reales.

## Hallazgos medios

### SEC-07 — CSRF desactivado usando autenticación en cookie

**Severidad:** Media

Spring CSRF está desactivado y el JWT se envía automáticamente en cookie.
`SameSite=Lax` reduce ataques desde otros sitios, pero no sustituye una defensa
CSRF completa en todos los escenarios, especialmente con subdominios
comprometidos, navegadores antiguos o cambios futuros de configuración.

**Corrección:** habilitar CSRF con token para operaciones mutables o exigir un
header antifalsificación no simple y validar estrictamente `Origin`/`Referer`.
Mantener `SameSite=Lax/Strict`, `HttpOnly` y `Secure`.

### SEC-08 — Cookie segura desactivada por defecto

**Severidad:** Media

`JWT_SECURE_COOKIE` usa `false` por defecto, también en Docker Compose. Un
despliegue olvidado sobre HTTP permite exposición de sesión en tránsito.

**Corrección:** `Secure=true` por defecto en perfiles de producción, HTTPS
obligatorio y HSTS en el terminador TLS.

### SEC-09 — Registro permite nombres anómalos y contraseñas débiles

**Severidad:** Media

El usuario solo tiene límites 3–50; acepta HTML, espacios internos/externos
problemáticos, texto solo numérico, caracteres invisibles y nombres visualmente
confundibles. La contraseña solo exige longitud 8 y el mensaje no refleja el
máximo 120.

**Corrección:** normalizar el nombre, exigir al menos una letra, definir un
alfabeto permitido, prohibir controles/invisibles, comparar unicidad sobre una
forma canónica y admitir contraseñas largas con comprobación contra contraseñas
comprometidas. No imponer reglas arbitrarias de “un símbolo y una mayúscula”.

### SEC-10 — Enumeración de cuentas mediante registro

**Severidad:** Media

El endpoint distingue “usuario ya está en uso” de “correo ya registrado”. Esto
permite descubrir cuentas válidas.

**Corrección:** respuesta pública genérica y detalle solo en auditoría interna.

### SEC-11 — Entidades JPA usadas como contratos de entrada/salida

**Severidad:** Media

Aceptar `Order` directamente facilita asignación masiva accidental y hace
difícil garantizar validación consistente. Devolver entidades completas filtra
campos nuevos automáticamente cuando evoluciona el modelo.

**Corrección:** DTOs separados de creación, actualización y respuesta; mapeo
explícito; `@Valid`; ignorar o rechazar propiedades desconocidas según el
contrato.

### SEC-12 — Sin paginación en listados

**Severidad:** Media

Pedidos, restaurantes, repartidores y puntos se cargan con `findAll()`. El
crecimiento de datos permite respuestas grandes, consumo de memoria y
extracción masiva.

**Corrección:** paginación con máximo duro, filtros autorizados y límites de
frecuencia.

### SEC-13 — Migración automática con SQL construido por concatenación

**Severidad:** Media baja

`DataEncryptionMigration` concatena nombres de tabla/columna. Hoy solo recibe
constantes internas, por lo que no es explotable por una petición. Sin embargo,
es un patrón peligroso si en el futuro esos valores se vuelven configurables.
Además, ejecutar una migración completa al iniciar puede bloquear o degradar el
servicio.

**Corrección:** allowlist cerrada de identificadores y migraciones versionadas
por lotes fuera del arranque normal.

### SEC-14 — `ddl-auto: update` en configuración base

**Severidad:** Media

Hibernate modifica el esquema automáticamente. En producción reduce control,
auditoría y reversibilidad de cambios y puede provocar pérdida o bloqueo.

**Corrección:** migraciones versionadas (Flyway/Liquibase) y
`ddl-auto: validate` en producción.

## Hallazgos bajos

### SEC-15 — Errores JWT registrados como `error`

Tokens caducados o malformados controlados por el atacante generan logs a nivel
error, facilitando ruido y agotamiento de almacenamiento. Registrar como
debug/warn agregado, sin incluir tokens ni detalles sensibles.

### SEC-16 — CSP permite `style-src 'unsafe-inline'`

No habilita ejecución JavaScript, pero debilita la política. Reducirlo con
estilos externos, hash o nonce cuando sea viable.

### SEC-17 — CORS no recorta ni valida configuración al iniciar

Los orígenes se separan por coma sin `trim()` ni comprobación de esquema. Fallar
el arranque ante comodines, valores vacíos o esquemas no permitidos.

### SEC-18 — No hay cabeceras de caché explícitas para respuestas sensibles

Añadir `Cache-Control: no-store` a login, `/auth/me` y respuestas con PII.

## SQL injection y XSS/HTML

### Inyección SQL

No se encontró una inyección SQL explotable desde las entradas actuales:

- repositorios Spring Data generan consultas parametrizadas;
- la consulta JPQL de repartidores usa `:userId`;
- las actualizaciones de valores cifrados usan `?`;
- los únicos identificadores concatenados en la migración provienen de
  constantes del código.

Debe mantenerse la regla de no concatenar entradas del usuario en SQL/JPQL,
ordenamientos, nombres de columnas o filtros dinámicos.

### XSS e inyección HTML

No se encontró `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni plantillas HTML
con datos del usuario. React escapa los textos mostrados, de modo que una cadena
como `<img src=x onerror=alert(1)>` se representa como texto y no se ejecuta.

Aun así, se debe validar longitud y semántica en backend. La protección XSS no
consiste en rechazar toda etiqueta durante almacenamiento: consiste en escape
según el contexto de salida, CSP y evitar APIs DOM inseguras. Si se incorpora
HTML enriquecido en el futuro, deberá sanitizarse con una librería mantenida y
una allowlist estricta.

## Matriz mínima de pruebas negativas

Automatizar pruebas para cada endpoint con:

- SQL: `' OR '1'='1`, `1; DROP TABLE users`, comentarios SQL y Unicode;
- HTML/XSS: etiquetas `script`, atributos de evento, SVG, entidades y cadenas
  codificadas;
- números: `-1`, `0`, máximos permitidos, máximo+1, `2147483647`, cientos de
  dígitos, decimales, exponentes, `NaN` e infinito;
- texto: vacío, espacios, solo números en nombre, 10 000 caracteres, controles,
  saltos de línea, bidi, zero-width, emoji y Unicode normalizado/no normalizado;
- JSON: propiedades desconocidas, tipos incorrectos, objetos profundamente
  anidados, arrays enormes, duplicados y cuerpos truncados;
- autorización: cada rol contra cada endpoint, IDs propios/ajenos/inexistentes;
- sesión: JWT alterado, expirado, clave incorrecta, cookie sin Secure y CSRF;
- concurrencia: dos repartidores intentando asignarse el mismo pedido.

## Prioridad de remediación

1. Rotar y retirar secretos de Git.
2. Corregir autorización por objeto y exposición de PII.
3. Introducir DTOs validados y límites de cantidades, textos y colecciones.
4. Añadir rate limiting y protección CSRF.
5. Añadir pruebas de seguridad e integración por rol.
6. Endurecer producción: HTTPS/Secure/HSTS, paginación, migraciones y caché.

## Verificaciones realizadas

- `npm audit --json`: 0 vulnerabilidades conocidas.
- `npm run lint`: correcto.
- `npm run build`: correcto.
- Maven: 13 pruebas aprobadas después de la remediación.
- Pruebas dinámicas con contenedores: no ejecutadas; Docker no está instalado o
  no está disponible en el equipo.
