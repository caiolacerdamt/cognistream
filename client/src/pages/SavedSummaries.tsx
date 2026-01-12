
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ExternalLink, Calendar, FileText, Tag, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface SavedSummary {
    id: string;
    content: string;
    key_topics: string[];
    created_at: string;
    video: {
        original_url: string;
        id: string;
        transcriptions: { content: string }[];
    } | any;
}

export function SavedSummaries() {
    const [summaries, setSummaries] = useState<SavedSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchSummaries();
    }, []);

    const fetchSummaries = async () => {
        try {
            const { data, error } = await supabase
                .from('summaries')
                .select(`
          id,
          content,
          key_topics,
          created_at,
          video:video_id (
            original_url, 
            id,
            transcriptions (
              content
            )
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSummaries(data || []);
        } catch (error) {
            console.error('Error fetching summaries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, videoId: string) => {
        e.stopPropagation(); // Prevent toggling expand
        if (!window.confirm('Tem certeza que deseja excluir este resumo?')) return;

        try {
            // Delete from videos table (cascades to summaries, transcriptions)
            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (error) throw error;

            // Update local state
            setSummaries(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting summary:', error);
            alert('Erro ao excluir resumo.');
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <FileText size={32} color="#a78bfa" />
                    <h2 style={{ fontSize: '1.8rem', margin: 0, color: '#f8fafc' }}>Resumos Salvos</h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</span>
                        <p>Carregando sua biblioteca...</p>
                    </div>
                ) : summaries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px dashed #475569' }}>
                        <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Nenhum resumo salvo ainda.</p>
                        <p style={{ color: '#64748b' }}>Processe um vídeo na página inicial para começar.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {summaries.map((item) => {
                            // Helper to safely get video object (handle potential array or object response structure)
                            const videoRef = Array.isArray(item.video) ? item.video[0] : item.video;

                            return (
                                <div key={item.id} style={{
                                    background: 'rgba(30, 41, 59, 0.4)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div
                                        onClick={() => toggleExpand(item.id)}
                                        style={{
                                            padding: '1.5rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                            gap: '1.5rem'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Thumbnail */}
                                        {(() => {
                                            const url = videoRef?.original_url;
                                            if (!url) return null;

                                            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                            const match = url.match(regExp);
                                            const videoId = (match && match[2].length === 11) ? match[2] : null;

                                            return videoId ? (
                                                <div style={{
                                                    width: '180px',
                                                    aspectRatio: '16/9',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    position: 'relative'
                                                }}>
                                                    <img
                                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                                        alt="Thumbnail"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                            ) : null;
                                        })()}

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    color: '#a5b4fc',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                }}>
                                                    <Calendar size={12} />
                                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                {videoRef?.original_url && (
                                                    <a
                                                        href={videoRef.original_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            color: '#2dd4bf',
                                                            textDecoration: 'none',
                                                            fontSize: '0.85rem',
                                                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                        }}
                                                    >
                                                        <ExternalLink size={14} />
                                                        Abrir Original
                                                    </a>
                                                )}
                                            </div>

                                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                                                {item.content.substring(0, 120)}...
                                            </h3>

                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {item.key_topics && item.key_topics.slice(0, 3).map((topic, idx) => (
                                                    <span key={idx} style={{ color: '#94a3b8', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Tag size={10} /> {topic}
                                                    </span>
                                                ))}
                                                {item.key_topics?.length > 3 && (
                                                    <span style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.2rem' }}>+{item.key_topics.length - 3}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <button
                                                onClick={(e) => handleDelete(e, item.id, videoRef?.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#94a3b8',
                                                    padding: '0.5rem',
                                                    borderRadius: '50%',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = '#ef4444';
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = '#94a3b8';
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                            <div style={{ color: '#64748b' }}>
                                                {expandedId === item.id ? <ChevronUp /> : <ChevronDown />}
                                            </div>
                                        </div>
                                    </div>

                                    {expandedId === item.id && (
                                        <div style={{
                                            padding: '0 1.5rem 1.5rem 1.5rem',
                                            borderTop: '1px solid rgba(255,255,255,0.05)',
                                            animation: 'fadeIn 0.3s ease'
                                        }}>
                                            <div style={{ marginTop: '1rem', color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                                                {item.content}
                                            </div>

                                            {item.key_topics && item.key_topics.length > 0 && (
                                                <div style={{ marginTop: '1.5rem' }}>
                                                    <strong style={{ display: 'block', marginBottom: '0.8rem', color: '#a5b4fc', fontSize: '0.9rem' }}>TOPICOS CHAVE</strong>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {item.key_topics.map((topic, idx) => (
                                                            <span key={idx} style={{
                                                                background: 'rgba(165, 180, 252, 0.1)',
                                                                border: '1px solid rgba(165, 180, 252, 0.2)',
                                                                color: '#e0e7ff',
                                                                padding: '0.3rem 0.8rem',
                                                                borderRadius: '20px',
                                                                fontSize: '0.85rem'
                                                            }}>
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Full Transcription */}
                                            {videoRef?.transcriptions?.[0]?.content && (
                                                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <strong style={{ display: 'block', marginBottom: '0.8rem', color: '#2dd4bf', fontSize: '0.9rem' }}>TRANSCRIÇÃO COMPLETA</strong>
                                                    <div style={{
                                                        maxHeight: '300px',
                                                        overflowY: 'auto',
                                                        background: 'rgba(0,0,0,0.2)',
                                                        padding: '1rem',
                                                        borderRadius: '8px',
                                                        color: '#94a3b8',
                                                        fontSize: '0.9rem',
                                                        whiteSpace: 'pre-wrap'
                                                    }}>
                                                        {videoRef.transcriptions[0].content}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
