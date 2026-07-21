# Pruebas de toda la API con Postman

La colección reutilizable está en:

```text
postman/Puyo-Express.postman_collection.json
```

Su nombre al importarlo es **Puyo Express - API completa importable**. Cubre
todos los endpoints del backend y añade comprobaciones negativas de seguridad.

## Preparación una sola vez

1. Levanta la aplicación desde WSL Ubuntu:

   ```bash
   cd /mnt/c/Users/mesia/Desktop/softwareSeguro/puyo-express
   docker compose up --build -d
   ```

2. Obtén la contraseña local del propietario desde PowerShell:

   ```powershell
   Get-Content .\secrets\restaurant_owner_password.txt
   ```

3. En Postman usa **Import > Files** y selecciona
   `Puyo-Express.postman_collection.json`.
4. Abre la colección, entra en **Variables** y pega la contraseña en
   `restaurantPassword`. Usa el valor actual/local para no exportar el secreto.
5. Comprueba que `baseUrl` sea:

   ```text
   http://127.0.0.1:8088/api
   ```

No hay que copiar tokens ni IDs. Postman conserva la cookie JWT HttpOnly y los
scripts capturan los identificadores necesarios.

## Ejecución intuitiva

Pulsa **Run collection** y selecciona, en este orden:

1. `00 - Servicio Auth y pruebas negativas`
2. `01 - Servicios Catálogo y Pedidos - Cliente`
3. `02 - Servicios Restaurante y Pedidos - Propietario`
4. `03 - Servicios Repartidor y Pedidos - Entrega`

No selecciones la carpeta `99 - Prueba manual de rate limiting` en el recorrido
normal. Esa prueba se ejecuta aparte y únicamente al final.

La colección realiza automáticamente lo siguiente:

- genera usuarios y correos únicos en cada ejecución;
- registra un cliente y un repartidor;
- inicia sesión como cliente, propietario y repartidor;
- valida cada sesión con `/api/auth/me`;
- obtiene y guarda `restaurantId`, `menuItemId` y `landmarkId`;
- crea el pedido y guarda `orderId`;
- prepara, asigna, recoge y entrega el pedido;
- obtiene y guarda `driverId`;
- devuelve al repartidor a `offline` y cierra la sesión final;
- comprueba códigos HTTP, roles, estados, cookies y ocultamiento de datos
  personales.

## Cobertura comprobada contra el código

| Servicio/controlador | Método y ruta | Ejercicio principal |
|---|---|---|
| Auth | `POST /api/auth/login` | Login de los tres roles y rechazo de SQL injection |
| Auth | `POST /api/auth/register` | Alta de cliente/repartidor y entradas inválidas |
| Auth | `POST /api/auth/logout` | Limpieza inicial y cierre final de cookie |
| Auth | `GET /api/auth/me` | Identidad y rol de las tres sesiones |
| Restaurant | `GET /api/restaurants` | Catálogo para cliente y restaurante propio para el dueño |
| Landmark | `GET /api/landmarks` | Selección automática del destino |
| Order | `GET /api/orders` | Aislamiento de cliente, restaurante y repartidor |
| Order | `POST /api/orders` | Pedido válido, cantidad extrema y campo desconocido |
| Order | `PUT /api/orders/{id}/status` | Autorización y todas las transiciones válidas |
| Order | `PUT /api/orders/{id}/assign-driver` | Autoasignación segura del repartidor activo |
| Driver | `GET /api/drivers` | Perfil propio y captura de `driverId` |
| Driver | `PUT /api/drivers/{id}/status` | Estados `active` y `offline` |

Son los 12 métodos HTTP declarados en `AuthController`,
`RestaurantController`, `LandmarkController`, `OrderController` y
`DriverController`.

## Reutilización

La colección se puede volver a ejecutar sin editar nombres ni IDs: el `runId`
basado en la hora evita colisiones. Los datos generados quedan en la base local
porque la API no expone endpoints administrativos de borrado; esto permite
inspeccionar el resultado y evita introducir un endpoint peligroso solo para
pruebas.

El backend protege `/auth/login` y `/auth/register` con un límite de 10
solicitudes por IP cada 15 minutos. Varias ejecuciones completas consecutivas
pueden recibir `429`; es el control de seguridad esperado. En desarrollo local
se puede esperar la ventana o reiniciar solamente el backend desde WSL:

```bash
docker compose restart backend
```

No se debe reiniciar un backend productivo para evitar el límite.

## Prueba manual del rate limiting

Ejecuta `Login inválido - repetir 11 veces` de la carpeta `99` once veces. Las
primeras respuestas aceptadas por la prueba son `401`; al superar el límite debe
aparecer `429` con `Retry-After`. Hazlo al final porque afectará temporalmente a
los demás logins desde la misma IP.

## Resultado verificado

La colección principal se ejecutó con Newman contra el stack Docker iniciado
desde WSL Ubuntu:

```text
Solicitudes:         33 ejecutadas, 0 fallidas
Scripts de prueba:   33 ejecutados, 0 fallidos
Pre-request scripts:  2 ejecutados, 0 fallidos
Validaciones:        46 ejecutadas, 0 fallidas
```

El pedido terminó en `delivered`, `routeProgress=100`; el repartidor terminó en
`offline` y el logout final eliminó la cookie del cliente.

## Datos base locales

El bootstrap Docker crea de forma idempotente:

- usuario propietario `restaurante`;
- `Restaurante Puyo Express`;
- producto `Maito de tilapia`;
- destino `Parque Central de Puyo`.

La contraseña no se guarda en Git ni en la colección: permanece en
`secrets/restaurant_owner_password.txt`.
