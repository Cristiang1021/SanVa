import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const esPanelAdmin = (rol) => ['admin', 'superadmin'].includes(rol);

export const AuthProvider = ({ children }) => {
  const [usuario = null, setUsuario] = useState(() => {
    const stored = localStorage.getItem('usuario');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = (nuevoToken, nuevoUsuario) => {
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  };

  const isAuthenticated = !!token && !!usuario;
  const isSuperAdmin = usuario?.rol === 'superadmin';
  const isAdmin = esPanelAdmin(usuario?.rol);
  const isVendedor = usuario?.rol === 'vendedor';

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        isVendedor,
        isSuperAdmin,
        login,
        logout,
        setLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
