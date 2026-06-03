import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertCircle, Home } from 'lucide-react';

const ViajeExpirado = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enlace expirado
          </h1>
          
          <p className="text-gray-500 mb-6">
            Este enlace de compartir ha expirado. 
            Por favor, contacta al administrador del viaje para obtener un nuevo enlace.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">¿Qué significa esto?</span>
            </div>
            <p className="text-xs text-amber-600">
              Por seguridad, los enlaces de compartir tienen un tiempo de vigencia limitado. 
              Una vez expirados, ya no se puede acceder a la información del viaje.
            </p>
          </div>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ViajeExpirado;