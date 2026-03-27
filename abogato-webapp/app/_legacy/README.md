Archivos movidos aqui para limpiar las carpetas especiales de Nuxt sin perder historial util.

Regla practica:
- `app/layouts`, `app/pages` y `app/components` deben contener solo piezas activas.
- Todo lo experimental, viejo o sin uso actual se conserva en `_legacy`.
- Si algun archivo vuelve a usarse, hay que regresarlo a su carpeta especial correspondiente y actualizar imports o rutas.
