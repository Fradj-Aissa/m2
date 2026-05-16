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
import { useRef } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface UserData {
  uid: string;
  email: string;
  name: string;
  phone: string;
  type: "renter" | "landlord";
  account_type?: "renter" | "landlord" | "owner";
  current_plan?: string;
  subscription_id?: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  rejection_reason?: string | null;
  profile_image?: string | null;
  avatar?: string | null;
  image?: string | null;
  google_id?: string | null;
  has_password?: boolean;
  role?: "admin" | "user" | null;
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
  updateUserAvatar: (imageUrl: string) => void;
  refreshUserData: () => Promise<void>;
  loginWithGoogle: (idToken: string, account_type?: string | null) => Promise<any>;
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
  const googleInitialized = useRef(false);

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
   * Login user via Google
   */
  const loginWithGoogle = async (idToken: string, account_type?: string | null) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`, {
        idToken,
        mode: "login",
        account_type,
      });

      if (response.data.token && response.data.user) {
        const { token, user } = response.data;
        const normalizedUser = {
          ...user,
          current_plan: normalizePlanName(user.current_plan),
        };
        setAuthInfo({ token, user: normalizedUser, isAuthenticated: true });
        return response.data;
      } else {
        throw new Error("Google login failed, please try again.");
      }
    } catch (error) {
      console.error("Google login error:", error);
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
   * Update user avatar in local state and storage
   */
  const updateUserAvatar = (imageUrl: string) => {
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        profile_image: imageUrl,
        avatar: imageUrl,
      };
      setCurrentUser(updatedUser);
      setUserData(updatedUser);
      localStorage.setItem("userData", JSON.stringify(updatedUser));
    }
  };

  /**
   * Refresh user data from backend to get latest role/plan
   */
  const refreshUserData = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/users/${currentUser.uid}`);
      const updatedUser = {
        ...response.data,
        current_plan: normalizePlanName(response.data.current_plan),
      };
      
      setCurrentUser(updatedUser);
      setUserData(updatedUser);
      localStorage.setItem("userData", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Error refreshing user data:", error);
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

  /**
   * Manual Google Identity Initialization as requested
   * Ensures google.accounts.id.initialize is only called once
   */
  useEffect(() => {
    const initializeGoogle = () => {
      if (
        typeof window !== "undefined" &&
        window.google?.accounts?.id &&
        !googleInitialized.current
      ) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 
              "591116456511-90vos431d11qqrmmt9nhf7pbqkgckmf2.apps.googleusercontent.com",
            auto_select: false,
            itp_support: true,
          });
          googleInitialized.current = true;
          console.log("Google Identity Services initialized successfully");
        } catch (error) {
          console.error("Error initializing Google Identity Services:", error);
        }
      }
    };

    // Small delay to ensure the script has loaded if it's dynamic
    const timer = setTimeout(initializeGoogle, 1000);
    return () => clearTimeout(timer);
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    setAuthInfo,
    updateUserAvatar,
    refreshUserData,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
