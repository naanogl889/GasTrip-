
import React, { useState, useMemo, useEffect } from 'react';
import { TripData, CalculationResult, AiInsight, HelperType } from './types';
import { InputField } from './components/InputSection';
import { ResultCard } from './components/ResultCard';
import { getFuelInsights, getSmartHelper } from './services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const DistanceIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const GasIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
const PriceIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const ShareIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>;

const App: React.FC = () => {
  const [data, setData] = useState<TripData>(() => {
    const saved = localStorage.getItem('gastrip_data_v4');
    return saved ? JSON.parse(saved) : { distance: 0, consumption: 0, price: 0 };
  });

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeHelper, setActiveHelper] = useState<HelperType | null>(null);
  const [helperLoading, setHelperLoading] = useState(false);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Split Expense State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [numPeople, setNumPeople] = useState(1);

  // Helper form local states
  const [distanceForm, setDistanceForm] = useState({ origin: '', destination: '', type: 'one-way' });
  const [consumptionForm, setConsumptionForm] = useState({ carModel: '', routeType: 'mixto' });
  const [priceForm, setPriceForm] = useState({ city: '', fuelType: 'gasolina' });

  useEffect(() => {
    localStorage.setItem('gastrip_data_v4', JSON.stringify(data));
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [data, isDarkMode]);

  const results = useMemo(() => {
    const totalLiters = (data.distance / 100) * data.consumption;
    const totalCost = totalLiters * data.price;
    const costPerKm = data.distance > 0 ? totalCost / data.distance : 0;
    return { totalCost, totalLiters, costPerKm };
  }, [data]);

  const costPerPerson = useMemo(() => {
    return numPeople > 0 ? results.totalCost / numPeople : results.totalCost;
  }, [results.totalCost, numPeople]);

  const chartData = [
    { name: 'Coste (€)', value: parseFloat(results.totalCost.toFixed(2)) },
    { name: 'Litros (L)', value: parseFloat(results.totalLiters.toFixed(2)) },
  ];

  const handleExecuteHelper = async () => {
    setHelperLoading(true);
    let result = null;

    if (activeHelper === 'distance') {
      result = await getSmartHelper('distance', distanceForm);
      if (result !== null) {
        const finalDistance = distanceForm.type === 'round-trip' ? result * 2 : result;
        setData(p => ({ ...p, distance: finalDistance }));
      }
    } else if (activeHelper === 'consumption') {
      result = await getSmartHelper('consumption', consumptionForm);
      if (result !== null) setData(p => ({ ...p, consumption: result }));
    } else if (activeHelper === 'price') {
      result = await getSmartHelper('price', priceForm);
      if (result !== null) setData(p => ({ ...p, price: result }));
    }

    if (result === null) alert("Lo sentimos, no pudimos obtener el dato. Prueba a ser más específico.");
    else setActiveHelper(null);
    
    setHelperLoading(false);
  };

  const handleFinalShare = () => {
    let text = `🚗 *Resumen de Viaje - GasTrip*\n\n` +
      `📍 Trayecto: ${data.distance} km\n` +
      `⛽ Consumo: ${data.consumption} L/100km\n` +
      `💸 COSTE TOTAL: *${results.totalCost.toFixed(2)} €*\n`;

    if (numPeople > 1) {
      text += `👥 Dividido entre: ${numPeople} personas\n` +
              `💳 CADA UNO PAGA: *${costPerPerson.toFixed(2)} €*\n`;
    }

    text += `\nCalculado con GasTrip ✨`;
    
    if (navigator.share) {
      navigator.share({ title: 'Resumen Gastos de Viaje', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copiado al portapapeles');
    }
    setIsShareModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* HEADER */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
              <GasIcon />
            </div>
            <h1 className="text-xl font-black tracking-tighter">GasTrip</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => { setData({ distance: 0, consumption: 0, price: 0 }); setInsights([]); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">Limpiar</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* COLUMN 1: INPUTS */}
          <section className="lg:col-span-5 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-600 mb-10">Detalles del Viaje</h2>
              
              <div className="space-y-12">
                <InputField 
                  label="Kilómetros Recorridos" 
                  value={data.distance} 
                  onChange={(v) => setData(p => ({ ...p, distance: v }))} 
                  unit="KM" icon={<DistanceIcon />} 
                  helpText="¿No sabes los km?" 
                  onHelp={() => setActiveHelper('distance')}
                />

                <InputField 
                  label="Consumo Medio" 
                  value={data.consumption} 
                  onChange={(v) => setData(p => ({ ...p, consumption: v }))} 
                  unit="L/100" icon={<GasIcon />} 
                  helpText="¿Cuánto consume?" 
                  onHelp={() => setActiveHelper('consumption')}
                />

                <InputField 
                  label="Precio del Litro" 
                  value={data.price} 
                  onChange={(v) => setData(p => ({ ...p, price: v }))} 
                  unit="€/L" icon={<PriceIcon />} 
                  helpText="¿A cuánto está?" 
                  onHelp={() => setActiveHelper('price')}
                />
              </div>
            </div>

            <button 
              onClick={() => setIsShareModalOpen(true)} 
              disabled={results.totalCost === 0}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.75rem] font-black flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 active:scale-95 disabled:opacity-20 transition-all uppercase text-xs tracking-widest"
            >
              Compartir Gastos <ShareIcon />
            </button>
          </section>

          {/* COLUMN 2: RESULTS */}
          <section className="lg:col-span-7 space-y-10">
            {/* HERO TOTAL COST */}
            <div className="bg-indigo-600 dark:bg-indigo-500 p-12 rounded-[3.5rem] text-white shadow-2xl shadow-indigo-500/30 group relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-80 block mb-4">COSTE TOTAL DEL VIAJE</span>
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl sm:text-8xl font-black tabular-nums tracking-tighter">{results.totalCost.toFixed(2)}</span>
                  <span className="text-3xl font-black opacity-60">€</span>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ResultCard label="Litros Totales" value={results.totalLiters.toFixed(2)} unit="L" color="bg-white dark:bg-slate-900 border dark:border-slate-800" />
              <ResultCard label="Coste por KM" value={results.costPerKm.toFixed(3)} unit="€" color="bg-white dark:bg-slate-900 border dark:border-slate-800" />
            </div>

            {/* CHART BREAKDOWN */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Análisis Métrico</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="8 8" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                    <XAxis dataKey="name" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                    <YAxis fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                      {chartData.map((e, i) => <Cell key={i} fill={i === 0 ? '#6366f1' : '#fbbf24'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECONDARY SECTIONS: Carbon and Insights */}
            <div className="pt-10 border-t dark:border-slate-800 space-y-10">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <h4 className="text-emerald-800 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">Impacto Ambiental</h4>
                  <p className="text-emerald-700/80 dark:text-emerald-300/80 text-sm font-medium">Has generado <span className="font-bold text-emerald-900 dark:text-emerald-100">{(results.totalLiters * 2.31).toFixed(1)}kg de CO2</span>.</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-2xl">🌱</div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={async () => { setInsightsLoading(true); setInsights(await getFuelInsights(data)); setInsightsLoading(false); }}
                  disabled={insightsLoading || results.totalCost === 0}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-2 group"
                >
                  <span className="group-hover:scale-125 transition-transform">✨</span> {insightsLoading ? 'Analizando...' : 'Generar análisis inteligente'}
                </button>
                <div className="grid gap-4">
                  {insights.map((ins, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{ins.title}</h5>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${ins.impact === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{ins.impact}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ins.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* SHARE MODAL (SPLIT EXPENSE) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[3rem] shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black tracking-tighter dark:text-white">Compartir Gastos</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">✕</button>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block ml-1">Dividir entre cuantas personas:</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-3 px-6 text-center border dark:border-slate-800">
                    <span className="text-2xl font-black tabular-nums">{numPeople}</span>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-tighter">Personas</span>
                  </div>
                  <button 
                    onClick={() => setNumPeople(numPeople + 1)}
                    className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 text-center">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] block mb-2">CADA UNO PAGA</span>
                <div className="flex items-baseline justify-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <span className="text-4xl font-black tabular-nums">{costPerPerson.toFixed(2)}</span>
                  <span className="text-lg font-black opacity-60">€</span>
                </div>
              </div>

              <button 
                onClick={handleFinalShare}
                className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                CONFIRMAR Y COMPARTIR ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSISTANT MODALS */}
      {activeHelper && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[3rem] shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black tracking-tighter dark:text-white">
                {activeHelper === 'distance' ? 'Calculador de Ruta' : activeHelper === 'consumption' ? 'Consumo Estimado' : 'Precio Actual'}
              </h3>
              <button onClick={() => setActiveHelper(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">✕</button>
            </div>
            
            <div className="space-y-6">
              {activeHelper === 'distance' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Origen</label>
                    <input autoFocus type="text" placeholder="Ciudad de salida" value={distanceForm.origin} onChange={e => setDistanceForm(f => ({...f, origin: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destino</label>
                    <input type="text" placeholder="Ciudad de llegada" value={distanceForm.destination} onChange={e => setDistanceForm(f => ({...f, destination: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button onClick={() => setDistanceForm(f => ({...f, type: 'one-way'}))} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${distanceForm.type === 'one-way' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>Solo Ida</button>
                    <button onClick={() => setDistanceForm(f => ({...f, type: 'round-trip'}))} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${distanceForm.type === 'round-trip' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>Ida y Vuelta</button>
                  </div>
                </div>
              )}

              {activeHelper === 'consumption' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vehículo</label>
                    <input autoFocus type="text" placeholder="Marca y modelo (ej: Seat Ibiza 2022)" value={consumptionForm.carModel} onChange={e => setConsumptionForm(f => ({...f, carModel: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    {['urbano', 'mixto', 'carretera'].map(t => (
                      <button key={t} onClick={() => setConsumptionForm(f => ({...f, routeType: t}))} className={`py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${consumptionForm.routeType === t ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {activeHelper === 'price' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ubicación</label>
                    <input autoFocus type="text" placeholder="Tu ciudad" value={priceForm.city} onChange={e => setPriceForm(f => ({...f, city: e.target.value}))} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    {['gasolina', 'diésel'].map(t => (
                      <button key={t} onClick={() => setPriceForm(f => ({...f, fuelType: t}))} className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${priceForm.fuelType === t ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={handleExecuteHelper} 
                disabled={helperLoading}
                className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {helperLoading ? <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : "OBTENER DATOS ✨"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
