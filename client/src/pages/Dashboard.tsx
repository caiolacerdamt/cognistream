
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Coins, Activity, Zap, Filter, Calendar as CalendarIcon, Bot, ChevronDown } from 'lucide-react';

interface UsageLog {
    id: string;
    provider: string;
    model: string;
    total_tokens: number;
    cost_brl: number;
    created_at: string;
}

type DateRange = 'all' | 'today' | 'week' | 'month';

// Helper Component for Custom Dropdown
function CustomDropdown({
    icon,
    value,
    options,
    onChange
}: {
    icon: React.ReactNode,
    value: string,
    options: { value: string, label: string, color?: string }[],
    onChange: (val: string) => void
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    minWidth: '200px',
                    justifyContent: 'space-between',
                    transition: 'background 0.2s, border-color 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {icon}
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedOption.label}</span>
                </div>
                <ChevronDown size={16} style={{
                    color: '#94a3b8',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                }} />
            </button>

            {isOpen && (
                <div className="fade-in" style={{
                    position: 'absolute',
                    top: '120%',
                    left: 0,
                    right: 0,
                    background: '#0f172a', // Solid Dark Background to prevent transparency issues
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    zIndex: 100, // High z-index for the dropdown itself
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)'
                }}>
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '0.8rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: value === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: value === opt.value ? 'white' : '#94a3b8',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (value !== opt.value) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.color = '#e2e8f0';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== opt.value) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#94a3b8';
                                }
                            }}
                        >
                            {opt.color && (
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: opt.color,
                                    boxShadow: `0 0 8px ${opt.color}`
                                }}></div>
                            )}
                            <span style={{ fontSize: '0.9rem' }}>{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function Dashboard() {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [providerFilter, setProviderFilter] = useState<'all' | 'openai' | 'gemini'>('all');
    const [dateRange, setDateRange] = useState<DateRange>('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('usage_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterLogs = (logs: UsageLog[]) => {
        return logs.filter(log => {
            // Provider Filter
            if (providerFilter !== 'all' && log.provider !== providerFilter) return false;

            // Date Filter
            const logDate = new Date(log.created_at);
            const now = new Date();

            if (dateRange === 'today') {
                return logDate.getDate() === now.getDate() &&
                    logDate.getMonth() === now.getMonth() &&
                    logDate.getFullYear() === now.getFullYear();
            }
            if (dateRange === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return logDate >= weekAgo;
            }
            if (dateRange === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return logDate >= monthAgo;
            }
            return true;
        });
    };

    const filteredLogs = filterLogs(logs);

    const totalCost = filteredLogs.reduce((acc, log) => acc + (log.cost_brl || 0), 0);
    const totalTokens = filteredLogs.reduce((acc, log) => acc + (log.total_tokens || 0), 0);

    const formatModelName = (modelRaw: string) => {
        if (!modelRaw) return '-';
        if (modelRaw.includes('gemini')) return 'Gemini 2.5 Flash';
        if (modelRaw.includes('gpt-5') || modelRaw.includes('gpt-4')) return 'GPT-5 Mini';
        return modelRaw;
    };

    return (
        <div className="fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Filters Bar - Centered and Styled */}
            <div className="glass-panel" style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2rem',
                alignItems: 'center',
                justifyContent: 'center', // Centering requested by user
                position: 'relative',
                zIndex: 50 // High z-index ensures it sits above the cards below
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1.5rem' }}>
                    <Filter size={20} color="#a78bfa" />
                    <span style={{ fontWeight: 500, color: '#e2e8f0' }}>Filtrar por:</span>
                </div>

                {/* Custom Provider Dropdown */}
                <CustomDropdown
                    icon={<Bot size={18} color="#c4b5fd" />}
                    value={providerFilter}
                    onChange={(val) => setProviderFilter(val as any)}
                    options={[
                        { value: 'all', label: 'Todos os Modelos', color: '#94a3b8' },
                        { value: 'gemini', label: 'Google Gemini', color: '#a78bfa' },
                        { value: 'openai', label: 'OpenAI GPT-5 Mini', color: '#10a37f' }
                    ]}
                />

                {/* Custom Date Dropdown */}
                <CustomDropdown
                    icon={<CalendarIcon size={18} color="#c4b5fd" />}
                    value={dateRange}
                    onChange={(val) => setDateRange(val as any)}
                    options={[
                        { value: 'all', label: 'Todo o Período' },
                        { value: 'today', label: 'Hoje' },
                        { value: 'week', label: 'Últimos 7 dias' },
                        { value: 'month', label: 'Últimos 30 dias' }
                    ]}
                />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Total Cost Card */}
                <div style={{
                    flex: '1 1 300px',
                    background: 'rgba(6, 78, 59, 0.4)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                            <Coins size={24} color="#34d399" />
                        </div>
                        <h3 style={{ margin: 0, color: '#d1fae5', fontWeight: 500 }}>Gasto Total</h3>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#34d399' }}>
                        R$ {totalCost.toFixed(4).replace('.', ',')}
                    </div>
                    <p style={{ margin: '0.5rem 0 0', color: '#6ee7b7', fontSize: '0.9rem' }}>
                        {dateRange === 'all' ? 'Desde o início' : 'No período selecionado'}
                    </p>
                </div>

                {/* Total Tokens Card */}
                <div style={{
                    flex: '1 1 300px',
                    background: 'rgba(49, 46, 129, 0.4)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px' }}>
                            <Zap size={24} color="#818cf8" />
                        </div>
                        <h3 style={{ margin: 0, color: '#e0e7ff', fontWeight: 500 }}>Tokens Processados</h3>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#818cf8' }}>
                        {totalTokens.toLocaleString()}
                    </div>
                    <p style={{ margin: '0.5rem 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                        Prompt + Completions
                    </p>
                </div>
            </div>

            <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Activity size={28} color="#f472b6" />
                        <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#f8fafc' }}>Histórico de Uso</h2>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        {filteredLogs.length} requisições encontradas
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Carregando...</div>
                ) : filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Nenhum registro encontrado para estes filtros.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>DATA</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>MODELO</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>TOKENS</th>
                                    <th style={{ textAlign: 'right', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>CUSTO (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '6px',
                                                background: log.provider === 'openai' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: log.provider === 'openai' ? '#34d399' : '#60a5fa',
                                                fontSize: '0.8rem',
                                                border: log.provider === 'openai' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)'
                                            }}>
                                                {formatModelName(log.model)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                                            {log.total_tokens?.toLocaleString() || 0}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#e2e8f0' }}>
                                            R$ {log.cost_brl?.toFixed(6) || "0,000000"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
