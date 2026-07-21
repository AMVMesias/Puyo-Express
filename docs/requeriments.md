# Plantilla para el Documento del Proyecto Final: Implementación DevSecOps

## Portada
* **Nombre de la Institución / Asignatura:** (Ej. Desarrollo Seguro)
* **Título del Proyecto:** (Ej. Integración de prácticas DevSecOps en la aplicación [Nombre de la App])
* **Número/Nombre del Grupo:**
* **Integrantes:**
* **Fecha de entrega:**

## 1. Introducción y Contexto de la Aplicación
* **Breve descripción de la aplicación original:** ¿Qué hace la aplicación? (Arquitectura básica, lenguaje, base de datos).
* **Objetivo de seguridad:** Explicación breve sobre el propósito de incorporar el ciclo DevSecOps y los controles de seguridad en esta fase final.

## 2. Arquitectura e Inventario de Activos
*(En esta sección el grupo debe mapear visualmente y documentar los componentes que conforman su ecosistema y que deben ser protegidos).*

### 2.1. Diagrama de Arquitectura
* Insertar un diagrama visual (puede ser creado en herramientas como Draw.io, Lucidchart, Excalidraw, o Microsoft Threat Modeling Tool).
* El diagrama debe mostrar claramente: el frontend (cliente/navegador), el backend (servidor/API), la base de datos, y cómo fluye la información entre ellos (ej. flechas indicando peticiones HTTP/HTTPS, consultas SQL).
* **Opcional pero recomendado:** Marcar en el diagrama los "límites de confianza" (Trust Boundaries), por ejemplo, la separación entre la Internet pública y la red interna del servidor.

### 2.2. Tabla de Activos
* A partir del diagrama anterior, listar los servidores (producción/desarrollo), bases de datos, APIs, repositorios de código, y dependencias principales.
* **Criticidad:** Asignar un nivel de criticidad o sensibilidad a cada activo (Alto, Medio, Bajo).

## 3. Seguridad en Autenticación y Prevención de Ataques
*(Documentación de los controles aplicados al inicio de sesión y gestión de credenciales).*

### 3.1. Protección de Contraseñas (Hashing)
* ¿Qué algoritmo de cifrado o hashing se utilizó (ej. bcrypt, Argon2, SHA-256 con salt)?
* Fragmento de código (snippet) mostrando cómo se realiza el hash al registrar y verificar contraseñas.

### 3.2. Mitigación de Ataques de Fuerza Bruta
* Descripción del mecanismo implementado para penalizar los intentos erróneos.
* Detalle de la lógica: ¿Cuántos intentos se permiten antes del bloqueo? ¿Cuánto tiempo dura la penalización?
* **Evidencia:** Captura de pantalla o log demostrando el bloqueo de la cuenta o IP temporalmente.

## 4. Trazabilidad, Logs y Observabilidad
*(Demostrar cómo la aplicación registra sus eventos para ser auditada y monitoreada externamente).*

### 4.1. Estructura de los Logs
* Formato definido para los logs (preferiblemente JSON o formato estructurado).
* Detallar los campos que se están capturando (ej. timestamp, nivel_severidad, id_usuario, ip_origen, id_activo, accion).

### 4.2. Integración con el Inventario de Activos
* Explicar cómo los logs generados hacen referencia o se asocian a los activos definidos en el punto 2.

### 4.3. Preparación para Herramientas de Observabilidad
* Explicar el flujo: ¿Dónde se están guardando los logs actualmente y cómo están estructurados para que herramientas como SolarWinds, Azure Monitor o ElasticSearch puedan ingerirlos fácilmente?
* **Evidencia:** Muestra de un log real generado por la aplicación al detectar un evento crítico (ej. fallo de inicio de sesión).

## 5. Hardening (Fortalecimiento de la Seguridad)
*(Documentación de las estrategias de defensa en profundidad implementadas en los entornos).*

### 5.1. Hardening en el Código
* Mención de buenas prácticas aplicadas en el código fuente (ej. validación/saneamiento de entradas, uso de consultas parametrizadas para evitar Inyecciones SQL, gestión de dependencias vulnerables).

### 5.2. Hardening del Servidor
* Configuraciones de seguridad a nivel de infraestructura o contenedor (ej. cerrar puertos innecesarios, ejecución con usuarios sin privilegios de root, configuración de firewalls, uso de HTTPS/TLS).

### 5.3. Ocultamiento de Versiones y Fingerprinting
* Explicación de cómo se ocultó la identidad y versión del software (ej. eliminación de cabeceras X-Powered-By o Server en Apache/Nginx/Node.js).
* Manejo de errores genéricos: Evidencia de que la aplicación no expone el stack trace ni errores de la base de datos al usuario final.
* **Evidencia:** Captura de pantalla de una petición HTTP (usando Postman, cURL o las herramientas de desarrollador del navegador) donde se vea que las cabeceras están limpias.

## 6. Conclusiones y Trabajo Futuro
* **Lecciones aprendidas:** ¿Qué desafíos técnicos enfrentó el equipo al implementar estas medidas de seguridad?
* **Mejoras a futuro:** ¿Qué otros aspectos de DevSecOps (como herramientas SAST/DAST en un pipeline CI/CD) podrían agregarse en una siguiente versión?
