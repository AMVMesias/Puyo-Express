# Verificación de controles de seguridad

Ejecuta los comandos desde la raíz de `puyo-express`.

## 1. Crear secretos y arrancar

```powershell
Copy-Item .env.example .env
.\scripts\initialize-secrets.ps1
wsl.exe -d Ubuntu
```

Ya dentro de Ubuntu:

```bash
cd /mnt/c/Users/mesia/Desktop/softwareSeguro/puyo-express
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Solo `frontend` debe mostrar un puerto publicado: `127.0.0.1:8088->8080`. PostgreSQL y backend usan únicamente redes Docker internas.

No ejecutes backend o Vite manualmente mientras este Compose esté activo. `npm run dev` detecta la aplicación Docker y termina sin abrir el puerto 3000.

## 2. Comprobar puertos y hardening del host

```powershell
.\scripts\audit-server-hardening.ps1
Get-Content .\docs\security\SERVER_HARDENING_REPORT.md
```

El informe revisa firewall, Microsoft Defender, BitLocker, SMBv1, puertos TCP y publicaciones Docker. Docker reduce la superficie de la aplicación, pero no sustituye actualizaciones del sistema, firewall, cifrado de disco, acceso administrativo con MFA ni backups.

## 3. Verificar cabeceras y versión oculta

```powershell
curl.exe -I http://localhost:8088/
curl.exe -i http://localhost:8088/api/auth/me
```

Debe observarse CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`. Si aparece `Server`, no debe contener una versión. Nginx oculta la cabecera del backend y tiene `server_tokens off`.

## 4. Verificar el límite de 1 MiB

```powershell
$largeBody = '{"username":"' + ('A' * 1048576) + '"}'
$response = Invoke-WebRequest http://localhost:8088/api/auth/login -Method POST -ContentType 'application/json' -Body $largeBody -SkipHttpErrorCheck
$response.StatusCode
```

El resultado esperado es `413`. El límite existe tanto en Nginx como en el filtro del backend y puede ajustarse con `MAX_REQUEST_BYTES`.

## 5. Verificar cifrado en PostgreSQL

Crea un pedido nuevo y consulta solo el prefijo/longitud del dato almacenado:

```powershell
wsl.exe -d Ubuntu -- sh -lc "cd /mnt/c/Users/mesia/Desktop/softwareSeguro/puyo-express && docker compose exec postgres psql -U puyo_admin -d puyo_express_db -c \"SELECT id, left(customer_phone,7), left(delivery_address,7) FROM orders ORDER BY id DESC LIMIT 5;\""
```

Los valores deben comenzar con `enc:v1:`. La API los descifra únicamente para usuarios autorizados.

## 6. Ver logs de auditoría

```powershell
wsl.exe -d Ubuntu -- sh -lc "cd /mnt/c/Users/mesia/Desktop/softwareSeguro/puyo-express && docker compose logs backend | grep SECURITY_AUDIT"
```

Se registran inicio/cierre de sesión, registro y cada solicitud con resultado, actor, IP, identificador y duración. No se registran cuerpos, contraseñas, JWT, teléfonos ni direcciones. En producción, envía stdout a un colector inmutable y define retención/alertas.

## 7. HTTPS de producción

El puerto Compose está enlazado a `127.0.0.1` para que no quede expuesto directamente. Coloca un reverse proxy TLS delante, publica solo 443 y configura:

```env
APP_ORIGIN=https://app.example.com
JWT_SECURE_COOKIE=true
```

Después valida TLS con la herramienta corporativa elegida y restringe la clave de Google Maps al dominio real.
