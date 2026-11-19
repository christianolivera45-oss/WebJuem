# Procedimiento de Respaldo y Recuperación de Datos — JUEM

Este documento describe la arquitectura de protección de datos de JUEM y el procedimiento operativo estándar para verificar respaldos, auditar cambios y recuperar información de productos sin sobrescribir el resto del catálogo.

---

## 1. Arquitectura de Respaldos Automáticos

JUEM genera y conserva respaldos completos (catálogo de productos, variantes, stock por sucursal, costos, comisiones, categorías, subcategorías, cupones y configuración) en **dos ubicaciones redundantes**:

1. **Base de datos PostgreSQL (Supabase)**: tabla `public.system_backups`.
2. **Almacenamiento local en servidor**: directorio `data/backups/<backup_id>.json`.

Cada respaldo incluye una huella criptográfica **SHA-256 (`checksum`)** calculada de forma determinista sobre los campos críticos de todos los productos (`id`, `codigo`, `name`, `price`, `precioWeb`, `precioCompra`, `precioCon40`, `comisionML`, `comisionMP`, `precioVentaML`, `stock`, `stockPinamar`, `stockMontevideo` y variantes).

### Tipos de respaldos generados
- **`daily` (Automático diario)**: se crea automáticamente una vez por día (zona horaria `America/Montevideo`) al iniciar el servidor y en verificaciones periódicas cada 6 horas. Se conservan hasta 30 versiones históricas recientes.
- **`pre_bulk` (Automático previo a cambios masivos)**: se crea automáticamente antes de ejecutar cualquier guardado en `POST /api/store` que modifique 3 o más productos o elimine productos.
- **`pre_restore` (Automático previo a una restauración)**: se crea obligatoriamente justo antes de restaurar cualquier producto desde un respaldo, permitiendo deshacer una restauración si fuera necesario.
- **`manual`**: generado bajo demanda por un administrador desde el endpoint correspondiente.

---

## 2. Verificación de Integridad y Auditoría Antes de Restaurar

Todas las rutas administrativas requieren cabecera `Authorization: Bearer <token_admin>`.

### 2.1 Listar respaldos disponibles
```bash
GET /api/admin/backups
```

### 2.2 Verificar checksum e integridad de un respaldo
```bash
POST /api/admin/backups/<BACKUP_ID>/verify
```
Debe devolver `"valid": true` y `"checksumMatch": true`. **Nunca ejecutar una restauración si `valid` es `false`.**

### 2.3 Comparar diferencias entre la base viva y un respaldo
```bash
GET /api/admin/backups/<BACKUP_ID>/diff
```
Devuelve únicamente los productos y campos que difieren entre el estado actual y el snapshot seleccionado (`backupValue` vs `liveValue`).

### 2.4 Revisar alertas e historial de modificaciones
- Consultar alertas del sistema (caídas a `$0`, bloqueos de sobrescritura, conflictos `409`, intentos no autorizados):
  ```bash
  GET /api/admin/alerts
  ```
- Ejecutar escaneo de anomalías contra el último respaldo (solo detecta y alerta; **nunca restaura automáticamente**):
  ```bash
  POST /api/admin/anomalies/scan
  ```
- Consultar el historial campo por campo de un producto específico:
  ```bash
  GET /api/admin/audit-logs?codigo=J001&limit=100
  ```

---

## 3. Recuperación de un Producto Individual (Sin Afectar el Resto)

Para recuperar un único producto dañado manteniendo intactos los demás artículos, pedidos, facturas, imágenes y stock vigentes:

1. **Identificar el respaldo sano** usando `GET /api/admin/backups` y validarlo con `POST /api/admin/backups/<BACKUP_ID>/verify`.
2. **Revisar qué cambió** en ese artículo mediante `GET /api/admin/audit-logs?codigo=<CODIGO>` y `GET /api/admin/backups/<BACKUP_ID>/diff`.
3. **Ejecutar la restauración individual**:
   - **Opción A — Restaurar únicamente campos financieros dañados** (recomendado cuando stock o precios web actuales son correctos):
     ```bash
     POST /api/admin/backups/<BACKUP_ID>/restore-product
     Content-Type: application/json
     Authorization: Bearer <TOKEN_ADMIN>

     {
       "codigo": "J001",
       "fields": ["precioCompra", "precioCon40", "comisionML", "comisionMP", "precioVentaML"]
     }
     ```
   - **Opción B — Restaurar el producto completo** (si el artículo entero fue alterado):
     ```bash
     POST /api/admin/backups/<BACKUP_ID>/restore-product
     Content-Type: application/json
     Authorization: Bearer <TOKEN_ADMIN>

     {
       "codigo": "J001"
     }
     ```
4. El sistema automáticamente:
   - Verifica el checksum SHA-256 del respaldo origen.
   - Crea un respaldo `pre_restore` del estado vivo actual antes de escribir.
   - Actualiza **únicamente** el producto indicado en PostgreSQL y `data/store.json`.
   - Registra cada campo restaurado en `public.product_audit_logs` con operación `restore-product:<BACKUP_ID>`.

---

## 4. Manejo de Conflictos de Concurrencia (`409 Conflict`)

Si dos administradores editan un producto simultáneamente o una pestaña tiene una caché desactualizada:
- El servidor detecta que `expectedUpdatedAt` (en `PATCH /api/products/:id`) o `expectedStateVersion` (en `POST /api/store`) no coincide con la versión vigente en PostgreSQL.
- El servidor **rechaza la escritura obsoleta con código HTTP `409`**, registra una alerta `concurrency_conflict` y devuelve el estado más reciente.
- El panel administrativo recarga automáticamente los datos actualizados desde el servidor antes de permitir un nuevo guardado.

---

## 5. Recuperación de Emergencia Completa

Ante un fallo grave donde se requiera inspeccionar o restaurar múltiples artículos desde un archivo en disco (`data/backups/<BACKUP_ID>.json`):

1. Detener modificaciones administrativas mientras dura el diagnóstico.
2. Verificar el archivo JSON del respaldo y su `checksum` comparando `snapshot.products.length` y costos positivos (`precioCompra > 0`).
3. Generar un respaldo manual previo del estado actual (`POST /api/admin/backups`).
4. Restaurar de forma selectiva por producto usando `POST /api/admin/backups/<BACKUP_ID>/restore-product`, validando cada cambio en `GET /api/admin/audit-logs`.
