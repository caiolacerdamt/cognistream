import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, FileText, BarChart3, Settings as SettingsIcon, Brain } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function Layout() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div id="root-container">
            <header style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <Brain size={42} color="#a78bfa" />
                    <h1 style={{ fontSize: '3rem', margin: 0, background: 'linear-gradient(to right, #a78bfa, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
                        CogniStream
                    </h1>
                </div>
                <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', color: '#94a3b8' }}>
                    Fluxo de Inteligência para seus Vídeos e Áudios.
                </p>
            </header>

            <nav style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.5rem',
                borderRadius: '20px',
                width: 'fit-content',
                margin: '0 auto 2rem auto',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <Link
                    to="/"
                    className={`nav-item ${isActive('/') ? 'active' : ''}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '16px',
                        textDecoration: 'none',
                        color: isActive('/') ? '#fff' : '#94a3b8',
                        background: isActive('/') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Home size={20} />
                    Início
                </Link>
                <Link
                    to="/saved"
                    className={`nav-item ${isActive('/saved') ? 'active' : ''}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '16px',
                        textDecoration: 'none',
                        color: isActive('/saved') ? '#fff' : '#94a3b8',
                        background: isActive('/saved') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <FileText size={20} />
                    Salvos
                </Link>
                <Link
                    to="/dashboard"
                    className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '16px',
                        textDecoration: 'none',
                        color: isActive('/dashboard') ? '#fff' : '#94a3b8',
                        background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <BarChart3 size={20} />
                    Dashboard
                </Link>
                <Link
                    to="/settings"
                    className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '16px',
                        textDecoration: 'none',
                        color: isActive('/settings') ? '#fff' : '#94a3b8',
                        background: isActive('/settings') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <SettingsIcon size={20} />
                    Ajustes
                </Link>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }}></div>

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="nav-item"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '16px',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        transition: 'all 0.2s ease',
                        fontSize: '1rem'
                    }}
                >
                    Sair
                </button>
            </nav>

            <Outlet />
        </div>
    );
}
