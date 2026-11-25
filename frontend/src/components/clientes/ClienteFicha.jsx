import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight, Phone, MessageCircle, Mail, IdCard, Cake, MapPin, Pencil, Trash2, Star, Crown, Link2, Unlink,
  Plane, StickyNote, Merge, BellRing,
} from 'lucide-react';
import { fetchCliente, eliminarCliente, desvincularPersonaCliente, editarCliente } from '../../utils/api';
import { useAuthContext } from '../../Context/AuthContext';
import { confirmar } from '../../utils/confirmar';
import { avisarExito, avisarError } from '../../utils/avisos';
import { formatCurrency } from '../../utils/formatters';
import { rutaViaje } from '../../utils/rutas';
import { Hueso, EsqueletoFilas } from '../common/Esqueleto';
import ModalCliente from './ModalCliente';
import ModalEnlazarViajes from './ModalEnlazarViajes';
import ModalUnirCliente from './ModalUnirCliente';
import { montosPorDivisa, enlaceWhatsapp, mensajeCobro, iniciales, fechaCorta, edad, haceCuanto } from './util';

const Dato = ({ icono: Icono, label, children }) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icono className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <div className="text-sm text-slate-900 break-words">{children || <span className="text-slate-400">—</span>}</div>
    </div>
  </div>
);

const Cifra = ({ label, children, tono = 'text-slate-900', detalle }) => (
  <div className="tarjeta p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`text-lg font-bold tabular-nums mt-1 leading-tight ${tono}`}>{children}</p>
    {detalle && <p className="text-[11px] text-slate-500 mt-0.5">{detalle}</p>}
  </div>
);

const EsqueletoFicha = () => (
  <div className="space-y-6">
    <Hueso className="h-4 w-40" />
    <div className="flex items-center gap-4"><Hueso className="h-14 w-14" redondo /><div className="space-y-2"><Hueso className="h-7 w-56" /><Hueso className="h-4 w-32" /></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Hueso key={i} className="h-20" />)}</div>
    <div className="tarjeta overflow-hidden"><EsqueletoFilas filas={4} columnas={5} /></div>
  </div>
);

/** Ficha de un cliente: datos de contacto, cifras y cada viaje en el que estuvo. */
const ClienteFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { puede } = useAuthContext();
  const puedeEditar = puede('clientes_editar');
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState(false);
  const [enlazando, setEnlazando] = useState(false);
  const [uniendo, setUniendo] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetchCliente(id)
      .then((c) => vigente && setCliente(c))
      .catch((e) => vigente && setError(e.message));
    return () => { vigente = false; };
  }, [id, version]);

  const recargar = () => setVersion((v) => v + 1);

  if (error) {
    return (
      <div className="tarjeta p-10 text-center">
        <p className="text-sm font-semibold text-slate-800">{error}</p>
        <Link to="/clientes" className="btn btn-borde mt-4 inline-flex">Volver a clientes</Link>
      </div>
    );
  }
  if (!cliente || String(cliente.id) !== String(id)) return <EsqueletoFicha />;

  const r = cliente.resumen;
  const whatsapp = enlaceWhatsapp(cliente.whatsapp || cliente.telefono);
  const anios = edad(cliente.fechaNacimiento);
  const cobro = r.conDeuda ? enlaceWhatsapp(cliente.whatsapp || cliente.telefono, mensajeCobro(cliente)) : null;

  const borrar = async () => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${cliente.nombre}?`,
      mensaje: 'Se borra la ficha con sus datos de contacto. Las personas siguen en sus viajes con sus pagos; solo pierden el enlace.',
      textoConfirmar: 'Eliminar cliente',
      tono: 'peligro',
    });
    if (!ok) return;
    try {
      await eliminarCliente(cliente.id);
      avisarExito('Cliente eliminado');
      navigate('/clientes');
    } catch (e) {
      avisarError(e.message);
    }
  };

  const alternarFijo = async () => {
    try {
      const actualizado = await editarCliente(cliente.id, { esFijo: !cliente.esFijo });
      setCliente((c) => ({ ...c, ...actualizado }));
      avisarExito(actualizado.esFijo ? 'Marcado como cliente fijo' : 'Ya no es cliente fijo');
    } catch (e) {
      avisarError(e.message);
    }
  };

  const desvincular = async (p) => {
    const ok = await confirmar({
      titulo: '¿Quitar este viaje de la ficha?',
      mensaje: `${p.nombre} sigue en ${p.viaje.nombre} con sus pagos; solo deja de contar para ${cliente.nombre}.`,
      textoConfirmar: 'Quitar',
      tono: 'aviso',
    });
    if (!ok) return;
    try {
      await desvincularPersonaCliente(cliente.id, p.personaId);
      avisarExito('Viaje quitado de la ficha');
      recargar();
    } catch (e) {
      avisarError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="Ruta">
        <Link to="/clientes" className="hover:text-slate-900">Clientes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-medium truncate">{cliente.nombre}</span>
      </nav>

      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-4">
        <span className={`h-14 w-14 rounded-full text-lg font-bold flex items-center justify-center shrink-0 ${cliente.esFijo ? 'avatar-titular' : 'bg-teal-50 text-teal-700'}`}>
          {iniciales(cliente.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="titulo-pagina flex flex-wrap items-center gap-2">
            {cliente.nombre}
            {cliente.esFijo && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--titular-fondo)', color: 'var(--titular-texto)' }}>
                <Star className="h-3 w-3 fill-current" /> Cliente fijo
              </span>
            )}
          </h1>
          <p className="subtitulo-pagina">
            Cliente desde {fechaCorta(cliente.createdAt)}{cliente.ciudad ? ` · ${cliente.ciudad}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cliente.telefono && (
            <a href={`tel:${cliente.telefono}`} className="btn btn-borde h-10 px-3.5"><Phone className="h-4 w-4" /> Llamar</a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-borde h-10 px-3.5 text-emerald-700">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          {cobro && (
            <a href={cobro} target="_blank" rel="noreferrer" className="btn btn-borde h-10 px-3.5 text-emerald-700"
              title="Abre WhatsApp con el mensaje de lo que tiene pendiente, listo para enviar">
              <BellRing className="h-4 w-4" /> Recordar pago
            </a>
          )}
          {puedeEditar && (
            <>
              <button type="button" onClick={alternarFijo} className="btn btn-borde h-10 px-3.5" title={cliente.esFijo ? 'Quitar cliente fijo' : 'Marcar como cliente fijo'}>
                <Star className={`h-4 w-4 ${cliente.esFijo ? 'fill-amber-400 text-amber-500' : ''}`} /> {cliente.esFijo ? 'Fijo' : 'Marcar fijo'}
              </button>
              <button type="button" onClick={() => setUniendo(true)} className="btn btn-borde h-10 px-3.5" title="Juntar con otra ficha de la misma persona">
                <Merge className="h-4 w-4" /> Unir
              </button>
              <button type="button" onClick={() => setEditando(true)} className="btn btn-primario h-10 px-3.5"><Pencil className="h-4 w-4" /> Editar</button>
              <button type="button" onClick={borrar} aria-label="Eliminar cliente" title="Eliminar cliente"
                className="btn btn-borde h-10 !px-3 text-red-700 hover:!bg-rose-50 hover:!border-rose-200"><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>

      {/* Cifras */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up">
        <Cifra label="Viajes" detalle={r.proximoViaje ? `Próximo: ${r.proximoViaje.nombre}` : r.ultimoViaje ? `Último: ${haceCuanto(r.ultimoViaje.fecha).toLowerCase()}` : null}>
          {r.viajes}
        </Cifra>
        <Cifra label="Total pagado" tono="text-emerald-700">{montosPorDivisa(r.totales, 'pagado')}</Cifra>
        <Cifra label="Debe ahora" tono={r.conDeuda ? 'text-red-700' : 'text-slate-400'}>
          {r.conDeuda ? montosPorDivisa(r.totales, 'pendiente') : 'Nada'}
        </Cifra>
        <Cifra label="Total de sus viajes">{montosPorDivisa(r.totales, 'cuota')}</Cifra>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-5 items-start">
        {/* Datos */}
        <div className="tarjeta p-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <h2 className="text-[15px] font-semibold text-slate-900 mb-1">Datos de contacto</h2>
          <div className="divide-y divide-slate-100">
            <Dato icono={Phone} label="Teléfono">
              {cliente.telefono && <a href={`tel:${cliente.telefono}`} className="hover:text-teal-700 tabular-nums">{cliente.telefono}</a>}
            </Dato>
            <Dato icono={MessageCircle} label="WhatsApp">
              {(cliente.whatsapp || cliente.telefono) && whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="hover:text-emerald-700 tabular-nums">{cliente.whatsapp || cliente.telefono}</a>
              )}
            </Dato>
            <Dato icono={Mail} label="Correo">
              {cliente.correo && <a href={`mailto:${cliente.correo}`} className="hover:text-teal-700">{cliente.correo}</a>}
            </Dato>
            <Dato icono={IdCard} label="Cédula o pasaporte">{cliente.documento}</Dato>
            <Dato icono={Cake} label="Nacimiento">
              {cliente.fechaNacimiento && `${fechaCorta(cliente.fechaNacimiento)}${anios !== null ? ` · ${anios} años` : ''}`}
            </Dato>
            <Dato icono={MapPin} label="Dirección">
              {[cliente.direccion, cliente.ciudad].filter(Boolean).join(', ')}
            </Dato>
          </div>
          <div className="mt-3 rounded-xl p-3.5" style={{ background: 'var(--suave)' }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><StickyNote className="h-3.5 w-3.5" /> Notas</p>
            <p className="text-sm text-slate-800 mt-1 whitespace-pre-line">
              {cliente.notas || <span className="text-slate-400">Sin notas.</span>}
            </p>
          </div>
        </div>

        {/* Viajes */}
        <div className="tarjeta overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Sus viajes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Lo que le tocaba pagar en cada viaje, lo pagado y lo que falta</p>
            </div>
            {puedeEditar && (
              <button type="button" onClick={() => setEnlazando(true)} className="btn btn-borde btn-sm"><Link2 className="h-3.5 w-3.5" /> Enlazar viajes</button>
            )}
          </div>

          {cliente.participaciones.length === 0 ? (
            <div className="border-t border-slate-100 text-center py-12 px-6">
              <Plane className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-2">Todavía no tiene viajes enlazados.</p>
              {puedeEditar && <p className="text-xs text-slate-400 mt-1">Usa “Enlazar viajes” para buscarlo en los viajes donde ya estuvo.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100 text-left">
                    <th className="pl-5 px-4 h-10 font-normal"><span className="tabla-th">Viaje</span></th>
                    <th className="px-4 h-10 font-normal"><span className="tabla-th">Habitación</span></th>
                    <th className="px-4 h-10 font-normal text-right"><span className="tabla-th">Le toca</span></th>
                    <th className="px-4 h-10 font-normal text-right"><span className="tabla-th">Pagado</span></th>
                    <th className="px-4 h-10 font-normal text-right"><span className="tabla-th">Falta</span></th>
                    {puedeEditar && <th className="pr-5 w-10" aria-label="Acciones" />}
                  </tr>
                </thead>
                <tbody>
                  {cliente.participaciones.map((p) => {
                    const fmt = (v) => formatCurrency(v, p.viaje.divisa);
                    return (
                      <tr key={p.personaId} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td className="pl-5 px-4 py-3">
                          <Link to={rutaViaje(p.viaje)} className="font-semibold text-slate-900 hover:text-teal-700">{p.viaje.nombre}</Link>
                          <span className="block text-xs text-slate-500">
                            {p.viaje.fechaInicio ? fechaCorta(p.viaje.fechaInicio) : 'Sin fecha'}
                            {p.viaje.estado === 'cerrado' && ' · cerrado'}
                            {p.nombre !== cliente.nombre && <span className="text-slate-400"> · como “{p.nombre}”</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-slate-800">
                            Hab. {p.numero}
                            {p.titular && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Titular" />}
                          </span>
                          {p.etiqueta && <span className="block text-xs text-slate-500 truncate max-w-[140px]">{p.etiqueta}</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{p.paga ? fmt(p.cuota) : <span className="text-slate-400">No paga</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-medium">{fmt(p.pagado)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.pendiente > 0.009 ? <span className="font-semibold text-red-700">{fmt(p.pendiente)}</span> : <span className="text-emerald-700 text-xs font-semibold">Al día</span>}
                        </td>
                        {puedeEditar && (
                          <td className="pr-5 py-3 text-right">
                            <button type="button" onClick={() => desvincular(p)} title="Quitar este viaje de la ficha" aria-label="Quitar este viaje de la ficha"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-rose-50"><Unlink className="h-4 w-4" /></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editando && (
        <ModalCliente cliente={cliente} onClose={() => setEditando(false)}
          onGuardado={(c) => { setEditando(false); setCliente((prev) => ({ ...prev, ...c })); }} />
      )}
      {uniendo && (
        <ModalUnirCliente cliente={cliente} onClose={() => setUniendo(false)}
          onUnidos={() => { setUniendo(false); recargar(); }} />
      )}
      {enlazando && (
        <ModalEnlazarViajes cliente={cliente} onClose={() => setEnlazando(false)}
          onEnlazadas={() => { setEnlazando(false); recargar(); }} />
      )}
    </div>
  );
};

export default ClienteFicha;
