/// <reference types="vite/client" />

import "react";

declare global {
  namespace JSX {
    // Forzamos a que TypeScript reconozca los elementos nativos de React en todo el proyecto
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
