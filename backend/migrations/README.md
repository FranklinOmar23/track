# Migración de base de datos

Este proyecto ahora soporta múltiples viajes mediante la tabla `viajes` y la columna `viaje_id` en `habitaciones`.

Para aplicar los cambios en la base de datos MySQL, ejecuta el script:

```sql
SOURCE migrations/001_create_viajes.sql;
```

Si prefieres hacerlo desde la línea de comandos de MySQL:

```bash
mysql -u <usuario> -p <nombre_base_de_datos> < backend/migrations/001_create_viajes.sql
```

Después de ejecutar la migración, si ya tienes habitaciones existentes debes asignarlas a un viaje. Por ejemplo:

```sql
INSERT INTO viajes (nombre, nota) VALUES ('Viaje actual', 'Datos existentes migrados');
UPDATE habitaciones SET viaje_id = LAST_INSERT_ID() WHERE viaje_id IS NULL;
```

Asegúrate de ejecutar estas instrucciones en el esquema correcto antes de iniciar el backend.
