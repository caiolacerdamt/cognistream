import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                color: '#a78bfa'
            }}>
                <Loader2 size={48} className="animate-spin" />
            </div>
        );
    }

    return session ? <Outlet /> : <Navigate to="/login" replace />;
};
