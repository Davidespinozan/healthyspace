# Healthy Space — food trucks

App de pedidos (Mexican Grill & Bowls, Culiacán) y panel operativo del negocio.

- **Cliente**: `/` — menú, armar tu bowl, carrito, pedidos, lealtad.
- **Panel operativo**: `/staff` — punto de venta, caja, inventario, traslados,
  producción, compras, costeo, finanzas y bitácora.

Los accesos del staff no van en el repo. Se dan de alta creando el usuario en
Supabase → Authentication y agregando su fila en `truck_staff` con su rol
(`admin`, `pos`, `almacen`, `repartidor`) y su remolque.

## Base de datos

Este proyecto **comparte la base de Supabase con Healthy Space Club**
(`ltveorvqvvlyivjwxjlc`). Las tablas del truck llevan prefijo `truck_`.

Lo más importante que hay que saber de eso:

> **Todo socio del Club con sesión iniciada es rol `authenticated`** — el mismo
> rol al que se le dan permisos aquí. No son dos públicos distintos para Postgres.
> Una función `SECURITY DEFINER` sin guardia de rol es una puerta abierta a los
> números del negocio: corre como dueño de las tablas y se salta la RLS por
> diseño. Toda función nueva sobre tablas `truck_*` empieza con
> `perform public.exigir_staff()` o `exigir_admin()`.

### Migraciones

Este repo **no está enlazado** al CLI de Supabase; el CLI corre desde el repo del
Club, que sí lo está, contra la misma base. Por eso no se usa `db push`.

```bash
./scripts/migrar.sh --ver    # qué falta, sin tocar nada
./scripts/migrar.sh          # aplica lo pendiente, en orden, y lo registra
```

La cuenta de lo aplicado vive en la tabla `truck_migraciones` (ver `0024`), no en
el historial del CLI, que le pertenece al repo del Club.

Si el repo del Club vive en otro lado: `HSC_REPO=/ruta/al/club ./scripts/migrar.sh`.

## Principios del sistema operativo

Vale la pena conocerlos antes de cambiar algo, porque cada uno existe por una
razón que no se ve en el código:

- **El stock no se edita, se deriva.** `truck_movimientos` es un libro
  append-only sin update ni delete. Un número editable no dice quién lo cambió ni
  por qué, que es justo lo que hace falta cuando algo no cuadra. Un error se
  corrige con **otro movimiento**.
- **Los traslados van en dos tiempos.** Enviar asienta la salida, recibir asienta
  la entrada. Si fuera un solo paso, lo que se pierde en el camino no aparecería
  en ningún lado.
- **Vender descuenta por trigger**, no desde la app, y al llegar a estado final.
  Si dependiera de que el punto de venta se acuerde, el día que falle la red el
  inventario miente y nadie se entera.
- **Servido ≠ bruto.** `bruto = servido ÷ rendimiento`. El chamberete pierde ~38%
  al brasearse y el aguacate trae hueso.
- **Las recetas piden el producto terminado**, no el crudo. El crudo lo consume
  producción. Si `truck_recetas_sospechosas` devuelve algo, un insumo se está
  descontando dos veces.
- **Las compras usan promedio ponderado**, no último precio: el último precio hace
  saltar el costo de todos los platillos por una compra chica de emergencia.
- **El estado no se rebobina.** La idempotencia de las funciones se apoya en leer
  `estado`; un trigger impide que el cliente lo regrese desde un estado terminal.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npx vitest run          # pruebas de la capa de métricas
```

## Lo que falta

- **Datos reales**: costos de proveedor y, sobre todo, los **rendimientos medidos
  en cocina**. Los cargados son referencias de industria para poder operar; son
  los que convierten el costeo de estimación en hecho.
- Multi-sucursal para otros restaurantes (decidido: después).
