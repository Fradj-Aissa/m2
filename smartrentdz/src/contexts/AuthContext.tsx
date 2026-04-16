import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiPost } from "@/lib/api";
import { normalizePlanName } from "@/lib/plans";
import axios from "axios";

interface UserData {
  uid: string;
  email: string;
  name: string;
  phone: string;
  type: "renter" | "landlord";
  account_type?: "renter" | "landlord";
  current_plan?: string;
  subscription_id?: string | null;
  created_at?: string;
}

interface AuthResponse {
  message: string;
  user: UserData;
  token: string;
}

interface AuthInfo {
  token: string | null;
  user: UserData | null;
  isAuthenticated: boolean;
}

interface AuthContextType {
  currentUser: UserData | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    type: "renter" | "landlord"
  ) => Promise<void>;
  logout: () => Promise<void>;
  setAuthInfo: ({ token, user, isAuthenticated }: AuthInfo) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuthInfo = ({ token, user, isAuthenticated }: AuthInfo) => {
    if (isAuthenticated && token && user) {
      const normalizedUser = {
        ...user,
        current_plan: normalizePlanName(user.current_plan),
      };

      localStorage.setItem("token", token);
      localStorage.setItem("userData", JSON.stringify(normalizedUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setCurrentUser(normalizedUser);
      setUserData(normalizedUser);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      delete axios.defaults.headers.common["Authorization"];
      setCurrentUser(null);
      setUserData(null);
    }
  };

  /**
   * Register new user via JWT backend
   */
  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    type: "renter" | "landlord"
  ) => {
    try {
      const response = await apiPost<AuthResponse>("/auth/register", {
        email,
        password,
        name,
        phone,
        account_type: type,
      });

      setAuthInfo({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  /**
   * Login user via JWT backend
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await apiPost<AuthResponse>("/auth/login", {
        email,
        password,
      });

      setAuthInfo({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  /**
   * Logout user - clear token and user data
   */
  const logout = async () => {
    try {
      setAuthInfo({ token: null, user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  /**
   * Restore user session from localStorage on app load
   */
  useEffect(() => {
    const restoreSession = () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const userDataStr = localStorage.getItem("userData");

        if (token && userDataStr) {
          const user = JSON.parse(userDataStr) as UserData;
          setAuthInfo({ token, user, isAuthenticated: true });
        }
      } catch (error) {
        console.error("Error restoring session:", error);
        setAuthInfo({ token: null, user: null, isAuthenticated: false });
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    setAuthInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
