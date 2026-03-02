import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type ProtectedRouteProps = {
    requireAdmin?: boolean;
};

export const ProtectedRoute = ({ requireAdmin = false }: ProtectedRouteProps) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-red-600 dark:text-red-500" />
            </div>
        );
    }

    if (!user) {
        // User is not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && profile?.role !== 'admin') {
        // User is logged in but trying to access admin page without admin role
        return <Navigate to="/" replace />;
    }

    // User is logged in and has required role
    return <Outlet />;
};
