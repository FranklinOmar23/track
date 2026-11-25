import { Moon, Sun } from 'lucide-react';
import { useTema, alternarTema } from '../../utils/tema';

/**
 * Cambia entre modo claro y oscuro.
 * - variante "lateral": fila con texto e interruptor (menú lateral, siempre oscuro).
 * - variante "boton": botón redondo con el ícono (login).
 */
const InterruptorTema = ({ variante = 'lateral' }) => {
  const oscuro = useTema() === 'oscuro';
  const etiqueta = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  if (variante === 'boton') {
    return (
      <button type="button" onClick={alternarTema} aria-label={etiqueta} title={etiqueta}
        className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors">
        {oscuro ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
    );
  }

  return (
    <button type="button" role="switch" aria-checked={oscuro} onClick={alternarTema} title={etiqueta}
      className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
      <span className="relative h-[18px] w-[18px] shrink-0">
        <Sun className={`absolute inset-0 h-[18px] w-[18px] transition-all duration-300 ${oscuro ? 'opacity-0 rotate-90 scale-50' : 'opacity-100'}`} strokeWidth={1.8} />
        <Moon className={`absolute inset-0 h-[18px] w-[18px] transition-all duration-300 ${oscuro ? 'opacity-100' : 'opacity-0 -rotate-90 scale-50'}`} strokeWidth={1.8} />
      </span>
      <span className="flex-1 text-left">Modo oscuro</span>
      <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${oscuro ? 'bg-teal-600' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#ffffff] shadow-sm transition-transform duration-300 ${oscuro ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  );
};

export default InterruptorTema;
