import { AlertCircle } from 'lucide-react';

/** Pantalla para enlaces públicos inválidos o desactivados. */
const EnlaceInvalido = ({ mensaje }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link inválido</h1>
        <p className="text-slate-500">{mensaje || 'Este enlace no es válido o ha sido desactivado.'}</p>
      </div>
    </div>
  </div>
);

export default EnlaceInvalido;
