// Exportaciones a Excel con formato (ExcelJS se carga solo al exportar, para no pesar en la app).
import { calcularCuotaPersona, calcularTotalHabitacion, ninoDebePagar } from './calculos';
import { clavePeriodo, etiquetaPeriodo } from './formatters';

const cargarExcelJS = async () => (await import('exceljs')).default;

// ── Estilos ────────────────────────────────────────────────────────────────
const COLOR_ENCABEZADO = 'FF8EB4E3';
const COLOR_SEPARADOR = 'FFD9D9D9';
const COLOR_GRUPO = 'FFDDEBF7';
const COLOR_SUBTOTAL = 'FFF2F2F2';
const FORMATO_MONTO = '#,##0.00;-#,##0.00;"-"';
const BORDE = { style: 'thin', color: { argb: 'FF000000' } };
const BORDES = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };

const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const estilarFila = (fila, desde, hasta, estilo) => {
  for (let c = desde; c <= hasta; c += 1) {
    const celda = fila.getCell(c);
    celda.border = BORDES;
    if (estilo.fill) celda.fill = relleno(estilo.fill);
    if (estilo.bold || estilo.italic) celda.font = { bold: !!estilo.bold, italic: !!estilo.italic };
  }
};

const descargar = async (wb, nombre) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre.replace(/[\\/:*?"<>|]+/g, '-')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const fechaHoy = () => new Intl.DateTimeFormat('es-DO', { dateStyle: 'long' }).format(new Date());

/** Título (fila 1) y subtítulo (fila 2); los datos empiezan en la fila 4. */
const escribirTitulo = (ws, titulo, subtitulo, columnas) => {
  ws.mergeCells(1, 1, 1, columnas);
  ws.getCell(1, 1).value = titulo;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, columnas);
  ws.getCell(2, 1).value = subtitulo;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF666666' } };
};

const escribirEncabezado = (ws, numFila, titulos) => {
  const fila = ws.getRow(numFila);
  titulos.forEach((t, i) => { fila.getCell(i + 1).value = t; });
  estilarFila(fila, 1, titulos.length, { fill: COLOR_ENCABEZADO, bold: true });
  fila.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  fila.height = 20;
};

// ── Datos comunes ──────────────────────────────────────────────────────────
const esNino = (p) => p.esNino || /\(\d+ años?\)/.test(p.n || '');
const esGratis = (hab, p) => esNino(p) && (p.esGratis || !ninoDebePagar(p, hab.edadMinimaPago));
const pagadoPersona = (p) => (p.pagos || []).reduce((s, pg) => s + Number(pg.monto || 0), 0);
const nombreHuesped = (hab, p) => `${p.n}${esGratis(hab, p) ? ' — gratis' : ''}`;

/** Habitaciones ordenadas como en la app (etiqueta, luego número) y agrupadas por etiqueta. */
const agruparPorEtiqueta = (habitaciones) => {
  const ordenadas = [...habitaciones].sort((a, b) =>
    (a.etiqueta || '').localeCompare(b.etiqueta || '', 'es') ||
    String(a.num).localeCompare(String(b.num), 'es', { numeric: true }));
  const grupos = new Map();
  ordenadas.forEach((h) => {
    const clave = h.etiqueta || '';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(h);
  });
  return [...grupos.entries()];
};

const personasDe = (hab) => {
  const conNombre = hab.personas.filter((p) => p.n);
  return conNombre.length ? conNombre : [{ n: '—', pagos: [] }];
};

const nombreArchivo = (viaje, tipo) => `${viaje?.nombre || 'viaje'} - ${tipo}`;

/** Agrega una fila de grupo (etiqueta) que ocupa todas las columnas. */
const filaGrupo = (ws, numFila, texto, columnas) => {
  ws.mergeCells(numFila, 1, numFila, columnas);
  const fila = ws.getRow(numFila);
  fila.getCell(1).value = texto;
  estilarFila(fila, 1, columnas, { fill: COLOR_GRUPO, bold: true });
};

const filaSeparador = (ws, numFila, columnas) => {
  estilarFila(ws.getRow(numFila), 1, columnas, { fill: COLOR_SEPARADOR });
  ws.getRow(numFila).height = 8;
};

// ═══ Excel rápido: total por habitación y cuánto han pagado ═══════════════
export const exportarExcelRapido = async (habitaciones, viaje) => {
  if (!habitaciones.length) { alert('No hay habitaciones para exportar.'); return; }
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rápido', { views: [{ state: 'frozen', ySplit: 4 }] });
  const COLS = 5;
  ws.columns = [{ width: 14 }, { width: 38 }, { width: 17 }, { width: 17 }, { width: 17 }];

  escribirTitulo(ws, `${viaje?.nombre || 'Viaje'} — Resumen de pagos`,
    `Generado el ${fechaHoy()} · Montos en ${viaje?.divisa || 'USD'}`, COLS);
  escribirEncabezado(ws, 4, ['Habitación', 'Huésped', 'Monto a Pagar', 'Monto pagado', 'Monto Restante']);

  const grupos = agruparPorEtiqueta(habitaciones);
  const conGrupos = grupos.length > 1 || grupos[0][0] !== '';
  const totales = { aPagar: 0, pagado: 0, restante: 0 };
  let r = 5;

  grupos.forEach(([etiqueta, habs]) => {
    if (conGrupos) filaGrupo(ws, r++, etiqueta || 'Sin etiqueta', COLS);
    const sub = { aPagar: 0, pagado: 0, restante: 0 };

    habs.forEach((hab, i) => {
      if (i > 0) filaSeparador(ws, r++, COLS);
      const personas = personasDe(hab);
      const aPagar = hab.stack ? 0 : calcularTotalHabitacion(hab);
      const pagado = hab.personas.reduce((s, p) => s + pagadoPersona(p), 0);
      const restante = Math.max(0, aPagar - pagado);
      const inicio = r;

      personas.forEach((p) => {
        const fila = ws.getRow(r++);
        fila.getCell(2).value = nombreHuesped(hab, p);
        estilarFila(fila, 1, COLS, {});
      });
      const fin = r - 1;

      ws.getCell(inicio, 1).value = Number.isNaN(Number(hab.num)) ? hab.num : Number(hab.num);
      ws.getCell(inicio, 3).value = hab.stack ? 'STACK' : aPagar;
      ws.getCell(inicio, 4).value = pagado;
      ws.getCell(inicio, 5).value = hab.stack ? 0 : restante;
      [1, 3, 4, 5].forEach((c) => { if (fin > inicio) ws.mergeCells(inicio, c, fin, c); });
      ws.getCell(inicio, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      [3, 4, 5].forEach((c) => {
        ws.getCell(inicio, c).numFmt = FORMATO_MONTO;
        ws.getCell(inicio, c).alignment = { horizontal: hab.stack && c === 3 ? 'center' : 'right', vertical: 'middle' };
      });

      sub.aPagar += aPagar; sub.pagado += pagado; sub.restante += restante;
    });

    if (conGrupos) {
      const fila = ws.getRow(r++);
      fila.getCell(2).value = `Subtotal ${etiqueta || 'Sin etiqueta'}`;
      fila.getCell(3).value = sub.aPagar;
      fila.getCell(4).value = sub.pagado;
      fila.getCell(5).value = sub.restante;
      estilarFila(fila, 1, COLS, { fill: COLOR_SUBTOTAL, bold: true });
      fila.getCell(2).alignment = { horizontal: 'right' };
      [3, 4, 5].forEach((c) => { fila.getCell(c).numFmt = FORMATO_MONTO; });
    }
    totales.aPagar += sub.aPagar; totales.pagado += sub.pagado; totales.restante += sub.restante;
  });

  const fila = ws.getRow(r);
  fila.getCell(2).value = 'Total General';
  fila.getCell(3).value = totales.aPagar;
  fila.getCell(4).value = totales.pagado;
  fila.getCell(5).value = totales.restante;
  estilarFila(fila, 1, COLS, { bold: true });
  fila.getCell(2).alignment = { horizontal: 'right' };
  [3, 4, 5].forEach((c) => { fila.getCell(c).numFmt = FORMATO_MONTO; });

  await descargar(wb, nombreArchivo(viaje, 'Excel rápido'));
};

// ═══ Excel detallado: cada persona, su cuota y lo pagado por mes ══════════
export const exportarExcelDetallado = async (habitaciones, viaje) => {
  if (!habitaciones.length) { alert('No hay habitaciones para exportar.'); return; }
  const ExcelJS = await cargarExcelJS();

  // Columnas de meses: todos los periodos (mes + año) con pagos en el viaje, en orden
  const periodos = new Map();
  habitaciones.forEach((h) => h.personas.forEach((p) => (p.pagos || []).forEach((pg) => {
    periodos.set(clavePeriodo(pg.mes, pg.anio), etiquetaPeriodo(pg.mes, pg.anio));
  })));
  const claves = [...periodos.keys()].sort((a, b) => a - b);
  const COL_MES = 4; // primera columna de meses
  const COL_PAGADO = COL_MES + claves.length;
  const COL_PENDIENTE = COL_PAGADO + 1;
  const COLS = COL_PENDIENTE;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Detallado', { views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }] });
  ws.columns = [
    { width: 12 }, { width: 36 }, { width: 14 },
    ...claves.map(() => ({ width: 12 })),
    { width: 15 }, { width: 15 },
  ];

  escribirTitulo(ws, `${viaje?.nombre || 'Viaje'} — Pagos por persona y mes`,
    `Generado el ${fechaHoy()} · Montos en ${viaje?.divisa || 'USD'}`, COLS);
  escribirEncabezado(ws, 4, ['Habitación', 'Huésped', 'Cuota', ...claves.map((k) => periodos.get(k)), 'Total pagado', 'Pendiente']);

  const montos = (fila, desde, hasta) => {
    for (let c = desde; c <= hasta; c += 1) fila.getCell(c).numFmt = FORMATO_MONTO;
  };
  const totalMes = Object.fromEntries(claves.map((k) => [k, 0]));
  const totales = { cuota: 0, pagado: 0, pendiente: 0 };
  const grupos = agruparPorEtiqueta(habitaciones);
  const conGrupos = grupos.length > 1 || grupos[0][0] !== '';
  let r = 5;

  grupos.forEach(([etiqueta, habs]) => {
    if (conGrupos) filaGrupo(ws, r++, etiqueta || 'Sin etiqueta', COLS);

    habs.forEach((hab) => {
      const personas = personasDe(hab);
      const inicio = r;
      const subHab = { cuota: 0, pagado: 0, pendiente: 0, meses: Object.fromEntries(claves.map((k) => [k, 0])) };

      personas.forEach((p) => {
        const fila = ws.getRow(r++);
        const cuota = hab.stack || !p.id ? 0 : calcularCuotaPersona(hab, p);
        const pagado = pagadoPersona(p);
        const pendiente = Math.max(0, cuota - pagado);
        fila.getCell(2).value = nombreHuesped(hab, p);
        fila.getCell(3).value = hab.stack ? 'STACK' : cuota;
        claves.forEach((k, i) => {
          const monto = (p.pagos || [])
            .filter((pg) => clavePeriodo(pg.mes, pg.anio) === k)
            .reduce((s, pg) => s + Number(pg.monto || 0), 0);
          fila.getCell(COL_MES + i).value = monto;
          subHab.meses[k] += monto;
        });
        fila.getCell(COL_PAGADO).value = pagado;
        fila.getCell(COL_PENDIENTE).value = pendiente;
        estilarFila(fila, 1, COLS, {});
        montos(fila, 3, COLS);
        if (hab.stack) fila.getCell(3).alignment = { horizontal: 'center' };
        subHab.cuota += cuota; subHab.pagado += pagado; subHab.pendiente += pendiente;
      });

      const fin = r - 1;
      ws.getCell(inicio, 1).value = Number.isNaN(Number(hab.num)) ? hab.num : Number(hab.num);
      if (fin > inicio) ws.mergeCells(inicio, 1, fin, 1);
      ws.getCell(inicio, 1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Subtotal de la habitación (sirve también de separador)
      const fila = ws.getRow(r++);
      fila.getCell(2).value = `Total Hab. ${hab.num}`;
      fila.getCell(3).value = subHab.cuota;
      claves.forEach((k, i) => { fila.getCell(COL_MES + i).value = subHab.meses[k]; totalMes[k] += subHab.meses[k]; });
      fila.getCell(COL_PAGADO).value = subHab.pagado;
      fila.getCell(COL_PENDIENTE).value = subHab.pendiente;
      estilarFila(fila, 1, COLS, { fill: COLOR_SEPARADOR, italic: true });
      fila.getCell(2).alignment = { horizontal: 'right' };
      montos(fila, 3, COLS);
      totales.cuota += subHab.cuota; totales.pagado += subHab.pagado; totales.pendiente += subHab.pendiente;
    });
  });

  const fila = ws.getRow(r);
  fila.getCell(2).value = 'Total General';
  fila.getCell(3).value = totales.cuota;
  claves.forEach((k, i) => { fila.getCell(COL_MES + i).value = totalMes[k]; });
  fila.getCell(COL_PAGADO).value = totales.pagado;
  fila.getCell(COL_PENDIENTE).value = totales.pendiente;
  estilarFila(fila, 1, COLS, { bold: true, fill: COLOR_ENCABEZADO });
  fila.getCell(2).alignment = { horizontal: 'right' };
  montos(fila, 3, COLS);

  await descargar(wb, nombreArchivo(viaje, 'Excel detallado'));
};

// ═══ Lista simple de pasajeros (Reportes › Rendimiento) ══════════════════
export const exportarHabitacionesExcel = async (habitaciones, viaje) => {
  const filas = [];
  agruparPorEtiqueta(habitaciones).forEach(([, habs]) => habs.forEach((hab) => {
    hab.personas.filter((p) => p.n).forEach((p, idx) => {
      filas.push([hab.num, hab.etiqueta || '', p.n, p.posicion || idx + 1]);
    });
  }));
  if (!filas.length) { alert('No hay personas registradas para exportar.'); return; }

  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Pasajeros', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [{ width: 14 }, { width: 24 }, { width: 36 }, { width: 10 }];
  escribirEncabezado(ws, 1, ['Habitación', 'Centro', 'Pasajero', 'Posición']);
  filas.forEach((valores, i) => {
    const fila = ws.getRow(i + 2);
    valores.forEach((v, c) => { fila.getCell(c + 1).value = v; });
    estilarFila(fila, 1, 4, {});
  });
  await descargar(wb, viaje?.nombre ? `${viaje.nombre} - pasajeros` : 'pasajeros');
};

// ═══ Reporte de ganancias ═════════════════════════════════════════════════
const describirGanancia = (v) =>
  v.ganancia_tipo === 'porcentaje' ? `${v.ganancia_valor}% del total`
    : v.ganancia_tipo === 'por_persona' ? `${v.ganancia_valor} por persona`
      : 'Sin configurar';

export const exportarGananciasExcel = async (filas, nombre = 'reporte-ganancias') => {
  if (!filas.length) { alert('No hay viajes para exportar.'); return; }
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ganancias', { views: [{ state: 'frozen', ySplit: 1 }] });
  const titulos = ['Viaje', 'Tipo', 'Estado', 'Divisa', 'Margen', 'Pax', 'Total por cobrar', 'Cobrado',
    'Ganancia estimada', 'Ganancia cobrada', 'Ganancia pendiente', 'Margen %'];
  ws.columns = [30, 9, 9, 7, 20, 6, 16, 14, 18, 17, 18, 10].map((width) => ({ width }));
  escribirEncabezado(ws, 1, titulos);
  filas.forEach((v, i) => {
    const fila = ws.getRow(i + 2);
    [
      v.nombre, v.tipo === 'tour' ? 'Tour' : 'Resort', v.estado === 'cerrado' ? 'Cerrado' : 'Activo', v.divisa,
      describirGanancia(v), v.pax, v.total_por_cobrar, v.total_pagado, v.ganancia_estimada, v.ganancia_cobrada,
      Math.max(0, v.ganancia_estimada - v.ganancia_cobrada), v.margen / 100,
    ].forEach((valor, c) => { fila.getCell(c + 1).value = valor; });
    estilarFila(fila, 1, titulos.length, {});
    for (let c = 7; c <= 11; c += 1) fila.getCell(c).numFmt = FORMATO_MONTO;
    fila.getCell(12).numFmt = '0.0%';
  });
  await descargar(wb, nombre);
};
