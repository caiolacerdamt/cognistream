import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, UserPlus } from 'lucide-react';
import '../index.css';

export function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;
            // Depending on Supabase settings, email confirmation might be required.
            // For now, we assume simple registration or inform the user.
            alert('Cadastro realizado! Por favor, faça login.');
            navigate('/login');
        } catch (error: any) {
            setError(error.message || 'Falha ao criar conta');
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
                        background: 'rgba(16, 185, 129, 0.15)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                        <UserPlus size={32} color="#34d399" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '0.5rem' }}>Criar Conta</h2>
                    <p style={{ color: '#94a3b8' }}>Comece a usar o sistema hoje mesmo</p>
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

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
                                placeholder="Crie uma senha forte"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
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
                        style={{ marginTop: '0.5rem', justifyContent: 'center', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none' }}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : 'Criar Conta Grátis'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                    Já tem uma conta?{' '}
                    <Link to="/login" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 500 }}>
                        Fazer login
                    </Link>
                </div>
            </div>
        </div>
    );
}
