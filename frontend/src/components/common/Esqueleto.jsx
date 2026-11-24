// Esqueletos de carga: imitan la forma de cada pantalla mientras llegan los datos.

/** Bloque base con brillo. */
export const Hueso = ({ className = '', redondo = false, style }) => (
  <span aria-hidden="true" className={`esqueleto ${redondo ? 'esqueleto-redondo' : ''} ${className}`} style={style} />
);

/** Contenedor accesible: avisa a lectores de pantalla que se está cargando. */
const Cargando = ({ children, className = '' }) => (
  <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">Cargando…</span>
    {children}
  </div>
);

/** Título y subtítulo de página. */
export const EsqueletoEncabezado = ({ conMigas = false, conAcciones = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div className="space-y-2.5">
      {conMigas && <Hueso className="h-3 w-36" />}
      <Hueso className="h-8 w-64 max-w-full" />
      <Hueso className="h-3.5 w-80 max-w-full" />
    </div>
    {conAcciones && (
      <div className="flex gap-2">
        <Hueso className="h-10 w-28" />
        <Hueso className="h-10 w-32" />
      </div>
    )}
  </div>
);

/** Fila de 4 tarjetas de monto. */
export const EsqueletoMontos = ({ cantidad = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    {Array.from({ length: cantidad }, (_, i) => (
      <div key={i} className="tarjeta p-5">
        <div className="flex items-center justify-between">
          <Hueso className="h-3.5 w-24" />
          <Hueso className="h-7 w-7" />
        </div>
        <Hueso className="h-7 w-40 mt-3.5" />
        <Hueso className="h-2.5 w-32 mt-3.5" />
      </div>
    ))}
  </div>
);

/** Tarjeta con título y barras (como "Cobro por viaje"). */
export const EsqueletoBarras = ({ filas = 4, className = '' }) => (
  <div className={`tarjeta p-6 ${className}`}>
    <Hueso className="h-4 w-36" />
    <Hueso className="h-3 w-52 mt-2" />
    <div className="mt-6 space-y-5">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-2.5">
            <Hueso className="h-3.5" style={{ width: `${35 + ((i * 17) % 30)}%` }} />
            <Hueso className="h-3.5 w-28" />
          </div>
          <Hueso className="h-2 w-full" redondo />
        </div>
      ))}
    </div>
  </div>
);

/** Tarjeta de gráfico: título y un área con barras de distintas alturas. */
export const EsqueletoGrafico = ({ alto = 240, className = '', tipo = 'barras' }) => (
  <div className={`tarjeta p-6 ${className}`}>
    <Hueso className="h-4 w-40" />
    <Hueso className="h-3 w-60 max-w-full mt-2" />
    {tipo === 'dona' ? (
      <div className="flex items-center justify-center" style={{ height: alto }}>
        <span aria-hidden="true" className="esqueleto esqueleto-redondo"
          style={{ width: alto * 0.7, height: alto * 0.7, WebkitMask: 'radial-gradient(circle, transparent 52%, #000 53%)', mask: 'radial-gradient(circle, transparent 52%, #000 53%)' }} />
      </div>
    ) : (
      <div className="mt-6 flex items-end gap-3" style={{ height: alto }}>
        {[55, 80, 40, 95, 65, 75, 35, 85, 60].map((h, i) => (
          <Hueso key={i} className="flex-1 !rounded-t-md !rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    )}
  </div>
);

/** Filas de tabla / lista. */
export const EsqueletoFilas = ({ filas = 6, columnas = 4, avatar = false }) => (
  <div>
    {Array.from({ length: filas }, (_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-slate-100 first:border-t-0">
        {avatar && <Hueso className="h-9 w-9 shrink-0" />}
        <div className="flex-1 space-y-2 min-w-0">
          <Hueso className="h-3.5" style={{ width: `${40 + ((i * 23) % 40)}%` }} />
          <Hueso className="h-2.5 w-28" />
        </div>
        {Array.from({ length: Math.max(0, columnas - 1) }, (_, c) => (
          <Hueso key={c} className="h-3.5 w-20 hidden sm:block" />
        ))}
      </div>
    ))}
  </div>
);

/** Tarjeta de "Mis viajes". */
const EsqueletoTarjetaViaje = () => (
  <div className="tarjeta p-5">
    <div className="flex items-start gap-3.5">
      <Hueso className="h-10 w-10 shrink-0 !rounded-xl" />
      <div className="flex-1 space-y-2">
        <Hueso className="h-4 w-3/4" />
        <Hueso className="h-3 w-1/2" />
      </div>
      <Hueso className="h-5 w-16" redondo />
    </div>
    <div className="mt-6 flex justify-between"><Hueso className="h-3 w-16" /><Hueso className="h-3 w-8" /></div>
    <Hueso className="h-1.5 w-full mt-2" redondo />
    <div className="mt-5 pt-4 border-t border-slate-100 flex gap-6">
      <div className="space-y-1.5"><Hueso className="h-2.5 w-14" /><Hueso className="h-4 w-20" /></div>
      <div className="space-y-1.5"><Hueso className="h-2.5 w-16" /><Hueso className="h-4 w-20" /></div>
    </div>
  </div>
);

// ── Pantallas completas ─────────────────────────────────────────────────────

export const EsqueletoDashboard = () => (
  <Cargando className="space-y-5">
    <EsqueletoMontos />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <EsqueletoBarras className="lg:col-span-2" />
      <EsqueletoGrafico tipo="dona" alto={220} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <EsqueletoBarras className="lg:col-span-2" filas={3} />
      <EsqueletoBarras filas={2} />
    </div>
  </Cargando>
);

export const EsqueletoMisViajes = ({ cantidad = 6 }) => (
  <Cargando className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: cantidad }, (_, i) => <EsqueletoTarjetaViaje key={i} />)}
  </Cargando>
);

export const EsqueletoViaje = () => (
  <Cargando className="space-y-5">
    <EsqueletoEncabezado conMigas conAcciones />
    <EsqueletoMontos />
    <div className="tarjeta h-[52px] flex items-center gap-6 px-5">
      {[0, 1, 2, 3].map((i) => <Hueso key={i} className="h-3.5 flex-1" />)}
    </div>
    <div className="tarjeta overflow-hidden">
      <div className="flex flex-wrap gap-3 p-5 border-b border-slate-100">
        <Hueso className="h-10 flex-1 min-w-[200px]" />
        <Hueso className="h-10 w-72" />
        <Hueso className="h-10 w-28" />
        <Hueso className="h-10 w-44" />
      </div>
      <EsqueletoFilas filas={7} columnas={4} />
    </div>
  </Cargando>
);

export const EsqueletoPagina = () => (
  <Cargando className="space-y-6">
    <EsqueletoEncabezado conAcciones />
    <EsqueletoMontos />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <EsqueletoGrafico />
      <EsqueletoGrafico />
    </div>
  </Cargando>
);

export const EsqueletoReportes = () => (
  <Cargando className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <EsqueletoGrafico />
    <EsqueletoGrafico tipo="dona" />
  </Cargando>
);

export const EsqueletoLista = ({ filas = 8, avatar = true }) => (
  <Cargando><EsqueletoFilas filas={filas} columnas={1} avatar={avatar} /></Cargando>
);
