import React from 'react';
import { Plane, Building2, Bus, DollarSign, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, iconBgColor, iconColor }) => (
  <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-4 sm:p-5 hover:border-white/[0.12] transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm text-gray-500 font-medium">{title}</span>
        <span className="text-xl sm:text-2xl font-bold text-white mt-1">{value}</span>
      </div>
      <div className={`p-2 rounded-xl ${iconBgColor}`}>
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

export const DashboardStats = ({ totalViajes, resorts, tours, recaudado, porcentaje }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
    <StatCard title="Total Viajes"  value={totalViajes} icon={Plane}      iconBgColor="bg-white/5"          iconColor="text-gray-400" />
    <StatCard title="Resorts"       value={resorts}     icon={Building2}  iconBgColor="bg-teal-900/40"      iconColor="text-teal-400" />
    <StatCard title="Tours"         value={tours}       icon={Bus}        iconBgColor="bg-slate-800/60"     iconColor="text-slate-400" />
    <StatCard title="Recaudado"     value={recaudado}   icon={DollarSign} iconBgColor="bg-amber-900/40"     iconColor="text-amber-400" />
    <StatCard title="Porcentaje"    value={`${porcentaje}%`} icon={TrendingUp} iconBgColor="bg-cyan-900/40" iconColor="text-cyan-400" />
  </div>
);
