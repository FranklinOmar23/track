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
