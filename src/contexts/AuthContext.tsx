import React, { createContext, useContext, useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getUserProfileFromDatabase, type UserProfile } from '@/lib/database';

interface AuthContextType {
    user: any | null;
    profile: UserProfile | null;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async (userId: number | null) => {
        if (!userId) {
            setUser(null);
            setProfile(null);
            return;
        }

        try {
            const nextProfile = await getUserProfileFromDatabase(userId);
            if (nextProfile) {
                setUser({ id: nextProfile.id, email: nextProfile.email });
                setProfile(nextProfile);
            } else {
                setUser(null);
                setProfile(null);
                localStorage.removeItem('user_id');
            }
        } catch (error) {
            console.error(error);
            setUser(null);
            setProfile(null);
            localStorage.removeItem('user_id');
        }
    };

    useEffect(() => {
        if (!isSupabaseConfigured) {
            localStorage.removeItem('user_id');
            setIsLoading(false);
            return;
        }

        const storedUserId = localStorage.getItem('user_id');
        if (storedUserId) {
            loadProfile(Number(storedUserId)).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (credentials: any) => {
        if (!isSupabaseConfigured) {
            throw new Error('Supabase is not configured.');
        }

        const { data, error } = await supabase.rpc('login', {
            login_email: credentials.email,
            login_password: credentials.password
        });

        if (error) throw error;
        if (!data) throw new Error('Invalid login credentials');

        localStorage.setItem('user_id', String(data.id));
        await loadProfile(data.id);
    };

    const logout = async () => {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('user_id');
    };

    return (
        <AuthContext.Provider value={{ user, profile, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
