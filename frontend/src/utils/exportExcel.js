import * as XLSX from 'xlsx';

export const exportarHabitacionesExcel = (habitaciones, viaje) => {
  const filas = [];

  habitaciones.forEach((hab) => {
    hab.personas.forEach((persona, idx) => {
      filas.push({
        habitacion: hab.num,
        centro: hab.etiqueta || '',
        pasajero: persona.n,
        posicion: persona.posicion || idx + 1,
      });
    });
  });

  if (filas.length === 0) {
    alert('No hay personas registradas para exportar.');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(filas, {
    header: ['habitacion', 'centro', 'pasajero', 'posicion'],
  });

  // Column widths
  ws['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Viajes');

  const filename = `${viaje?.nombre || 'habitaciones'}.xlsx`;
  XLSX.writeFile(wb, filename);
};

const describirGanancia = (v) =>
  v.ganancia_tipo === 'porcentaje' ? `${v.ganancia_valor}% del total`
    : v.ganancia_tipo === 'por_persona' ? `${v.ganancia_valor} por persona`
      : 'Sin configurar';

export const exportarGananciasExcel = (filas, nombreArchivo = 'reporte-ganancias') => {
  if (!filas.length) {
    alert('No hay viajes para exportar.');
    return;
  }

  const datos = filas.map((v) => ({
    Viaje: v.nombre,
    Tipo: v.tipo === 'tour' ? 'Tour' : 'Resort',
    Estado: v.estado === 'cerrado' ? 'Cerrado' : 'Activo',
    Divisa: v.divisa,
    Margen: describirGanancia(v),
    Pax: v.pax,
    'Total por cobrar': v.total_por_cobrar,
    Cobrado: v.total_pagado,
    'Ganancia estimada': v.ganancia_estimada,
    'Ganancia cobrada': v.ganancia_cobrada,
    'Ganancia pendiente': Math.max(0, v.ganancia_estimada - v.ganancia_cobrada),
    'Margen %': v.margen,
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 30 }, { wch: 9 }, { wch: 9 }, { wch: 7 }, { wch: 20 }, { wch: 6 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 17 }, { wch: 18 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ganancias');
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
};
