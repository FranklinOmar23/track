import React from 'react';
import { Card } from '../ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

export const ChartSection = ({ viajes }) => {
  const barData = viajes.map((v) => ({
    nombre: v.nombre.length > 15 ? v.nombre.substring(0, 15) + "..." : v.nombre,
    pagado: v.total_pagado || 0,
    pendiente: v.pendiente || 0,
  }));

  const totalPagado = viajes.reduce((acc, v) => acc + (v.total_pagado || 0), 0);
  const totalPendiente = viajes.reduce((acc, v) => acc + (v.pendiente || 0), 0);

  const pieData = [
    { name: "Pagado", value: totalPagado, color: "#0d9488" },
    { name: "Pendiente", value: totalPendiente, color: "#f43f5e" },
  ].filter(d => d.value > 0);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <Card className="p-6 border-none shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Recaudación por Viaje</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={8}>
              <XAxis 
                dataKey="nombre" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [formatCurrency(value), '']}
              />
              <Bar dataKey="pagado" fill="#0d9488" radius={[4, 4, 0, 0]} name="Pagado" />
              <Bar dataKey="pendiente" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Pendiente" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-600" />
            <span className="text-sm text-muted-foreground">Pagado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-sm text-muted-foreground">Pendiente</span>
          </div>
        </div>
      </Card>

      {/* Pie Chart */}
      <Card className="p-6 border-none shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Resumen General</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [formatCurrency(value), '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-600" />
            <span className="text-sm text-muted-foreground">Pagado ({formatCurrency(totalPagado)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-sm text-muted-foreground">Pendiente ({formatCurrency(totalPendiente)})</span>
          </div>
        </div>
      </Card>
    </div>
  );
};