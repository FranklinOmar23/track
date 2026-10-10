import { RankingList } from '../ui';

const TabRankings = ({ datos, fmt }) => {
  const { rankingViajes, rankingTopPagadores, rankingDeudores, rankingCentros } = datos;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <RankingList
        valueFmt={fmt}
        title="Viajes que más recaudan"
        subtitle="Todos los viajes, ordenados por dinero cobrado"
        items={rankingViajes}
        orbColor="#0d9488"
      />
      <RankingList
        valueFmt={fmt}
        title="Centros / etiquetas más rentables"
        subtitle="Del viaje seleccionado arriba, ordenados por dinero cobrado"
        items={rankingCentros}
        orbColor="#f59e0b"
      />
      <RankingList
        valueFmt={fmt}
        title="Personas que más pagan"
        subtitle="Suma de pagos por persona, según el filtro de viaje de arriba"
        items={rankingTopPagadores}
        orbColor="#10b981"
      />
      <RankingList
        valueFmt={fmt}
        title="Personas con más deuda pendiente"
        subtitle="Lo que aún deben, según el filtro de viaje de arriba"
        items={rankingDeudores}
        orbColor="#f43f5e"
      />
    </div>
  );
};

export default TabRankings;
