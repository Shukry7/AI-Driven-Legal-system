import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  apiLogin,
  apiRegister,
  apiRefresh,
  type AuthUser,
} from "@/services/authApi";
import { setTokenAccessor } from "@/config/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const REFRESH_TOKEN_KEY = "refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!accessToken;

  useEffect(() => {
    setTokenAccessor(() => accessToken);
  }, [accessToken]);

  const saveSession = useCallback(
    (tokens: { access_token: string; refresh_token: string; user: AuthUser }) => {
      setAccessToken(tokens.access_token);
      setUser(tokens.user);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    },
    [],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    apiRefresh(stored)
      .then((tokens) => saveSession(tokens))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, [saveSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiLogin(email, password);
      saveSession(tokens);
    },
    [saveSession],
  );

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      const tokens = await apiRegister(email, username, password);
      saveSession(tokens);
    },
    [saveSession],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, user, accessToken, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
