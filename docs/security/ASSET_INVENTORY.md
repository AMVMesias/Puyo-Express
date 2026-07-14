# Inventario y tratamiento criptográfico de activos

| Activo | Clasificación | Ubicación | Protección decidida | Motivo |
|---|---|---|---|---|
| Contraseñas de usuarios | Crítico | PostgreSQL `users.password` | Hash BCrypt, costo 12 | No deben poder recuperarse; no se cifran reversiblemente. |
| Teléfono del cliente | Confidencial/PII | `orders.customer_phone` | AES-256-GCM por campo | Solo personal autorizado necesita recuperarlo para entregar. |
| Dirección de entrega | Confidencial/PII | `orders.delivery_address` | AES-256-GCM por campo | Revela ubicación y debe permanecer ilegible en una copia de la BD. |
| Teléfono del repartidor | Confidencial/PII | `drivers.phone` | AES-256-GCM por campo | Dato personal recuperable para operación. |
| Correo electrónico | Confidencial/PII | `users.email` | Cifrado de disco/volumen, permisos de BD y TLS | Se usa para búsqueda, unicidad e inicio de sesión. El cifrado aleatorio por campo impediría esas operaciones. |
| Secreto JWT | Crítico | Docker secret | 256 bits aleatorios, firma HMAC | Protege autenticidad de sesiones. Nunca se registra ni se incluye en imágenes. |
| Clave AES de datos | Crítico | Docker secret | 256 bits aleatorios | Se separa de la base cifrada. Su pérdida hace irrecuperables los datos. |
| Contraseña PostgreSQL | Crítico | Docker secret | Aleatoria, fuera de Git | Controla acceso a todos los datos. |
| JWT de sesión | Crítico | Cookie del navegador | HttpOnly, SameSite=Lax y Secure en HTTPS | Reduce exposición a JavaScript y envío entre sitios. |
| Pedidos, importes y estados | Interno | PostgreSQL | Autorización por rol y red privada; backup cifrado pendiente | Integridad y disponibilidad son prioritarias. |
| Logs de auditoría | Confidencial | stdout de backend/colector | Sin contraseñas, tokens, cuerpos, teléfonos ni direcciones | Deben permitir atribución sin convertirse en otra fuga de PII. |
| Teselas de OpenStreetMap | Público externo | Navegador | Sin clave; CSP limitada al host oficial y atribución visible | El mapa no requiere secretos ni facturación; se debe respetar la política de uso del proveedor. |
| Código e imágenes | Interno | Repositorio e imágenes Docker | Control de acceso y revisión; escaneo/SBOM automatizado pendiente | Son activos de software y cadena de suministro. |

## Decisiones y alcance

- AES-GCM aporta confidencialidad e integridad; cada escritura utiliza un IV aleatorio de 96 bits.
- Al iniciar, el backend migra teléfonos y direcciones legados que todavía estén en texto plano.
- El correo requiere cifrado del volumen del servidor. Si se exige cifrado por campo, debe añadirse una columna de búsqueda con HMAC y un procedimiento de rotación/migración.
- Las claves no se almacenan en la misma base ni se imprimen en logs.
- Antes de rotar `DATA_ENCRYPTION_KEY` se necesita una migración que descifre con la clave anterior y vuelva a cifrar con la nueva.
- Los backups de PostgreSQL también deben cifrarse y probarse mediante restauraciones periódicas.
