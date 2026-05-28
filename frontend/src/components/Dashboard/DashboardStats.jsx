import React from 'react';
import { Card } from '../ui/card';
import { Plane, Building2, Bus, DollarSign, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, iconBgColor, iconColor }) => {
  return (
    <Card className="p-5 border-none shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
          <span className="text-2xl font-bold text-foreground mt-1">{value}</span>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgColor}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
};

export const DashboardStats = ({ totalViajes, resorts, tours, recaudado, porcentaje }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="Total Viajes"
        value={totalViajes}
        icon={Plane}
        iconBgColor="bg-primary/10"
        iconColor="text-primary"
      />
      <StatCard
        title="Resorts"
        value={resorts}
        icon={Building2}
        iconBgColor="bg-teal-50"
        iconColor="text-teal-600"
      />
      <StatCard
        title="Tours"
        value={tours}
        icon={Bus}
        iconBgColor="bg-slate-100"
        iconColor="text-slate-600"
      />
      <StatCard
        title="Recaudado"
        value={recaudado}
        icon={DollarSign}
        iconBgColor="bg-amber-50"
        iconColor="text-amber-600"
      />
      <StatCard
        title="Porcentaje"
        value={`${porcentaje}%`}
        icon={TrendingUp}
        iconBgColor="bg-cyan-50"
        iconColor="text-cyan-600"
      />
    </div>
  );
};