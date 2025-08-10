import React from "react";
import { HelmetProvider } from "react-helmet-async";

export function withHelmetProvider(Component: React.ComponentType) {
  return function Wrapped() {
    return (
      <HelmetProvider>
        <Component />
      </HelmetProvider>
    );
  };
}
