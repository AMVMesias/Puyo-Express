# Pruebas de Puyo Express con Postman

Colección:

```text
postman/Puyo-Express-Security.postman_collection.json
```

## Preparación

1. Levanta la aplicación desde WSL Ubuntu:

   ```bash
   cd /mnt/c/Users/mesia/Desktop/softwareSeguro/puyo-express
   docker compose up --build -d
   ```

2. Obtén la contraseña del restaurante desde PowerShell:

   ```powershell
   Get-Content .\secrets\restaurant_owner_password.txt
   ```

3. Importa la colección JSON en Postman.
4. Abre la colección, entra en **Variables** y pega la contraseña en
   `restaurantPassword`, tanto en valor inicial como actual si tu versión de
   Postman muestra ambos.
5. Confirma que `baseUrl` sea:

   ```text
   http://127.0.0.1:8088/api
   ```

## Ejecución

Usa **Run collection** y conserva el orden de las carpetas:

1. `00 - Preparación y ataques negativos`
2. `01 - Cliente crea el pedido`
3. `02 - Restaurante prepara el pedido`
4. `03 - Repartidor entrega el pedido`

La colección:

- crea nombres únicos en cada ejecución;
- registra cliente y repartidor;
- conserva automáticamente la cookie JWT HttpOnly;
- captura `restaurantId`, `menuItemId`, `landmarkId`, `orderId` y `driverId`;
- cambia automáticamente entre sesiones de cliente, restaurante y repartidor;
- valida códigos HTTP, roles, estados y ocultamiento de PII.

La carpeta `99 - Prueba manual de rate limiting` no debe incluirse en el flujo
principal. Ejecuta su única solicitud manualmente 11 veces al final. Las
primeras respuestas serán 401 y posteriormente debe aparecer 429.

## Resultado verificado

La colección principal fue ejecutada con Newman después de reconstruir Docker:

```text
Solicitudes: 28 ejecutadas, 0 fallidas
Pruebas: 28 ejecutadas, 0 fallidas
Validaciones: 40 ejecutadas, 0 fallidas
```

El recorrido completo terminó con el pedido en estado `delivered` y
`routeProgress=100`.

## Datos locales

El bootstrap Docker crea de forma idempotente:

- el usuario `restaurante`;
- el restaurante `Restaurante Puyo Express`;
- el producto `Maito de tilapia`;
- el punto de entrega `Parque Central de Puyo`.

Esto permite ejecutar el recorrido completo sin insertar datos manualmente en
PostgreSQL.

## Repetición y limpieza

Cada ejecución usa usuarios nuevos, por lo que puede repetirse sin conflictos.
Los pedidos y usuarios de prueba permanecen en la base local para permitir
inspección posterior. Para una limpieza completa del entorno de desarrollo se
puede crear un script administrativo específico; no se recomienda eliminar el
volumen automáticamente desde Postman.
