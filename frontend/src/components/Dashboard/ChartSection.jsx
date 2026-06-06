import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const DARK_TOOLTIP = {
  backgroundColor: '#1a1f2e',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
  color: '#e2e8f0',
};

export const ChartSection = ({ viajes }) => {
  const barData = viajes.map((v) => ({
    nombre: v.nombre.length > 15 ? v.nombre.substring(0, 15) + '…' : v.nombre,
    pagado: v.total_pagado || 0,
    pendiente: v.pendiente || 0,
  }));

  const totalPagado    = viajes.reduce((acc, v) => acc + (v.total_pagado || 0), 0);
  const totalPendiente = viajes.reduce((acc, v) => acc + (v.pendiente    || 0), 0);

  const pieData = [
    { name: 'Pagado',    value: totalPagado,    color: '#0d9488' },
    { name: 'Pendiente', value: totalPendiente, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-DO', {
      style: 'currency', currency: 'DOP',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-teal-400" />
          <h3 className="font-semibold text-white">Recaudacion por Viaje</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={8}>
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={DARK_TOOLTIP} formatter={(v) => [formatCurrency(v), '']} />
              <Bar dataKey="pagado"    fill="#0d9488" radius={[4,4,0,0]} name="Pagado" />
              <Bar dataKey="pendiente" fill="#f43f5e" radius={[4,4,0,0]} name="Pendiente" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-sm text-gray-500">Pagado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-sm text-gray-500">Pendiente</span>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-white">Resumen General</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={DARK_TOOLTIP} formatter={(v) => [formatCurrency(v), '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-sm text-gray-500">Pagado ({formatCurrency(totalPagado)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-sm text-gray-500">Pendiente ({formatCurrency(totalPendiente)})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
