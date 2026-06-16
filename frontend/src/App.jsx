import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  Plus, 
  Search, 
  Mail, 
  MessageSquare, 
  Calendar, 
  X, 
  ChevronRight, 
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isAuditingOpen, setIsAuditingOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  const tabNames = {
    dashboard: 'Painel Geral',
    send: 'Enviar Notificação',
    history: 'Histórico de Envios',
    templates: 'Modelos de Mensagem'
  };

  const statusTranslations = {
    PENDING: 'Pendente',
    SENT: 'Enviado',
    FAILED: 'Falhou'
  };

  const eventTranslations = {
    CREATED: 'Criada',
    SENT: 'Enviada',
    FAILED: 'Falhou',
    ENQUEUED: 'Enfileirada',
    PROCESSING: 'Processando'
  };
  
  // Notification Filter States
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Notification Form States
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendChannel, setSendChannel] = useState('EMAIL');
  const [sendTemplateId, setSendTemplateId] = useState('');
  const [sendVariables, setSendVariables] = useState({});

  // New Template Form States
  const [templateName, setTemplateName] = useState('');
  const [templateChannel, setTemplateChannel] = useState('EMAIL');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const queryClient = useQueryClient();

  // Queries
  const { data: metricsData, refetch: refetchMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await api.get('/metrics/summary');
      return res.data;
    },
    refetchInterval: 5000 // auto refresh every 5s
  });

  const { data: templates, refetch: refetchTemplates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data;
    }
  });

  const { data: notifications, refetch: refetchNotifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['notifications', filterStatus, filterChannel, filterStartDate, filterEndDate],
    queryFn: async () => {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterChannel) params.channel = filterChannel;
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString();
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString();
      
      const res = await api.get('/notifications', { params });
      return res.data;
    },
    refetchInterval: 5000
  });

  // Mutations
  const sendNotificationMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/notifications', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['metrics']);
      setSendRecipient('');
      setSendTemplateId('');
      setSendVariables({});
      setActiveTab('history');
      alert('Notificação enfileirada com sucesso!');
    },
    onError: (err) => {
      alert('Erro ao enviar notificação: ' + (err.response?.data?.message || err.message));
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/templates', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setIsNewTemplateModalOpen(false);
      setTemplateName('');
      setTemplateSubject('');
      setTemplateBody('');
      alert('Modelo criado com sucesso!');
    },
    onError: (err) => {
      alert('Erro ao criar modelo: ' + (err.response?.data?.message || err.message));
    }
  });

  // Handle template choice to extract variables
  useEffect(() => {
    if (!sendTemplateId || !templates) {
      setSendVariables({});
      return;
    }
    const selected = templates.find(t => t.id === sendTemplateId);
    if (selected) {
      // Find placeholders like {{varName}}
      const regex = /\{\{([^}]+)\}\}/g;
      const vars = [];
      let match;
      while ((match = regex.exec(selected.body)) !== null) {
        vars.push(match[1].trim());
      }
      if (selected.subject) {
        let matchSubject;
        while ((matchSubject = regex.exec(selected.subject)) !== null) {
          const v = matchSubject[1].trim();
          if (!vars.includes(v)) vars.push(v);
        }
      }
      const initialVars = {};
      vars.forEach(v => {
        initialVars[v] = '';
      });
      setSendVariables(initialVars);
    }
  }, [sendTemplateId, templates]);

  const handleSendNotification = (e) => {
    e.preventDefault();
    if (!sendRecipient || !sendTemplateId) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    sendNotificationMutation.mutate({
      recipient: sendRecipient,
      channel: sendChannel,
      templateId: sendTemplateId,
      variables: sendVariables
    });
  };

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!templateName || !templateBody) {
      alert('Por favor, insira o nome e o corpo do modelo');
      return;
    }
    createTemplateMutation.mutate({
      name: templateName,
      channel: templateChannel,
      subject: templateChannel === 'EMAIL' ? templateSubject : null,
      body: templateBody
    });
  };

  const openAuditLogs = async (notification) => {
    setSelectedNotification(notification);
    setIsAuditingOpen(true);
    try {
      const res = await api.get(`/audit/${notification.id}`);
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
      setAuditLogs([]);
    }
  };

  // Helper to extract totals from ROLLUP response
  const getAggregates = () => {
    if (!metricsData || !metricsData.metrics) return { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 };
    
    let total = 0;
    let sent = 0;
    let failed = 0;
    let pending = 0;

    metricsData.metrics.forEach(row => {
      // If channel and status are null, it's the grand total (rollup total)
      if (row.channel === null && row.status === null) {
        total = row.total;
      }
      if (row.channel !== null && row.status !== null) {
        if (row.status === 'SENT') sent += row.total;
        if (row.status === 'FAILED') failed += row.total;
        if (row.status === 'PENDING') pending += row.total;
      }
    });

    const processed = sent + failed;
    const successRate = processed > 0 ? ((sent / processed) * 100).toFixed(1) : 0;

    return { total, sent, failed, pending, successRate };
  };

  const aggregates = getAggregates();

  // Prepare chart data
  const getChartData = () => {
    if (!metricsData || !metricsData.metrics) return [];
    
    const map = {};
    metricsData.metrics.forEach(row => {
      if (row.channel && row.status) {
        if (!map[row.channel]) {
          map[row.channel] = { name: row.channel, SENT: 0, FAILED: 0, PENDING: 0 };
        }
        map[row.channel][row.status] = row.total;
      }
    });
    return Object.values(map);
  };

  const chartData = getChartData();
  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
              NS
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">NotifyHub</h1>
              <span className="text-xs text-slate-500">Motor de Notificações</span>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard size={18} />
              Painel Geral
            </button>
            <button 
              onClick={() => setActiveTab('send')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'send' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Send size={18} />
              Enviar Notificação
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History size={18} />
              Histórico de Envios
            </button>
            <button 
              onClick={() => setActiveTab('templates')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'templates' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText size={18} />
              Modelos de Mensagem
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 text-center">
          <span className="text-xs text-slate-500">v1.0.0 · Integrado com ActiveMQ</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-900">
        <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold">{tabNames[activeTab]}</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                refetchMetrics();
                refetchNotifications();
                refetchTemplates();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Sincronizar Dados"
            >
              <RefreshCw size={18} />
            </button>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-sm font-medium text-slate-400">Ambiente: <span className="text-emerald-400 font-semibold">Local</span></div>
          </div>
        </header>

        <div className="p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total de Requisições</p>
                  <p className="text-3xl font-bold mt-1 text-slate-100">{aggregates.total}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-medium text-emerald-500">Enviadas (Sucesso)</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-400">{aggregates.sent}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-medium text-red-500">Falhas</p>
                  <p className="text-3xl font-bold mt-1 text-red-400">{aggregates.failed}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-medium text-amber-500">Pendentes</p>
                  <p className="text-3xl font-bold mt-1 text-amber-400">{aggregates.pending}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-medium text-indigo-500">Taxa de Entrega</p>
                  <p className="text-3xl font-bold mt-1 text-indigo-400">{aggregates.successRate}%</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-base text-slate-300">Entregas por Canal</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155' }} />
                        <Legend />
                        <Bar dataKey="SENT" name="Enviadas" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="FAILED" name="Falhas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="PENDING" name="Pendentes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-base text-slate-300">Distribuição Geral de Status</h3>
                  <div className="h-80 flex flex-col justify-center items-center">
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Enviadas', value: aggregates.sent },
                            { name: 'Falhas', value: aggregates.failed },
                            { name: 'Pendentes', value: aggregates.pending }
                          ].filter(v => v.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Enviadas</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Falhas</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Pendentes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced SQL Metric Insights */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4 text-base text-slate-300">Métricas de Desempenho do Banco em Tempo Real</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900 text-slate-300 uppercase font-semibold text-xs border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-3">Canal</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Total (Histórico)</th>
                        <th className="px-6 py-3">Últimas 24 Horas</th>
                        <th className="px-6 py-3">Latência Média (Seg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {metricsData?.metrics?.map((row, idx) => (
                        <tr key={idx} className={`${row.channel === null ? 'bg-slate-900 font-bold text-indigo-400' : 'hover:bg-slate-900/50'}`}>
                          <td className="px-6 py-4">{row.channel ?? (row.status === null ? 'TOTAL GERAL' : 'TODOS OS CANAIS')}</td>
                          <td className="px-6 py-4">{row.status ? (statusTranslations[row.status] || row.status) : (row.channel === null ? '' : 'SUBTOTAL')}</td>
                          <td className="px-6 py-4">{row.total}</td>
                          <td className="px-6 py-4">{row.last24h}</td>
                          <td className="px-6 py-4">{row.avgSecondsToSend ? row.avgSecondsToSend.toFixed(2) + 's' : 'N/D'}</td>
                        </tr>
                      ))}
                      {!metricsData?.metrics?.length && (
                        <tr>
                          <td colSpan="5" className="text-center py-6 text-slate-600">Nenhum dado encontrado no banco de dados. Envie algumas notificações primeiro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISPATCH NOTIFICATION */}
          {activeTab === 'send' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-6 text-slate-200">Enviar Nova Mensagem</h3>
                <form onSubmit={handleSendNotification} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Canal de Envio</label>
                      <select 
                        value={sendChannel}
                        onChange={(e) => {
                          setSendChannel(e.target.value);
                          setSendTemplateId('');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="EMAIL">E-mail</option>
                        <option value="SMS">SMS (Mensagem de Texto)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Endereço do Destinatário</label>
                      <input 
                        type="text" 
                        required
                        value={sendRecipient}
                        onChange={(e) => setSendRecipient(e.target.value)}
                        placeholder={sendChannel === 'EMAIL' ? 'exemplo@dominio.com' : '+5511999999999'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Selecionar Modelo</label>
                    <select
                      required
                      value={sendTemplateId}
                      onChange={(e) => setSendTemplateId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Escolha um modelo ativo --</option>
                      {templates?.filter(t => t.channel === sendChannel).map(t => (
                        <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Variables Input fields */}
                  {Object.keys(sendVariables).length > 0 && (
                    <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 space-y-4">
                      <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Variáveis do Modelo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(sendVariables).map((key) => (
                          <div key={key}>
                            <label className="block text-xs text-slate-400 mb-1">{key}</label>
                            <input
                              type="text"
                              required
                              value={sendVariables[key]}
                              onChange={(e) => setSendVariables({
                                ...sendVariables,
                                [key]: e.target.value
                              })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder={`Valor para ${key}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sendNotificationMutation.isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-lg shadow-indigo-600/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    <Send size={18} />
                    {sendNotificationMutation.isLoading ? 'Enviando para a Fila...' : 'Enfileirar Notificação'}
                  </button>
                </form>
              </div>

              {/* Template Preview Sidebar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">Pré-visualização do Modelo</h3>
                {sendTemplateId ? (
                  (() => {
                    const selected = templates.find(t => t.id === sendTemplateId);
                    if (!selected) return null;
                    
                    // Replace placeholders in real-time
                    let renderedSubject = selected.subject || '';
                    let renderedBody = selected.body || '';
                    
                    Object.keys(sendVariables).forEach(key => {
                      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
                      const val = sendVariables[key] || `[${key}]`;
                      if (selected.subject) {
                        renderedSubject = renderedSubject.replace(placeholder, val);
                      }
                      renderedBody = renderedBody.replace(placeholder, val);
                    });

                    return (
                      <div className="space-y-4">
                        {selected.channel === 'EMAIL' && (
                          <div>
                            <span className="text-xs text-slate-500 font-bold block">Assunto:</span>
                            <div className="bg-slate-900 border border-slate-800 rounded p-2 text-sm text-slate-300 mt-1 font-medium italic">
                              {renderedSubject}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-slate-500 font-bold block">Corpo da Mensagem:</span>
                          <div className="bg-slate-900 border border-slate-800 rounded p-3 text-sm text-slate-300 mt-1 whitespace-pre-wrap font-mono h-64 overflow-y-auto">
                            {renderedBody}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center text-slate-600 h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg">
                    <Info size={36} className="mb-2 text-slate-700" />
                    <p className="text-sm">Selecione um modelo para visualizar seu corpo e preencher as variáveis dinamicamente.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="">Todos os Status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="SENT">Enviado</option>
                    <option value="FAILED">Falhou</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Canal</label>
                  <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="">Todos os Canais</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <button 
                    onClick={() => {
                      setFilterStatus('');
                      setFilterChannel('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                    className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900 text-slate-300 uppercase font-semibold text-xs border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-3">UUID</th>
                        <th className="px-6 py-3">Destinatário</th>
                        <th className="px-6 py-3">Canal</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Criado Em</th>
                        <th className="px-6 py-3">Enviado Em</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {notifications?.map((notif) => (
                        <tr key={notif.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{notif.id.slice(0, 8)}...</td>
                          <td className="px-6 py-4 text-slate-200 max-w-[180px] truncate">{notif.recipient}</td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5">
                              {notif.channel === 'EMAIL' ? <Mail size={14} className="text-sky-400" /> : <MessageSquare size={14} className="text-emerald-400" />}
                              {notif.channel}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                              notif.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' :
                              notif.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {notif.status === 'SENT' && <CheckCircle2 size={12} />}
                              {notif.status === 'FAILED' && <XCircle size={12} />}
                              {notif.status === 'PENDING' && <Clock size={12} />}
                              {statusTranslations[notif.status] || notif.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs">{new Date(notif.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-xs">{notif.sentAt ? new Date(notif.sentAt).toLocaleString() : '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => openAuditLogs(notif)}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 text-xs"
                            >
                              <Eye size={14} /> Rastro de Auditoria
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!notifications?.length && (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-slate-600">Nenhum registro corresponde aos filtros.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-400">Modelos de mensagem criados que estão ativos no sistema.</p>
                <button 
                  onClick={() => setIsNewTemplateModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  <Plus size={16} /> Criar Modelo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates?.map(template => (
                  <div key={template.id} className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-slate-200">{template.name}</h4>
                        <span className="text-xs text-slate-500 font-mono">ID: {template.id}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        template.channel === 'EMAIL' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {template.channel}
                      </span>
                    </div>

                    {template.subject && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase block">Assunto</span>
                        <p className="text-sm text-slate-300 bg-slate-900 p-2 rounded mt-1 font-medium italic">{template.subject}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase block">Corpo do Modelo</span>
                      <p className="text-sm text-slate-300 font-mono bg-slate-900 p-3 rounded mt-1 whitespace-pre-wrap max-h-36 overflow-y-auto">{template.body}</p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-900 pt-3">
                      <span>Versão: {template.version}</span>
                      <span>Criado em: {new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {!templates?.length && (
                  <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                    Nenhum modelo cadastrado. Clique em "Criar Modelo" para adicionar um.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: CREATE TEMPLATE */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl p-8 space-y-6 relative m-4">
            <button 
              onClick={() => setIsNewTemplateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-100">Criar Novo Modelo</h3>
            
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Modelo</label>
                <input 
                  type="text" 
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="ex: email-boas-vindas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Canal</label>
                <select 
                  value={templateChannel}
                  onChange={(e) => setTemplateChannel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EMAIL">E-mail</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              {templateChannel === 'EMAIL' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Assunto do E-mail</label>
                  <input 
                    type="text" 
                    required
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    placeholder="Boas-vindas à {{company}}!"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Corpo do Modelo</label>
                <textarea 
                  rows="5"
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Olá {{name}}, boas-vindas à nossa plataforma! Use o código {{code}} para verificar sua conta."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">Escreva as variáveis dentro de chaves duplas como {"{{nome_da_variavel}}"}</p>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 hover:text-white font-medium py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg disabled:opacity-50"
                >
                  {createTemplateMutation.isLoading ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER/MODAL: AUDIT TRAIL */}
      {isAuditingOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-slate-950 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6 space-y-6 relative shadow-2xl">
            <button 
              onClick={() => {
                setIsAuditingOpen(false);
                setSelectedNotification(null);
                setAuditLogs([]);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div>
              <h3 className="text-xl font-bold text-slate-100">Rastro de Auditoria</h3>
              <p className="text-xs text-slate-500 mt-1">Notificação: {selectedNotification.id}</p>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 text-xs">
                <span className="text-slate-500 font-semibold">Destinatário:</span>
                <span className="text-slate-300 truncate">{selectedNotification.recipient}</span>
                <span className="text-slate-500 font-semibold mt-2">Canal:</span>
                <span className="text-slate-300 mt-2">{selectedNotification.channel}</span>
                <span className="text-slate-500 font-semibold mt-2">Status:</span>
                <span className={`font-semibold mt-2 ${
                  selectedNotification.status === 'SENT' ? 'text-emerald-400' :
                  selectedNotification.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'
                }`}>{statusTranslations[selectedNotification.status] || selectedNotification.status}</span>
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Registro de Eventos</h4>
              {auditLogs.length > 0 ? (
                <div className="relative border-l-2 border-slate-800 ml-3 pl-6 space-y-6 py-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-slate-950 flex items-center justify-center ${
                        log.event === 'SENT' ? 'bg-emerald-500' :
                        log.event === 'FAILED' ? 'bg-red-500' :
                        'bg-indigo-500'
                      }`} />
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold text-sm text-slate-200">{eventTranslations[log.event] || log.event}</span>
                          <span className="text-[10px] text-slate-500">{new Date(log.occurredAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-400">{log.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-700 py-12">
                  <Clock size={28} className="mx-auto mb-2 text-slate-800" />
                  <p className="text-xs">Carregando registros de auditoria...</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setIsAuditingOpen(false);
                setSelectedNotification(null);
                setAuditLogs([]);
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
