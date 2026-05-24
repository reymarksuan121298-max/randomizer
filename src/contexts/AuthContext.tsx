import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getUserProfileFromDatabase, type UserProfile } from '@/lib/database';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async (nextUser: User | null) => {
        setUser(nextUser);
        if (!nextUser) {
            setProfile(null);
            return;
        }

        try {
            const nextProfile = await getUserProfileFromDatabase(nextUser.id, nextUser.email);
            setProfile(nextProfile);
        } catch (error) {
            console.error(error);
            setProfile(null);
        }
    };

    useEffect(() => {
        if (!isSupabaseConfigured) {
            localStorage.removeItem('user');
            setIsLoading(false);
            return;
        }

        supabase.auth.getSession().then(async ({ data }) => {
            await loadProfile(data.session?.user ?? null);
            setIsLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            loadProfile(session?.user ?? null);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    const login = async (credentials: any) => {
        if (!isSupabaseConfigured) {
            throw new Error('Supabase is not configured.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });

        if (error) throw error;
        await loadProfile(data.user);
    };

    const logout = async () => {
        if (isSupabaseConfigured) {
            await supabase.auth.signOut();
        }
        setUser(null);
        setProfile(null);
        localStorage.removeItem('user');
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
