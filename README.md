# Puyo Express

Aplicación React/Vite para simular pedidos, restaurante, repartidor, billetera de comisiones, modo offline y mapa de entregas en Puyo.

## Configuración

1. Instala dependencias:
   `npm install`
2. Crea `.env` a partir de `.env.example`.
3. Define credenciales locales en `.env`:
   - `VITE_APP_LOGIN_EMAIL`
   - `VITE_APP_LOGIN_PASSWORD`
4. Agrega `VITE_GOOGLE_MAPS_API_KEY` en `.env` para habilitar Google Maps interactivo.
5. Ejecuta:
   `npm run dev`

El login es solo una barrera demo de frontend. Para producción se necesita autenticación en backend.
