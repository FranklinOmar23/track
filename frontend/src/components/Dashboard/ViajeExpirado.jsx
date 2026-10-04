import { Clock } from 'lucide-react';

/** Pantalla para enlaces públicos expirados. */
const ViajeExpirado = () => (
  <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-2xl p-8">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Enlace expirado</h1>
        <p className="text-gray-400 mb-4">
          Este enlace ha expirado. Contacta al administrador para obtener uno nuevo.
        </p>
      </div>
    </div>
  </div>
);

export default ViajeExpirado;
