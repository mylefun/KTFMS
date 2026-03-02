import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

type AuthContextType = {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    error: null,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
                setError(null);
            }
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                    setError(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                if (profileError.code === 'PGRST116') {
                    console.error('Profile not found for user:', userId);
                    setError('找不到使用者權限資料，請聯繫管理員建立 Profile');
                } else {
                    console.error('Error fetching profile:', profileError);
                    setError(`讀取權限失敗: ${profileError.message}`);
                }
            } else {
                const p = data as Profile;
                // Debug log to console to verify the role being received
                console.log('Profile loaded:', { email: p.email, role: p.role });

                if (p.is_disabled) {
                    await supabase.auth.signOut();
                    setError('您的帳號已被停用，請聯繫管理員');
                    setProfile(null);
                    setUser(null);
                } else {
                    setProfile(p);
                    setError(null);
                }
            }
        } catch (e) {
            console.error('Error in fetchProfile:', e);
            setError('系統發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, error, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    return useContext(AuthContext);
};
