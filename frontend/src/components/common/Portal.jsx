import { createPortal } from 'react-dom';

/**
 * Dibuja a los hijos directamente en <body>. Para modales y overlays: así ningún contenedor con
 * transform/filter/overflow puede recortarlos ni desplazarlos.
 */
const Portal = ({ children }) => createPortal(children, document.body);

export default Portal;
