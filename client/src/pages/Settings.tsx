
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, Check, AlertCircle, Key, Shield, Settings as SettingsLucide, Loader2, Sparkles, Bot } from 'lucide-react';

export function Settings() {
    const { user } = useAuth();
    const [providers, setProviders] = useState([
        { id: 'gemini', name: 'Google Gemini', color: '#8b5cf6', key: '' },
        { id: 'openai', name: 'OpenAI GPT-5 Mini', color: '#10b981', key: '' }
    ]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) checkConfiguredKeys();
    }, [user]);

    const checkConfiguredKeys = async () => {
        try {
            const updatedProviders = await Promise.all(providers.map(async (p) => {
                const res = await fetch(`/api/settings/keys/${p.id}?userId=${user?.id}`);
                const data = await res.json();
                return { ...p, configured: data.configured };
            }));
            // @ts-ignore
            setProviders(updatedProviders);
        } catch (error) {
            console.error('Failed to check keys', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (providerId: string, keyValue: string) => {
        if (!keyValue) return;
        setSaving(providerId);
        setMessage(null);

        try {
            const res = await fetch('/api/settings/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId, key: keyValue, userId: user?.id })
            });

            if (!res.ok) throw new Error('Falha ao salvar');

            setProviders(prev => prev.map(p =>
                p.id === providerId ? { ...p, configured: true, key: '' } : p
            ));

            setMessage({ type: 'success', text: `Chave do ${providerId} salva com sucesso!` });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar a chave. Tente novamente.' });
        } finally {
            setSaving(null);
        }
    };

    const getProviderIcon = (id: string) => {
        if (id === 'gemini') return <Sparkles size={24} color="#8b5cf6" />;
        if (id === 'openai') return <Bot size={24} color="#10b981" />;
        return <SettingsLucide size={24} />;
    }

    return (
        <div className="fade-in" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                        <SettingsLucide size={28} color="#f8fafc" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', margin: 0, color: '#f8fafc' }}>Configurações</h2>
                        <p style={{ margin: '0.2rem 0 0', color: '#94a3b8' }}>Gerencie suas chaves de API e preferências</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem' }} />
                        <p>Carregando configurações...</p>
                    </div>
                ) : (
                    <>
                        {message && (
                            <div style={{
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                borderRadius: '12px',
                                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                color: message.type === 'success' ? '#34d399' : '#fca5a5',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                                {message.text}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {providers.map(provider => (
                                <div key={provider.id} style={{
                                    background: 'rgba(30, 41, 59, 0.4)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{getProviderIcon(provider.id)}</span>
                                            <div>
                                                <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.1rem' }}>{provider.name}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                                                    <div style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        background: (provider as any).configured ? '#34d399' : '#94a3b8'
                                                    }} />
                                                    <span style={{ fontSize: '0.85rem', color: (provider as any).configured ? '#34d399' : '#94a3b8' }}>
                                                        {(provider as any).configured ? 'Chave configurada' : 'Não configurada'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="input-group" style={{ display: 'flex', gap: '0.8rem' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="password"
                                                className="input-field"
                                                style={{ paddingLeft: '2.8rem' }}
                                                placeholder="Cole sua API Key aqui..."
                                                value={provider.key}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, key: newVal } : p));
                                                }}
                                            />
                                        </div>
                                        <button
                                            className="btn-primary"
                                            style={{ width: 'auto', padding: '0 1.5rem', background: provider.color }}
                                            onClick={() => handleSave(provider.id, provider.key)}
                                            disabled={!provider.key || saving === provider.id}
                                        >
                                            {saving === provider.id ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Save size={18} />
                                            )}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem', marginTop: '-0.5rem' }}>
                                        <Shield size={12} />
                                        Sua chave é armazenada de forma segura no banco de dados.
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
