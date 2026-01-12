import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import '../index.css';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (error: any) {
            setError(error.message || 'Falha ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}>
                        <Lock size={32} color="#a5b4fc" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '0.5rem' }}>Bem-vindo de volta</h2>
                    <p style={{ color: '#94a3b8' }}>Faça login para acessar sua conta</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div className="input-group">
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="email"
                                className="input-field"
                                style={{ paddingLeft: '3rem' }}
                                placeholder="Seu email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="password"
                                className="input-field"
                                style={{ paddingLeft: '3rem' }}
                                placeholder="Sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.8rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#fca5a5',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '0.5rem', justifyContent: 'center' }}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>Entrar <ArrowRight size={18} /></>}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                    Não tem uma conta?{' '}
                    <Link to="/register" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
                        Criar conta
                    </Link>
                </div>
            </div>
        </div>
    );
}
