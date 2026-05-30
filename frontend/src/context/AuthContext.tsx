import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../lib/api';
import type { AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  login: (token: string, user: AppUser) => void;
  updateUser: (user: AppUser, token?: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, user: AppUser) => {
    localStorage.setItem('token', token);
    setUser(user);
  };

  const updateUser = (nextUser: AppUser, token?: string) => {
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(nextUser);
  };

  const refreshUser = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      /* keep current user on transient failure */
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isGuest: Boolean(user?.is_guest), login, updateUser, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
