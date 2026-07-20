# Correcciones de seguridad aplicadas

Fecha: 2026-07-16

Este documento explica qué se cambió después de la auditoría, por qué se hizo y
qué operaciones manuales siguen siendo obligatorias antes de producción.

## 1. Entradas de pedidos y números extremos

Antes, `POST /api/orders` recibía directamente una entidad JPA `Order`. Eso
permitía enviar campos internos y no imponía límites de negocio.

Ahora se utilizan:

- `CreateOrderRequest`
- `CreateOrderItemRequest`

El backend solo acepta los campos necesarios y aplica estos límites:

- máximo 50 productos distintos;
- cantidad entre 1 y 50 por producto;
- máximo 200 unidades totales;
- un producto no puede repetirse en varias líneas;
- IDs obligatorios, positivos y existentes;
- precio de catálogo finito, positivo y máximo de USD 10 000;
- total máximo de pedido de USD 100 000;
- cálculo del precio exclusivamente en el servidor;
- cálculo monetario con `BigDecimal` y redondeo decimal.

Una cantidad como `999999999999999999999999999999` se rechaza durante la
deserialización. Una cantidad como `2147483647`, aunque cabe en un entero, se
rechaza por superar el máximo de 50.

El frontend dejó de enviar `total`, `foodTotal`, `commission`,
`restaurantName`, `distanceKm` y precios calculados. Solo envía el ID de cada
producto y su cantidad.

## 2. Validación de textos extraños

Se añadieron reglas independientes según el significado del campo:

- nombre del cliente: 2–80 caracteres, debe contener letras y solo admite
  caracteres propios de nombres humanos;
- teléfono: signo `+` opcional y entre 7 y 15 dígitos;
- dirección: 5–300 caracteres;
- usuario: debe empezar con una letra y solo admite letras, números, punto,
  guion y guion bajo;
- login: usuario/correo máximo de 100 caracteres y contraseña máximo de 120;
- contraseña nueva: entre 12 y 120 caracteres.

`InputPolicy` normaliza Unicode a NFC, elimina espacios exteriores, reduce
espacios repetidos y rechaza caracteres de control, saltos de línea, caracteres
de formato y caracteres invisibles como zero-width space.

No se implementó un filtro que busque palabras como `SELECT`, `<script>` o
`DROP`. Ese enfoque produce falsos positivos y no protege realmente. SQL se
mantiene parametrizado y React mantiene el escape contextual de los textos.

## 3. Autorización y acceso a pedidos

La autorización ahora se basa en la identidad autenticada y en la propiedad del
recurso.

### Clientes

Solo pueden consultar pedidos cuyo `customerId` coincide con su usuario. Los
campos internos enviados por el cliente se ignoran porque ya no forman parte
del DTO.

### Restaurantes

Se añadió una relación uno-a-uno entre `Restaurant` y `User` mediante
`restaurants.user_id`.

Una cuenta de restaurante:

- solo recibe su restaurante en `GET /api/restaurants`;
- solo recibe pedidos cuyo `restaurantId` pertenece a su cuenta;
- solo puede aceptar, preparar o marcar como listo un pedido propio;
- solo puede asignar un repartidor a un pedido propio.

Si no existe asociación, el backend devuelve 403. No intenta adivinar la
propiedad usando nombres o datos enviados por el navegador.

### Repartidores

Un repartidor solo recibe:

- sus pedidos asignados, con los datos necesarios para entregar;
- pedidos listos y sin asignar, pero sin nombre, teléfono, dirección exacta ni
  coordenadas de destino.

Solo puede aceptar un pedido con su propio perfil y solo puede modificar el
estado de pedidos que le fueron asignados.

La asignación utiliza bloqueo pesimista en base de datos para impedir que dos
repartidores acepten simultáneamente el mismo pedido.

Las consultas de restaurantes y pedidos cargan explícitamente las colecciones
que se serializan (`menu` e `items`). Esto evita respuestas 500 por relaciones
lazy después de cerrar la sesión JPA con `open-in-view=false`.

## 4. Protección de datos personales

Se añadieron DTOs de respuesta:

- `OrderResponse`
- `DriverResponse`

Ya no se devuelve el teléfono de los repartidores. Los clientes no reciben el
listado global de repartidores ni sus ubicaciones. Una cuenta de repartidor solo
recibe su propio perfil; los restaurantes reciben únicamente los datos
operativos necesarios, sin métricas privadas ni `userId`. Los pedidos
disponibles para repartidores ocultan PII hasta que el pedido queda asignado.

Todas las respuestas API incluyen `Cache-Control: no-store`.

## 5. Fuerza bruta y abuso

`AuthRateLimitFilter` limita por IP y endpoint:

- 10 solicitudes de login por 15 minutos;
- 10 solicitudes de registro por 15 minutos.

Al superar el límite se devuelve HTTP 429 con `Retry-After`.

Este control en memoria es adecuado como primera defensa y para una sola
instancia. Si se ejecutan varias réplicas, debe sustituirse por un contador
compartido en Redis, el API gateway o el proxy de entrada.

## 6. CSRF, cookies y CORS

Las operaciones `POST`, `PUT`, `PATCH` y `DELETE` validan el header `Origin`.
Si un navegador envía un origen que no aparece en `CORS_ALLOWED_ORIGINS`, la
solicitud recibe 403.

Las cookies JWT ahora usan:

- `HttpOnly`;
- `SameSite=Strict`;
- `Secure` cuando `JWT_SECURE_COOKIE=true`.

CORS recorta espacios, rechaza comodines, rechaza valores sin esquema HTTP(S) y
hace fallar el arranque si la configuración queda vacía.

El gateway reemplaza cualquier `X-Forwarded-For` enviado por el cliente con la
IP de la conexión que recibe. Esto evita que un atacante falsifique su IP para
evadir el rate limiting o contaminar los registros de auditoría.

Para producción son obligatorios:

```env
APP_ORIGIN=https://app.ejemplo.com
JWT_SECURE_COOKIE=true
```

El terminador TLS debe añadir HSTS. Spring también lo añade cuando reconoce una
solicitud HTTPS.

## 7. JSON, errores y base de datos

Jackson ahora rechaza propiedades JSON desconocidas. Esto ayuda a detectar
intentos de asignación masiva y clientes desactualizados.

El manejador global convierte:

- JSON inválido en HTTP 400;
- violaciones de validación en HTTP 400;
- conflictos de integridad en HTTP 409;
- sin devolver stack traces ni mensajes internos de la base.

`ddl-auto` usa `validate` por defecto. Docker Compose mantiene temporalmente
`update` para el entorno local mediante `HIBERNATE_DDL_AUTO`, porque el proyecto
todavía no incluye Flyway/Liquibase. Producción debe usar migraciones
versionadas y `validate`.

## 8. Secretos comprometidos

Se eliminó `secrets.zip` del árbol versionado y se añadieron reglas a
`.gitignore` para impedir que vuelva a agregarse.

Esto no revoca los secretos del historial. Antes de producción hay que:

1. detener temporalmente el acceso externo;
2. generar una contraseña nueva de PostgreSQL;
3. generar una clave JWT nueva de al menos 32 bytes aleatorios en Base64;
4. invalidar todas las sesiones existentes;
5. generar una nueva clave AES-256;
6. recifrar los datos existentes con una migración que pueda leer con la clave
   antigua y escribir con la nueva;
7. eliminar el ZIP de todo el historial con `git filter-repo`;
8. forzar la actualización segura de clones y revisar logs de acceso.

Ejemplo para retirar el archivo del historial, después de crear un respaldo y
coordinarlo con todos los colaboradores:

```bash
git filter-repo --path secrets.zip --invert-paths
git push --force --all
git push --force --tags
```

No se rotaron automáticamente las claves locales porque cambiar la clave AES
sin una migración haría ilegibles los datos ya cifrados.

## 9. Asociación de cuentas de restaurante

El Compose local incluye un bootstrap idempotente para la cuenta propietaria.
El usuario, correo y nombre del restaurante se configuran con:

```env
BOOTSTRAP_RESTAURANT_ENABLED=true
BOOTSTRAP_RESTAURANT_USERNAME=restaurante
BOOTSTRAP_RESTAURANT_EMAIL=restaurante@puyoexpress.local
BOOTSTRAP_RESTAURANT_NAME=Restaurante Puyo Express
```

La contraseña no se guarda en `.env`. Se genera en:

```text
secrets/restaurant_owner_password.txt
```

con `scripts/initialize-secrets.ps1` y se monta como Docker Secret. Al iniciar,
el backend crea o actualiza la cuenta con rol `ROLE_RESTAURANT` y crea el
restaurante asociado si todavía no existe. Fuera de Docker el bootstrap está
desactivado por defecto.

Para consultar la contraseña local:

```powershell
Get-Content .\secrets\restaurant_owner_password.txt
```

Para asociaciones administrativas adicionales puede utilizarse SQL:

Ejemplo administrativo:

```sql
UPDATE restaurants
SET user_id = (
  SELECT id FROM users
  WHERE username = 'cuenta_restaurante'
    AND role = 'ROLE_RESTAURANT'
)
WHERE id = 1;
```

Verificación:

```sql
SELECT r.id, r.name, u.username, u.role
FROM restaurants r
LEFT JOIN users u ON u.id = r.user_id;
```

No se debe permitir que una cuenta seleccione o cambie este vínculo desde el
frontend.

## 10. Pruebas añadidas y verificaciones

Se añadieron pruebas para:

- rechazar nombres formados solo por números;
- rechazar `Integer.MAX_VALUE` como cantidad;
- aceptar una orden normal;
- detectar caracteres invisibles y de control;
- normalizar espacios;
- rechazar mutaciones desde un origen externo;
- aceptar el origen configurado;
- responder 429 al superar el límite de autenticación.

Comandos ejecutados:

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.11'
.\mvnw.cmd test
```

Resultado inicial tras la implementación:

- backend compilado correctamente;
- 13 pruebas aprobadas;
- frontend TypeScript aprobado;
- build de producción aprobado;
- `npm audit`: cero vulnerabilidades conocidas.

Después de cualquier cambio adicional deben ejecutarse nuevamente:

```powershell
cd backend
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.11'
.\mvnw.cmd test

cd ..\frontend
npm run lint
npm run build
npm audit
```

## 11. Límites de la corrección

Todavía se recomienda antes de una exposición pública:

- incorporar Flyway o Liquibase;
- usar rate limiting compartido si hay varias instancias;
- realizar pruebas dinámicas con una base PostgreSQL real;
- ejecutar OWASP ZAP contra un entorno aislado;
- paginar listados grandes;
- configurar monitoreo, alertas y retención segura de logs;
- revisar y rotar efectivamente todos los secretos históricos.

## 12. Segunda verificación dinámica con Docker y WSL Ubuntu

La aplicación se construyó y ejecutó realmente desde WSL2 Ubuntu con:

```bash
cd /mnt/c/Users/mesia/Desktop/softwareSeguro/puyo-express
docker compose up --build -d
docker compose ps
```

Se verificó que PostgreSQL quedó saludable y que backend y frontend quedaron
activos. Las pruebas HTTP reales produjeron:

- `/api/auth/me` anónimo: HTTP 204;
- origen externo en registro: HTTP 403;
- usuario formado solo por números: HTTP 400;
- registro válido: HTTP 201;
- login válido: HTTP 200;
- intento de inyección SQL en login: HTTP 401;
- propiedad JSON desconocida: HTTP 400;
- cantidad `2147483647`: HTTP 400;
- nombre con etiqueta `script`: HTTP 400;
- cuerpo superior a 1 MB: HTTP 413;
- cliente consultando repartidores: lista vacía;
- intentos repetidos con distintos `X-Forwarded-For`: HTTP 429, confirmando
  que el gateway reemplaza la cabecera falsificada;
- restaurante intentando modificar un pedido ajeno: HTTP 403;
- cliente intentando modificar el estado: HTTP 403;
- restaurante propietario modificando su pedido: HTTP 200;
- restaurante ajeno consultando pedidos: cero resultados;
- restaurante propietario consultando pedidos: solo su pedido.

Durante esta segunda revisión se detectaron y corrigieron dos defectos que no
aparecían en las pruebas unitarias:

1. confianza indirecta en un `X-Forwarded-For` proporcionado por el cliente;
2. respuestas HTTP 500 al serializar `Restaurant.menu` y `Order.items` después
   de cerrar la sesión JPA.

Los fixtures temporales usados para comprobar separación entre dos restaurantes
se eliminaron al terminar. Los contenedores quedaron ejecutándose y el volumen
de PostgreSQL no fue eliminado.

## 13. Reducción de identificación tecnológica

Se reemplazó Nginx por un gateway estático y proxy inverso mínimo compilado en
Go y ejecutado sin privilegios. Externamente:

- no se envía `Server`;
- no se envía `X-Powered-By`;
- no se publican versiones del servidor;
- no se generan sourcemaps;
- los archivos JavaScript y CSS se minifican;
- la cadena exacta de versión de Leaflet se retira del artefacto público durante
  cada build;
- los errores del proxy son JSON genérico y no revelan el upstream.

Esto elimina la detección de Nginx y reduce información innecesaria, pero no
puede garantizar que Wappalyzer muestre cero tecnologías. React deja marcas
observables durante la ejecución, Leaflet necesita clases CSS `leaflet-*`,
Lucide genera SVG con clases identificables y Tailwind produce patrones CSS.
Ocultarlos completamente requeriría sustituir esas librerías o reescribir la
interfaz, y no constituye una defensa de seguridad fiable.

Las versiones y dependencias deben mantenerse actualizadas aunque el escáner no
las muestre. La seguridad no debe depender de que el atacante desconozca el
framework utilizado.
