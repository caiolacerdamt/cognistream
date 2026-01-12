import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../index.css'
import {
    Bot,
    Link as LinkIcon,
    FileVideo,
    UploadCloud,
    Sparkles,
    Loader2,
    BookOpen,
    Download,
    FileText,
    BarChart,
    DollarSign,
    AlertTriangle,
    Youtube,
    ChevronDown
} from 'lucide-react';

interface Result {
    transcription: string;
    summary: string;
    duration?: number;
    usage?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
        cachedContentTokenCount?: number;
    };
}

export function Home() {
    const { user } = useAuth();
    const [mode, setMode] = useState<'url' | 'file'>('url');

    // Settings State
    const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');

    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    // @ts-ignore
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setLoading(true);
        setStatus('Iniciando...');
        setError('');
        setResult(null);

        try {
            // Use stream endpoint for URL mode
            const endpoint = mode === 'url' ? '/api/process-video/stream' : '/api/process-file';

            let body;
            let headers: Record<string, string> = {};

            if (mode === 'url') {
                if (!url.trim()) throw new Error("Por favor, cole um link do YouTube");
                body = JSON.stringify({ url, provider, userId: user?.id });
                headers = { 'Content-Type': 'application/json' };
            } else {
                if (!file) throw new Error("Selecione um arquivo de áudio ou vídeo");
                // File upload usually doesn't support SSE easily in this setup without XHR/fetch tricks, 
                // keeping file upload as standard for now (or minimal update)
                const formData = new FormData();
                formData.append('audio', file);
                formData.append('provider', provider);
                if (user?.id) formData.append('userId', user.id);
                body = formData;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Falha ao processar solicitação');
            }

            // Handle Stream for URL mode
            if (mode === 'url') {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                if (!reader) throw new Error("Failed to read response stream");

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Split by newlines to handle valid SSE format
                    const lines = buffer.split('\n');
                    // Keep the last part in buffer (it might be incomplete)
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === ':') continue; // Skip empty or comment lines

                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const jsonStr = trimmedLine.slice(6);
                                const data = JSON.parse(jsonStr);

                                if (data.status) {
                                    setStatus(data.status);
                                }
                                if (data.result) {
                                    setResult(data.result);
                                    setLoading(false); // Ensure loading stops when result arrives
                                }
                                if (data.error) throw new Error(data.error);
                            } catch (e) {
                                console.error('Error parsing SSE line:', trimmedLine, e);
                            }
                        }
                    }
                }
            } else {
                // Standard File Upload response
                const data = await response.json();
                setResult(data);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const handleDownload = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const estimateCost = (res: Result) => {
        if (!res.usage) return "0,00";
        let costUsd = 0;
        const usage = res.usage;

        // Simple estimation based on provider
        if (provider === 'gemini') {
            // Gemini 2.5 Flash: Input 0.075, Output 0.30 
            // Audio is counted as token input by Gemini
            costUsd = (usage.promptTokenCount / 1000000) * 0.075 + (usage.candidatesTokenCount / 1000000) * 0.30;
        } else {
            // OpenAI GPT-5 Mini: Input 0.15, Output 0.60
            const textCost = (usage.promptTokenCount / 1000000) * 0.15 + (usage.candidatesTokenCount / 1000000) * 0.60;
            // Whisper: $0.006 per minute
            const durationMinutes = (res.duration || 0) / 60;
            const audioCost = durationMinutes * 0.006;

            costUsd = textCost + audioCost;
        }
        const totalBrl = costUsd * 6.0; // Assuming 1 USD = 6.0 BRL
        return totalBrl.toFixed(4).replace('.', ',');
    };

    return (
        <div className="fade-in" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="glass-panel">

                {/* Settings Panel - Simplified */}
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                                <Bot size={16} color="#a78bfa" />
                                Modelo de IA
                            </label>

                            {/* Custom Dropdown */}
                            {(() => {
                                const [isOpen, setIsOpen] = useState(false);

                                const options = [
                                    { value: 'gemini', label: 'Google Gemini 2.5 Flash', tag: 'Gratuito/Rápido', color: '#a78bfa' },
                                    { value: 'openai', label: 'OpenAI GPT-5 Mini', tag: 'Pago/Eficiente', color: '#10a37f' }
                                ];

                                const selected = options.find(o => o.value === provider) || options[0];

                                return (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setIsOpen(!isOpen)}
                                            className="input-field"
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                padding: '0.8rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 500, color: 'white' }}>{selected.label}</span>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    padding: '0.1rem 0.5rem',
                                                    borderRadius: '12px',
                                                    color: '#94a3b8'
                                                }}>
                                                    {selected.tag}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} style={{
                                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease',
                                                color: '#94a3b8'
                                            }} />
                                        </button>

                                        {isOpen && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '110%',
                                                left: 0,
                                                right: 0,
                                                background: 'rgba(15, 23, 42, 0.95)', // Increased opacity for readability
                                                backdropFilter: 'blur(16px)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                zIndex: 10,
                                                overflow: 'hidden',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                            }} className="fade-in">
                                                {options.map((opt) => (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => {
                                                            setProvider(opt.value as any);
                                                            setIsOpen(false);
                                                        }}
                                                        style={{
                                                            padding: '0.8rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            background: provider === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = provider === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent'}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ color: 'white', fontSize: '0.95rem' }}>{opt.label}</span>
                                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{opt.tag}</span>
                                                        </div>
                                                        {provider === opt.value && (
                                                            <div style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                background: opt.color,
                                                                boxShadow: `0 0 10px ${opt.color}`
                                                            }}></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="tabs-container">
                        <button
                            className={`tab ${mode === 'url' ? 'active' : ''}`}
                            onClick={() => setMode('url')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                        >
                            <Youtube size={18} />
                            Link do YouTube
                        </button>
                        <button
                            className={`tab ${mode === 'file' ? 'active' : ''}`}
                            onClick={() => setMode('file')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                        >
                            <FileVideo size={18} />
                            Upload de Arquivo
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {mode === 'url' ? (
                        <div className="input-group">
                            <div style={{ position: 'relative', width: '100%' }}>
                                <LinkIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    className="input-field"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder="Cole o link do vídeo aqui..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>

                            {/* Thumbnail Preview */}
                            {(() => {
                                const getYouTubeId = (url: string) => {
                                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                    const match = url.match(regExp);
                                    return (match && match[2].length === 11) ? match[2] : null;
                                };
                                const videoId = getYouTubeId(url);

                                return videoId ? (
                                    <div className="fade-in" style={{
                                        marginTop: '1rem',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(0,0,0,0.3)',
                                        position: 'relative',
                                        aspectRatio: '16/9'
                                    }}>
                                        <img
                                            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                            }}
                                            alt="Video Thumbnail"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                            padding: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <Youtube size={20} color="#ef4444" fill="#ef4444" />
                                            <span style={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>Vídeo Identificado</span>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    ) : (
                        <label className="upload-zone" htmlFor="file-upload">
                            <input
                                type="file"
                                accept="audio/*,video/*"
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                style={{ display: 'none' }}
                                id="file-upload"
                            />
                            <span className="upload-icon">
                                <UploadCloud size={48} color="#a78bfa" />
                            </span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                                {file ? file.name : 'Clique para selecionar um arquivo'}
                            </span>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>MP3, MP4, WAV, MPEG</p>
                        </label>
                    )}

                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" /> {status || 'Processando...'}
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} /> Iniciar Transcrição
                            </>
                        )}
                    </button>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: '#fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <AlertTriangle size={20} />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {result && (
                <div className="glass-panel fade-in" style={{ marginTop: '2rem' }}>
                    {/* Summary Section */}
                    <div className="result-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={24} color="#a78bfa" />
                            <h2>Resumo Executivo</h2>
                        </div>
                        <button className="action-btn" onClick={() => handleDownload(result.summary, 'resumo.txt')}>
                            <Download size={16} /> Baixar Resumo
                        </button>
                    </div>
                    <div className="text-content">
                        {result.summary}
                    </div>

                    <div style={{ height: '2rem' }}></div>

                    {/* Transcription Section */}
                    <div className="result-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={24} color="#2dd4bf" />
                            <h2>Transcrição Detalhada</h2>
                        </div>
                        <button className="action-btn" onClick={() => handleDownload(result.transcription, 'transcricao.txt')}>
                            <Download size={16} /> Baixar Completo
                        </button>
                    </div>
                    <div className="scroll-area text-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                        {result.transcription}
                    </div>

                    {/* Token Usage Stats */}
                    {result.usage && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1.5rem',
                            background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart size={24} color="#c4b5fd" />
                                    <strong style={{ color: '#c4b5fd', fontSize: '1.1rem' }}>Relatório de Consumo</strong>
                                </div>
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    padding: '0.4rem 1rem',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                                }}>
                                    <DollarSign size={16} />
                                    Custo Estimado: R$ {estimateCost(result)}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', color: '#94a3b8' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>ENTRADA (PROMPT)</div>
                                    <strong style={{ fontSize: '1.2rem', color: '#e2e8f0' }}>{(result.usage.promptTokenCount || 0).toLocaleString()}</strong>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>SAÍDA (RESPOSTA)</div>
                                    <strong style={{ fontSize: '1.2rem', color: '#e2e8f0' }}>{(result.usage.candidatesTokenCount || 0).toLocaleString()}</strong>
                                </div>
                                {result.usage.cachedContentTokenCount ? (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>CACHE</div>
                                        <strong style={{ fontSize: '1.2rem', color: '#e2e8f0' }}>{result.usage.cachedContentTokenCount.toLocaleString()}</strong>
                                    </div>
                                ) : null}
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                    <div style={{ fontSize: '0.8rem', marginBottom: '0.3rem', color: '#c4b5fd' }}>TOTAL API</div>
                                    <strong style={{ fontSize: '1.2rem', color: 'white' }}>{(result.usage.totalTokenCount || 0).toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
