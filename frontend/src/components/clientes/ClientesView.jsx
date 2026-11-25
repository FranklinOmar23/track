import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, Star, Phone, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { fetchClientes } from '../../utils/api';
import { useAuthContext } from '../../Context/AuthContext';
import { EsqueletoLista } from '../common/Esqueleto';
import ModalCliente from './ModalCliente';
import ModalRepetidos from './ModalRepetidos';
import { montosPorDivisa, haceCuanto, iniciales } from './util';

const POR_PAGINA = 25;
const MES_ACTUAL = new Date().getMonth() + 1;

const FILTROS = [
  { valor: 'todos', label: 'Todos', params: {} },
  { valor: 'fijos', label: 'Fijos', params: { esFijo: true } },
  { valor: 'deuda', label: 'Con deuda', params: { conDeuda: true } },
  { valor: 'inactivos', label: 'Sin viajar +1 año', params: { sinViajarDias: 365 } },
  { valor: 'cumple', label: 'Cumplen este mes', params: { mesNacimiento: MES_ACTUAL } },
];

const Th = ({ children, className = '' }) => (
  <th className={`px-4 h-11 font-normal ${className}`}><span className="tabla-th">{children}</span></th>
);

/** Sección Clientes: buscador, filtros y tabla con lo que cada cliente ha viajado, pagado y debe. */
const ClientesView = () => {
  const navigate = useNavigate();
  const { puede } = useAuthContext();
  const puedeEditar = puede('clientes_editar');
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState({ q: '', filtro: 'todos', pagina: 1, version: 0 });
  const [resultado, setResultado] = useState({ lista: [], hayMas: false, cargando: true, error: '' });
  const [nuevo, setNuevo] = useState(false);
  const [repetidos, setRepetidos] = useState(false);

  // La búsqueda espera a que se deje de escribir
  useEffect(() => {
    const t = setTimeout(() => setConsulta((c) => (c.q === buscar.trim() ? c : { ...c, q: buscar.trim(), pagina: 1 })), 300);
    return () => clearTimeout(t);
  }, [buscar]);

  useEffect(() => {
    let vigente = true;
    const { params } = FILTROS.find((f) => f.valor === consulta.filtro);
    fetchClientes({ ...params, q: consulta.q, page: consulta.pagina, limit: POR_PAGINA })
      .then((r) => vigente && setResultado({ lista: r.data.data, hayMas: r.data.isThereNextPage, cargando: false, error: '' }))
      .catch((e) => vigente && setResultado((s) => ({ ...s, cargando: false, error: e.message })));
    return () => { vigente = false; };
  }, [consulta]);

  const cambiar = (cambios) => {
    setResultado((s) => ({ ...s, cargando: true }));
    setConsulta((c) => ({ ...c, ...cambios }));
  };
  const recargar = () => cambiar({ version: consulta.version + 1 });

  const { lista, hayMas, cargando, error } = resultado;
  const desde = (consulta.pagina - 1) * POR_PAGINA + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="titulo-pagina">Clientes</h1>
          <p className="subtitulo-pagina">Datos de contacto y los viajes de cada cliente.</p>
        </div>
        {puedeEditar && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRepetidos(true)} className="btn btn-borde h-10 px-4">
              <Sparkles className="h-4 w-4" /> Encontrar repetidos
            </button>
            <button type="button" onClick={() => setNuevo(true)} className="btn btn-primario h-10 px-4">
              <UserPlus className="h-4 w-4" /> Nuevo cliente
            </button>
          </div>
        )}
      </div>

      <div className="tarjeta overflow-hidden animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 sm:px-6 py-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input className="campo-buscar w-full" value={buscar} onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, teléfono, cédula o correo" aria-label="Buscar cliente" />
          </div>
          <div className="segmentado shrink-0 overflow-x-auto max-w-full" role="radiogroup" aria-label="Filtrar clientes">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" role="radio" aria-checked={consulta.filtro === f.valor}
                onClick={() => cambiar({ filtro: f.valor, pagina: 1 })}>{f.label}</button>
            ))}
          </div>
        </div>

        {error && <p className="px-6 pb-4 text-sm text-red-700">{error}</p>}

        {cargando ? (
          <div className="border-t border-slate-100"><EsqueletoLista filas={8} /></div>
        ) : lista.length === 0 ? (
          <div className="border-t border-slate-100 text-center py-14 px-6">
            <Users className="h-9 w-9 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 mt-3">
              {consulta.q || consulta.filtro !== 'todos' ? 'Ningún cliente coincide' : 'Aún no hay clientes'}
            </p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {consulta.q || consulta.filtro !== 'todos'
                ? 'Prueba con otra búsqueda o filtro.'
                : 'Crea fichas a mano, desde una persona de una habitación, o usa “Encontrar repetidos” para armarlas con las personas que ya viajaron más de una vez.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100 text-left">
                  <Th className="pl-5 sm:pl-6">Cliente</Th>
                  <Th>Contacto</Th>
                  <Th className="text-center">Viajes</Th>
                  <Th className="text-right">Pagado</Th>
                  <Th className="text-right">Debe</Th>
                  <Th className="pr-5 sm:pr-6">Último viaje</Th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c, i) => {
                  const r = c.resumen;
                  const telefono = c.telefono || c.whatsapp;
                  return (
                    <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors cursor-pointer aparecer"
                      style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                      <td className="pl-5 sm:pl-6 px-4 py-3">
                        <span className="flex items-center gap-3 min-w-0">
                          <span className={`h-9 w-9 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${c.esFijo ? 'avatar-titular' : 'bg-teal-50 text-teal-700'}`}>
                            {iniciales(c.nombre)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                              {c.nombre}
                              {c.esFijo && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" aria-label="Cliente fijo" />}
                            </span>
                            {(c.ciudad || c.documento) && <span className="block text-xs text-slate-500 truncate">{c.ciudad || c.documento}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {telefono ? (
                          <a href={`tel:${telefono}`} onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-teal-700 tabular-nums">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {telefono}
                          </a>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900 tabular-nums">{r.viajes}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.viajes ? montosPorDivisa(r.totales, 'pagado') : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.conDeuda
                          ? <span className="font-semibold text-red-700">{montosPorDivisa(r.totales, 'pendiente')}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 pr-5 sm:pr-6 py-3">
                        {r.proximoViaje ? (
                          <span className="block min-w-0">
                            <span className="block text-slate-800 truncate max-w-[220px]">{r.proximoViaje.nombre}</span>
                            <span className="text-xs font-semibold text-teal-700">Próximo</span>
                          </span>
                        ) : r.ultimoViaje ? (
                          <span className="block min-w-0">
                            <span className="block text-slate-800 truncate max-w-[220px]">{r.ultimoViaje.nombre}</span>
                            <span className="text-xs text-slate-500">{haceCuanto(r.ultimoViaje.fecha)}</span>
                          </span>
                        ) : <span className="text-slate-400">Sin viajes</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!cargando && (consulta.pagina > 1 || hayMas) && (
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{desde}–{desde + lista.length - 1}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-borde btn-sm" disabled={consulta.pagina === 1}
                onClick={() => cambiar({ pagina: consulta.pagina - 1 })}><ChevronLeft className="h-4 w-4" /> Anterior</button>
              <button type="button" className="btn btn-borde btn-sm" disabled={!hayMas}
                onClick={() => cambiar({ pagina: consulta.pagina + 1 })}>Siguiente <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {nuevo && (
        <ModalCliente onClose={() => setNuevo(false)}
          onGuardado={(c) => { setNuevo(false); navigate(`/clientes/${c.id}`); }} />
      )}
      {repetidos && <ModalRepetidos onClose={() => { setRepetidos(false); recargar(); }} />}
    </div>
  );
};

export default ClientesView;
