// Catálogo de reportes en tabla. Cada reporte declara:
//  - fuentes: datos que necesita (se cargan una vez por filtro): habitaciones | pagos | logs | ganancias | comparativa | etiquetas | movimientos
//  - filtros: 'viaje' (obligatorio), 'viajeOpcional', 'fechas', 'usuario'
//  - columnas: { clave, titulo, tipo, total: 'suma' | 'conteo' }  (tipo: texto | monto | numero | fecha | fechaHora | porcentaje | firma)
//  - agruparPor (opcional): clave por la que se agrupa con subtotales
//  - construir(datos, filtros): devuelve las filas (objetos con las claves de las columnas)
import {
  calcularCuotaPersona, calcularTotalHabitacion, calcularTotalPagado, ninoDebePagar,
} from '../../../utils/calculos';
import { clavePeriodo, etiquetaPeriodo } from '../../../utils/formatters';

const EDAD = /\((\d+)\s*años?\)/;
const esNino = (p) => p.esNino || EDAD.test(p.n || '');
const edadDe = (p) => Number((p.n || '').match(EDAD)?.[1]) || null;
const pagado = (p) => (p.pagos || []).reduce((s, x) => s + Number(x.monto || 0), 0);
const conNombre = (h) => h.personas.filter((p) => p.n);
const etiquetaDe = (h) => h.etiqueta || 'Sin etiqueta';
const ordenHab = (a, b) => etiquetaDe(a).localeCompare(etiquetaDe(b), 'es')
  || String(a.num).localeCompare(String(b.num), 'es', { numeric: true });
const condicion = (h, p) => {
  if (h.stack) return 'Stack (habitación)';
  if (p.esStack) return 'Stack';
  if (esNino(p) && (p.esGratis || !ninoDebePagar(p, h.edadMinimaPago))) return 'Gratis';
  return 'Paga';
};
const nombreLimpio = (p) => (p.n || '').replace(EDAD, '').trim();

export const CATEGORIAS = [
  { id: 'cobranza', titulo: 'Cobranza', descripcion: 'Lo que se debe, lo que entró y a quién cobrar' },
  { id: 'logistica', titulo: 'Logística', descripcion: 'Listas para el hotel, el bus y el control de cortesías' },
  { id: 'viajes', titulo: 'Viajes y ganancias', descripcion: 'Comparar viajes y cerrar cuentas' },
  { id: 'control', titulo: 'Control y auditoría', descripcion: 'Quién cambió qué y cuándo' },
];

export const REPORTES = [
  // ═══ COBRANZA ═══
  {
    id: 'estado-cuenta', categoria: 'cobranza', titulo: 'Estado de cuenta del viaje',
    descripcion: 'Cada habitación con sus huéspedes, lo que debe pagar, lo pagado y lo que falta.',
    fuentes: ['habitaciones'], filtros: ['viaje'], agruparPor: 'etiqueta',
    columnas: [
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'huespedes', titulo: 'Huéspedes', tipo: 'texto', ancho: 40 },
      { clave: 'aPagar', titulo: 'A pagar', tipo: 'monto', total: 'suma' },
      { clave: 'pagado', titulo: 'Pagado', tipo: 'monto', total: 'suma' },
      { clave: 'restante', titulo: 'Restante', tipo: 'monto', total: 'suma' },
      { clave: 'avance', titulo: '% pagado', tipo: 'porcentaje' },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).map((h) => {
      const aPagar = calcularTotalHabitacion(h);
      const pag = calcularTotalPagado(h);
      return {
        etiqueta: etiquetaDe(h),
        habitacion: h.num,
        huespedes: conNombre(h).map((p) => p.n + (condicion(h, p) !== 'Paga' ? ` (${condicion(h, p).toLowerCase()})` : '')).join(', ') || '—',
        aPagar, pagado: pag, restante: Math.max(0, aPagar - pag),
        avance: aPagar > 0 ? Math.min(1, pag / aPagar) : h.stack ? 1 : 0,
      };
    }),
  },
  {
    id: 'lista-cobro', categoria: 'cobranza', titulo: 'Lista de cobro (deudores)',
    descripcion: 'Personas con saldo pendiente, de mayor a menor deuda, con la fecha de su último pago.',
    fuentes: ['habitaciones', 'pagos'], filtros: ['viaje'],
    columnas: [
      { clave: 'persona', titulo: 'Persona', tipo: 'texto', ancho: 30 },
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'etiqueta', titulo: 'Centro', tipo: 'texto', ancho: 18 },
      { clave: 'cuota', titulo: 'Cuota', tipo: 'monto', total: 'suma' },
      { clave: 'pagado', titulo: 'Pagado', tipo: 'monto', total: 'suma' },
      { clave: 'pendiente', titulo: 'Pendiente', tipo: 'monto', total: 'suma' },
      { clave: 'ultimoPago', titulo: 'Último pago', tipo: 'fecha' },
    ],
    construir: ({ habitaciones, pagos }) => {
      const ultimo = new Map();
      pagos.forEach((p) => {
        if (!ultimo.has(p.persona_id) || new Date(p.fecha) > new Date(ultimo.get(p.persona_id))) ultimo.set(p.persona_id, p.fecha);
      });
      return habitaciones.flatMap((h) => conNombre(h).map((p) => {
        const cuota = calcularCuotaPersona(h, p);
        const pag = pagado(p);
        return {
          persona: p.n, habitacion: h.num, etiqueta: etiquetaDe(h), cuota, pagado: pag,
          pendiente: Math.max(0, cuota - pag), ultimoPago: ultimo.get(p.id) || null,
        };
      })).filter((f) => f.pendiente > 0).sort((a, b) => b.pendiente - a.pendiente);
    },
  },
  {
    id: 'libro-caja', categoria: 'cobranza', titulo: 'Libro de caja',
    descripcion: 'Pagos registrados entre dos fechas, con quién los registró. Para cuadrar el dinero recibido.',
    fuentes: ['pagos'], filtros: ['fechas', 'viajeOpcional'], agruparPor: 'dia',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha y hora', tipo: 'fechaHora', ancho: 17 },
      { clave: 'persona', titulo: 'Persona', tipo: 'texto', ancho: 28 },
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'viaje', titulo: 'Viaje', tipo: 'texto', ancho: 24 },
      { clave: 'periodo', titulo: 'Mes aplicado', tipo: 'texto', ancho: 12 },
      { clave: 'registradoPor', titulo: 'Registró', tipo: 'texto', ancho: 12 },
      { clave: 'monto', titulo: 'Monto', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ pagos }) => pagos.map((p) => ({
      dia: new Date(p.fecha).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      fecha: p.fecha, persona: p.persona, habitacion: p.habitacion, viaje: p.viaje,
      periodo: etiquetaPeriodo(p.mes, p.anio), registradoPor: p.registrado_por || '—', monto: p.monto, divisa: p.divisa,
    })),
  },
  {
    id: 'pagos-mes', categoria: 'cobranza', titulo: 'Pagos por persona y mes',
    descripcion: 'Cada persona con su cuota y lo que pagó en cada mes.',
    fuentes: ['habitaciones'], filtros: ['viaje'], agruparPor: 'etiqueta',
    columnas: ({ habitaciones }) => {
      const periodos = new Map();
      habitaciones.forEach((h) => h.personas.forEach((p) => (p.pagos || []).forEach((g) => {
        periodos.set(clavePeriodo(g.mes, g.anio), etiquetaPeriodo(g.mes, g.anio));
      })));
      return [
        { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
        { clave: 'persona', titulo: 'Persona', tipo: 'texto', ancho: 28 },
        { clave: 'cuota', titulo: 'Cuota', tipo: 'monto', total: 'suma' },
        ...[...periodos.keys()].sort((a, b) => a - b)
          .map((k) => ({ clave: `m${k}`, titulo: periodos.get(k), tipo: 'monto', total: 'suma', ancho: 12 })),
        { clave: 'pagado', titulo: 'Total pagado', tipo: 'monto', total: 'suma' },
        { clave: 'pendiente', titulo: 'Pendiente', tipo: 'monto', total: 'suma' },
      ];
    },
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).flatMap((h) => conNombre(h).map((p) => {
      const cuota = calcularCuotaPersona(h, p);
      const fila = { etiqueta: etiquetaDe(h), habitacion: h.num, persona: p.n, cuota, pagado: pagado(p) };
      (p.pagos || []).forEach((g) => {
        const k = `m${clavePeriodo(g.mes, g.anio)}`;
        fila[k] = (fila[k] || 0) + Number(g.monto || 0);
      });
      fila.pendiente = Math.max(0, cuota - fila.pagado);
      return fila;
    })),
  },
  {
    id: 'al-dia', categoria: 'cobranza', titulo: 'Personas al día',
    descripcion: 'Quiénes ya pagaron el 100% de su cuota.',
    fuentes: ['habitaciones'], filtros: ['viaje'], agruparPor: 'etiqueta',
    columnas: [
      { clave: 'persona', titulo: 'Persona', tipo: 'texto', ancho: 32 },
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'cuota', titulo: 'Cuota', tipo: 'monto', total: 'suma' },
      { clave: 'pagado', titulo: 'Pagado', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).flatMap((h) => conNombre(h)
      .map((p) => ({ etiqueta: etiquetaDe(h), persona: p.n, habitacion: h.num, cuota: calcularCuotaPersona(h, p), pagado: pagado(p) }))
      .filter((f) => f.cuota > 0 && f.pagado >= f.cuota)),
  },
  {
    id: 'por-centro', categoria: 'cobranza', titulo: 'Resumen por centro / etiqueta',
    descripcion: 'Cobrado y pendiente de cada centro, para rendir cuentas a cada responsable.',
    fuentes: ['etiquetas'], filtros: ['viaje'],
    columnas: [
      { clave: 'etiqueta', titulo: 'Centro', tipo: 'texto', ancho: 26 },
      { clave: 'habitaciones', titulo: 'Hab.', tipo: 'numero', total: 'suma' },
      { clave: 'personas', titulo: 'Personas', tipo: 'numero', total: 'suma' },
      { clave: 'total', titulo: 'Por cobrar', tipo: 'monto', total: 'suma' },
      { clave: 'pagado', titulo: 'Pagado', tipo: 'monto', total: 'suma' },
      { clave: 'pendiente', titulo: 'Pendiente', tipo: 'monto', total: 'suma' },
      { clave: 'avance', titulo: '% cobrado', tipo: 'porcentaje' },
    ],
    construir: ({ etiquetas }) => etiquetas.map((e) => ({
      etiqueta: e.etiqueta, habitaciones: e.habitaciones, personas: e.personas,
      total: e.total_por_cobrar, pagado: e.total_pagado, pendiente: e.pendiente,
      avance: e.total_por_cobrar > 0 ? e.total_pagado / e.total_por_cobrar : 0,
    })),
  },

  // ═══ LOGÍSTICA ═══
  {
    id: 'rooming', categoria: 'logistica', titulo: 'Rooming list',
    descripcion: 'Habitaciones con sus ocupantes (adultos y niños con edad) y notas. Para enviar al hotel.',
    fuentes: ['habitaciones'], filtros: ['viaje'], agruparPor: 'etiqueta',
    columnas: [
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'tipo', titulo: 'Tipo', tipo: 'texto', ancho: 9 },
      { clave: 'adultos', titulo: 'Adultos', tipo: 'texto', ancho: 38 },
      { clave: 'ninos', titulo: 'Niños (edad)', tipo: 'texto', ancho: 28 },
      { clave: 'pax', titulo: 'Pax', tipo: 'numero', total: 'suma', ancho: 6 },
      { clave: 'nota', titulo: 'Notas', tipo: 'texto', ancho: 28 },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).map((h) => {
      const personas = conNombre(h);
      return {
        etiqueta: etiquetaDe(h), habitacion: h.num, tipo: h.tipo || '—',
        adultos: personas.filter((p) => !esNino(p)).map((p) => p.n).join(', ') || '—',
        ninos: personas.filter(esNino).map((p) => (edadDe(p) !== null ? `${nombreLimpio(p)} (${edadDe(p)})` : p.n)).join(', ') || '—',
        pax: personas.length, nota: h.nota || '',
      };
    }),
  },
  {
    id: 'manifiesto', categoria: 'logistica', titulo: 'Manifiesto de pasajeros',
    descripcion: 'Lista numerada de todos los pasajeros con columna de firma. Para el bus o el tour.',
    fuentes: ['habitaciones'], filtros: ['viaje'],
    columnas: [
      { clave: 'n', titulo: '#', tipo: 'numero', ancho: 5 },
      { clave: 'persona', titulo: 'Pasajero', tipo: 'texto', ancho: 32 },
      { clave: 'categoria', titulo: 'Adulto / niño', tipo: 'texto', ancho: 14 },
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'etiqueta', titulo: 'Centro', tipo: 'texto', ancho: 18 },
      { clave: 'firma', titulo: 'Firma', tipo: 'firma', ancho: 24 },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab)
      .flatMap((h) => conNombre(h).map((p) => ({
        persona: nombreLimpio(p) || p.n,
        categoria: esNino(p) ? `Niño${edadDe(p) !== null ? ` (${edadDe(p)} años)` : ''}` : 'Adulto',
        habitacion: h.num, etiqueta: etiquetaDe(h), firma: '',
      })))
      .map((f, i) => ({ n: i + 1, ...f })),
  },
  {
    id: 'ninos', categoria: 'logistica', titulo: 'Niños y política de edad',
    descripcion: 'Cada niño con su edad, si paga o entra gratis y su precio.',
    fuentes: ['habitaciones'], filtros: ['viaje'],
    columnas: [
      { clave: 'persona', titulo: 'Niño', tipo: 'texto', ancho: 28 },
      { clave: 'edad', titulo: 'Edad', tipo: 'numero', ancho: 7 },
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'condicion', titulo: 'Condición', tipo: 'texto', ancho: 26 },
      { clave: 'precio', titulo: 'Precio', tipo: 'monto', total: 'suma' },
      { clave: 'pagado', titulo: 'Pagado', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).flatMap((h) => conNombre(h).filter(esNino).map((p) => {
      const precio = calcularCuotaPersona(h, p);
      let cond = 'Paga precio niño';
      if (h.stack || p.esStack) cond = 'Stack';
      else if (p.esGratis) cond = 'Gratis (marcado)';
      else if (!ninoDebePagar(p, h.edadMinimaPago)) cond = `Gratis (menor de ${h.edadMinimaPago} años)`;
      return { persona: nombreLimpio(p) || p.n, edad: edadDe(p), habitacion: h.num, condicion: cond, precio, pagado: pagado(p) };
    })),
  },
  {
    id: 'cortesias', categoria: 'logistica', titulo: 'Cortesías (stack y gratis)',
    descripcion: 'Quién no paga y por qué, con el valor que no se cobra.',
    fuentes: ['habitaciones'], filtros: ['viaje'],
    columnas: [
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'persona', titulo: 'Persona', tipo: 'texto', ancho: 32 },
      { clave: 'tipo', titulo: 'Cortesía', tipo: 'texto', ancho: 26 },
      { clave: 'valor', titulo: 'Valor no cobrado', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).flatMap((h) => {
      if (h.stack) {
        return [{ habitacion: h.num, persona: conNombre(h).map((p) => p.n).join(', ') || '—', tipo: 'Habitación stack', valor: Number(h.total) || 0 }];
      }
      return conNombre(h).filter((p) => condicion(h, p) !== 'Paga').map((p) => ({
        habitacion: h.num, persona: p.n,
        tipo: p.esStack ? 'Stack (lo cubren los demás de la habitación)' : 'Niño gratis',
        valor: p.esStack ? 0 : Number(h.precioNino) || 0,
      }));
    }),
  },
  {
    id: 'revision', categoria: 'logistica', titulo: 'Habitaciones en revisión',
    descripcion: 'Habitaciones marcadas para revisar, con el motivo y desde cuándo.',
    fuentes: ['habitaciones'], filtros: ['viaje'],
    columnas: [
      { clave: 'habitacion', titulo: 'Hab.', tipo: 'texto', ancho: 8 },
      { clave: 'etiqueta', titulo: 'Centro', tipo: 'texto', ancho: 18 },
      { clave: 'huespedes', titulo: 'Huéspedes', tipo: 'texto', ancho: 30 },
      { clave: 'motivo', titulo: 'Motivo', tipo: 'texto', ancho: 36 },
      { clave: 'por', titulo: 'Marcó', tipo: 'texto', ancho: 12 },
      { clave: 'desde', titulo: 'Desde', tipo: 'fecha' },
    ],
    construir: ({ habitaciones }) => [...habitaciones].sort(ordenHab).filter((h) => h.enRevision).map((h) => ({
      habitacion: h.num, etiqueta: etiquetaDe(h), huespedes: conNombre(h).map((p) => p.n).join(', '),
      motivo: h.revisionNota || '—', por: h.revisionPor || '—', desde: h.revisionAt,
    })),
  },

  // ═══ VIAJES Y GANANCIAS ═══
  {
    id: 'comparativa', categoria: 'viajes', titulo: 'Comparativa de viajes',
    descripcion: 'Totales, % cobrado, habitaciones, personas y ganancia de cada viaje.',
    fuentes: ['comparativa', 'ganancias'], filtros: [],
    columnas: [
      { clave: 'viaje', titulo: 'Viaje', tipo: 'texto', ancho: 28 },
      { clave: 'estado', titulo: 'Estado', tipo: 'texto', ancho: 9 },
      { clave: 'habitaciones', titulo: 'Hab.', tipo: 'numero', total: 'suma' },
      { clave: 'personas', titulo: 'Personas', tipo: 'numero', total: 'suma' },
      { clave: 'total', titulo: 'Por cobrar', tipo: 'monto', total: 'suma' },
      { clave: 'pagado', titulo: 'Cobrado', tipo: 'monto', total: 'suma' },
      { clave: 'pendiente', titulo: 'Pendiente', tipo: 'monto', total: 'suma' },
      { clave: 'avance', titulo: '% cobrado', tipo: 'porcentaje' },
      { clave: 'ganancia', titulo: 'Ganancia est.', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ comparativa, ganancias }) => comparativa.map((c) => {
      const g = ganancias.find((x) => x.id === c.id) || {};
      return {
        viaje: c.nombre, estado: g.estado === 'cerrado' ? 'Cerrado' : 'Activo', habitaciones: c.habitaciones, personas: c.personas,
        total: c.total_por_cobrar, pagado: c.total_pagado, pendiente: c.pendiente,
        avance: c.total_por_cobrar > 0 ? c.total_pagado / c.total_por_cobrar : 0,
        ganancia: g.ganancia_estimada || 0, divisa: g.divisa,
      };
    }),
  },
  {
    id: 'ganancias', categoria: 'viajes', titulo: 'Ganancias por viaje',
    descripcion: 'Margen configurado, ganancia estimada, cobrada y pendiente de cada viaje.',
    fuentes: ['ganancias'], filtros: [],
    columnas: [
      { clave: 'viaje', titulo: 'Viaje', tipo: 'texto', ancho: 28 },
      { clave: 'margen', titulo: 'Margen', tipo: 'texto', ancho: 18 },
      { clave: 'pax', titulo: 'Pax que pagan', tipo: 'numero', total: 'suma' },
      { clave: 'vendido', titulo: 'Vendido', tipo: 'monto', total: 'suma' },
      { clave: 'estimada', titulo: 'Ganancia est.', tipo: 'monto', total: 'suma' },
      { clave: 'cobrada', titulo: 'Cobrada', tipo: 'monto', total: 'suma' },
      { clave: 'porCobrar', titulo: 'Por cobrar', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ ganancias }) => ganancias.filter((g) => g.ganancia_tipo !== 'ninguna').map((g) => ({
      viaje: g.nombre,
      margen: g.ganancia_tipo === 'porcentaje' ? `${g.ganancia_valor}% del total` : `${g.ganancia_valor} por persona`,
      pax: g.pax, vendido: g.total_por_cobrar, estimada: g.ganancia_estimada, cobrada: g.ganancia_cobrada,
      porCobrar: Math.max(0, g.ganancia_estimada - g.ganancia_cobrada), divisa: g.divisa,
    })),
  },
  {
    id: 'cierre', categoria: 'viajes', titulo: 'Cierre de viajes',
    descripcion: 'Viajes cerrados: lo cobrado al final, lo que no se cobró y la ganancia real.',
    fuentes: ['ganancias'], filtros: [],
    columnas: [
      { clave: 'viaje', titulo: 'Viaje', tipo: 'texto', ancho: 28 },
      { clave: 'fin', titulo: 'Terminó', tipo: 'fecha' },
      { clave: 'vendido', titulo: 'Vendido', tipo: 'monto', total: 'suma' },
      { clave: 'cobrado', titulo: 'Cobrado', tipo: 'monto', total: 'suma' },
      { clave: 'noCobrado', titulo: 'No cobrado', tipo: 'monto', total: 'suma' },
      { clave: 'avance', titulo: '% cobrado', tipo: 'porcentaje' },
      { clave: 'ganancia', titulo: 'Ganancia real', tipo: 'monto', total: 'suma' },
    ],
    construir: ({ ganancias }) => ganancias.filter((g) => g.estado === 'cerrado').map((g) => ({
      viaje: g.nombre, fin: g.fecha_fin || g.fecha_inicio, vendido: g.total_por_cobrar, cobrado: g.total_pagado,
      noCobrado: Math.max(0, g.total_por_cobrar - g.total_pagado),
      avance: g.total_por_cobrar > 0 ? g.total_pagado / g.total_por_cobrar : 0,
      ganancia: g.ganancia_cobrada, divisa: g.divisa,
    })),
  },

  // ═══ CONTROL ═══
  {
    id: 'pagos-modificados', categoria: 'control', titulo: 'Pagos editados o eliminados',
    descripcion: 'Cada cambio a un pago ya registrado: antes → después, quién y cuándo.',
    fuentes: ['logs'], filtros: ['fechas', 'usuario'], logs: { tipo: 'pagos', acciones: 'editar,eliminar' },
    columnas: [
      { clave: 'fecha', titulo: 'Fecha y hora', tipo: 'fechaHora', ancho: 17 },
      { clave: 'usuario', titulo: 'Usuario', tipo: 'texto', ancho: 12 },
      { clave: 'accion', titulo: 'Acción', tipo: 'texto', ancho: 10 },
      { clave: 'detalle', titulo: 'Detalle', tipo: 'texto', ancho: 70 },
      { clave: 'estado', titulo: 'Estado', tipo: 'texto', ancho: 14 },
    ],
    construir: ({ logs }) => logs.map((l) => ({
      fecha: l.fecha, usuario: l.usuario, accion: l.accion === 'eliminar' ? 'Eliminó' : 'Editó',
      detalle: l.descripcion.replace(new RegExp(`^${l.usuario} `), ''),
      estado: l.deshechoAt ? `Deshecho (${l.deshechoPor})` : 'Vigente',
    })),
  },
  {
    id: 'actividad-usuario', categoria: 'control', titulo: 'Actividad por usuario',
    descripcion: 'Todas las acciones de los usuarios en un rango de fechas.',
    fuentes: ['logs'], filtros: ['fechas', 'usuario'], logs: { tipo: 'usuarios' }, agruparPor: 'usuario',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha y hora', tipo: 'fechaHora', ancho: 17 },
      { clave: 'accion', titulo: 'Acción', tipo: 'texto', ancho: 14 },
      { clave: 'detalle', titulo: 'Detalle', tipo: 'texto', ancho: 80 },
    ],
    construir: ({ logs }) => logs.map((l) => ({
      usuario: l.usuario || '—', fecha: l.fecha, accion: l.accion,
      detalle: l.descripcion.replace(new RegExp(`^${l.usuario} `), ''),
    })),
  },
  {
    id: 'movimientos', categoria: 'control', titulo: 'Movimientos entre habitaciones',
    descripcion: 'Quién se movió, de qué habitación a cuál y cuándo.',
    fuentes: ['movimientos'], filtros: ['viajeOpcional'],
    columnas: [
      { clave: 'fecha', titulo: 'Fecha y hora', tipo: 'fechaHora', ancho: 17 },
      { clave: 'persona', titulo: 'Persona', tipo: 'texto', ancho: 28 },
      { clave: 'origen', titulo: 'De hab.', tipo: 'texto', ancho: 9 },
      { clave: 'destino', titulo: 'A hab.', tipo: 'texto', ancho: 9 },
      { clave: 'viaje', titulo: 'Viaje', tipo: 'texto', ancho: 24 },
      { clave: 'usuario', titulo: 'Usuario', tipo: 'texto', ancho: 12 },
    ],
    construir: ({ movimientos }) => movimientos.map((m) => ({ ...m, usuario: m.usuario || '—', origen: m.origen || '—', destino: m.destino || '—' })),
  },
];
