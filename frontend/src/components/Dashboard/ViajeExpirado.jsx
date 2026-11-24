import { Clock } from 'lucide-react';

/** Pantalla para enlaces públicos expirados. */
const ViajeExpirado = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Enlace expirado</h1>
        <p className="text-slate-500 mb-4">
          Este enlace ha expirado. Contacta al administrador para obtener uno nuevo.
        </p>
      </div>
    </div>
  </div>
);

export default ViajeExpirado;
