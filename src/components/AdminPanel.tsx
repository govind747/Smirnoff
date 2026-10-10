import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ArrowLeft, BarChart3, Calendar, Camera, Check, CheckCircle2, ChevronDown,
  Clock, LockKeyhole, MessageCircle, RefreshCw, TrendingUp, Users, Wine, X,
} from 'lucide-react';
import { supabase, SLOTS, type ActivityPhoto, type Location, type Session, type SlotReport } from '@/lib/supabase';

type Props = { onBack: () => void };

type LocationSummary = {
  location: Location;
  session: Session | null;
  reports: SlotReport[];
  photos: ActivityPhoto[];
};

type HistoryDay = {
  date: string;
  sessions: { session: Session; location: Location; reports: SlotReport[]; photos: ActivityPhoto[] }[];
};

const IST_TIME_ZONE = 'Asia/Kolkata';
const getISTDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIME_ZONE }).format(new Date());

const photoLabels: Record<ActivityPhoto['photo_type'], string> = {
  login: 'Login',
  logout: 'Logout',
  slot: 'Slot',
};

export default function AdminPanel({ onBack }: Props) {
  const [pin, setPin] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setError(null);
    const { data, error: verificationError } = await supabase.rpc('verify_admin_pin', { input_pin: pin });
    if (verificationError || data !== true) {
      setError('That admin PIN is not valid.');
      return;
    }
    setAuthorized(true);
  };

  if (!authorized) {
    return <AdminPinEntry pin={pin} setPin={setPin} error={error} onVerify={verify} onBack={onBack} />;
  }

  return <AdminAnalytics onBack={onBack} />;
}

function AdminPinEntry({ pin, setPin, error, onVerify, onBack }: {
  pin: string;
  setPin: (value: string) => void;
  error: string | null;
  onVerify: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 admin-hero opacity-40" />
      <div className="relative z-10 w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-jamun-200 hover:text-mint-200 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to welcome
        </button>
        <div className="bg-jamun-950/90 border border-white/15 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-mint-400/15 border border-mint-300/20 flex items-center justify-center">
            <LockKeyhole className="w-7 h-7 text-mint-200" />
          </div>
          <p className="text-mint-200 text-xs uppercase tracking-[0.24em] mb-2">Supervisor access</p>
          <h1 className="font-display text-3xl text-white font-bold mb-2">Activity Monitor</h1>
          <p className="text-jamun-200 text-sm mb-6">Enter the admin PIN to view all four locations.</p>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(event) => { if (event.key === 'Enter' && pin.length === 4) onVerify(); }}
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            placeholder="••••"
            className="w-full bg-white/10 border border-white/15 rounded-2xl py-4 text-center text-3xl tracking-[0.5em] text-white placeholder-white/30 focus:outline-none focus:border-mint-300"
          />
          {error && <p className="text-red-300 text-sm mt-4">{error}</p>}
          <button
            onClick={onVerify}
            disabled={pin.length !== 4}
            className="w-full mt-5 py-3.5 rounded-2xl bg-mint-400 text-jamun-950 font-bold disabled:bg-white/10 disabled:text-white/35 transition-colors"
          >
            Open monitoring dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

type AdminTab = 'today' | 'history';

function AdminAnalytics({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<AdminTab>('today');

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 admin-hero opacity-25" />
      <header className="relative z-10 border-b border-white/10 bg-jamun-975/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-mint-400/15 border border-mint-300/20 flex items-center justify-center">
              <Wine className="w-6 h-6 text-mint-200" />
            </div>
            <div>
              <p className="text-mint-200 text-xs uppercase tracking-[0.2em]">Supervisor view</p>
              <h1 className="text-white font-semibold">Minty Jamun Activity Monitor</h1>
            </div>
          </div>
          <button onClick={onBack} className="flex items-center gap-2 text-jamun-200 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {([
            { id: 'today', label: 'Today', icon: BarChart3 },
            { id: 'history', label: 'Daily History', icon: Calendar },
          ] as { id: AdminTab; label: string; icon: ComponentType<{ className?: string }> }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-mint-400 text-mint-300' : 'border-transparent text-jamun-300 hover:text-white'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-7">
        {tab === 'today' ? <AdminTodayView /> : <AdminHistoryView />}
      </main>
    </div>
  );
}

function AdminTodayView() {
  const [summaries, setSummaries] = useState<LocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const today = getISTDate();
    const { data: locations, error: locationsError } = await supabase.from('locations').select('*').order('id');
    if (locationsError || !locations) {
      setMessage('Could not load locations right now.');
      setLoading(false);
      return;
    }
    const { data: sessions, error: sessionsError } = await supabase.from('sessions').select('*').eq('session_date', today);
    if (sessionsError) {
      setMessage('Could not load today’s activity.');
      setLoading(false);
      return;
    }
    const sessionIds = (sessions ?? []).map((session) => session.id);
    const [reportsResult, photosResult] = await Promise.all([
      sessionIds.length
        ? supabase.from('slot_reports').select('*').in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase.from('activity_photos').select('*').in('session_id', sessionIds).order('created_at')
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (reportsResult.error || photosResult.error) {
      setMessage('Could not load today’s evidence.');
      setLoading(false);
      return;
    }
    setSummaries(locations.map((location) => {
      const session = (sessions ?? []).find((item) => item.location_id === location.id) ?? null;
      return {
        location,
        session,
        reports: (reportsResult.data ?? []).filter((report) => report.session_id === session?.id),
        photos: (photosResult.data ?? []).filter((photo) => photo.session_id === session?.id),
      };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => summaries.reduce((acc, summary) => {
    summary.reports.forEach((report) => {
      acc.bottles += report.bottles_sold;
      acc.customers += report.customers_approached;
      acc.jars += report.jars_given;
    });
    return acc;
  }, { bottles: 0, customers: 0, jars: 0 }), [summaries]);

  if (loading) return <div className="py-20 text-center text-jamun-200">Loading live reports...</div>;
  if (message) return <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4 text-red-200 text-sm">{message}</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-mint-200 text-xs uppercase tracking-[0.2em]">India Standard Time</p>
          <h2 className="font-display text-3xl font-bold text-white">Today’s field performance</h2>
          <p className="text-jamun-200 text-sm mt-1">Live view for 2 PM–10 PM · {getISTDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl text-jamun-200 hover:text-mint-200 hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-mint-400/10 border border-mint-300/20 px-3 py-2 text-xs text-mint-200">
            <span className="w-2 h-2 rounded-full bg-mint-300 animate-pulse" /> Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric icon={TrendingUp} label="Bottles sold" value={totals.bottles} />
        <Metric icon={Users} label="Customers approached" value={totals.customers} />
        <Metric icon={CheckCircle2} label="Jars given" value={totals.jars} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {summaries.map((summary) => <AdminLocationCard key={summary.location.id} summary={summary} />)}
      </div>

      <div className="bg-jamun-950/75 border border-white/10 rounded-3xl p-5 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-mint-200" />
          <h3 className="text-white font-semibold">Two-hour comparison</h3>
        </div>
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="text-jamun-300 border-b border-white/10">
              <th className="text-left py-3">Time slot</th>
              {summaries.map((summary) => <th key={summary.location.id} className="text-center py-3">{summary.location.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot.number} className="border-b border-white/5">
                <td className="py-3 text-white font-medium">{slot.label}</td>
                {summaries.map((summary) => {
                  const report = summary.reports.find((item) => item.slot_number === slot.number);
                  return <td key={summary.location.id} className="text-center py-3 text-mint-100">{report ? `${report.bottles_sold} / ${report.customers_approached}` : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-jamun-300 text-xs mt-3">Each cell shows bottles sold / customers approached.</p>
      </div>
    </div>
  );
}

function AdminLocationCard({ summary }: { summary: LocationSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [activePhoto, setActivePhoto] = useState<ActivityPhoto | null>(null);

  const bottles = summary.reports.reduce((sum, report) => sum + report.bottles_sold, 0);
  const customers = summary.reports.reduce((sum, report) => sum + report.customers_approached, 0);
  const jars = summary.reports.reduce((sum, report) => sum + report.jars_given, 0);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === summary.photos.length) setSelected(new Set());
    else setSelected(new Set(summary.photos.map((p) => p.id)));
  };

  const shareSelected = () => {
    const chosen = summary.photos.filter((p) => selected.has(p.id));
    if (!chosen.length) return;
    const text = `${summary.location.name} — selected evidence photos\n${chosen.map((photo) => `${photoLabels[photo.photo_type]}${photo.slot_number ? ` ${photo.slot_number}` : ''} photo: ${photo.photo_url}`).join('\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const shareAll = () => {
    if (!summary.photos.length) return;
    const text = `${summary.location.name} — all evidence photos\n${summary.photos.map((photo) => `${photoLabels[photo.photo_type]}${photo.slot_number ? ` ${photo.slot_number}` : ''} photo: ${photo.photo_url}`).join('\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-jamun-950/75 border border-white/10 rounded-3xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-mint-200 text-xs uppercase tracking-[0.16em]">Location {summary.location.id}</p>
          <h3 className="text-white font-semibold text-lg">{summary.location.name}</h3>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${summary.session ? 'bg-mint-400/10 text-mint-200' : 'bg-white/10 text-jamun-300'}`}>
          {summary.session ? `${summary.reports.length}/4 slots` : 'Not started'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Mini label="Bottles" value={bottles} />
        <Mini label="Customers" value={customers} />
        <Mini label="Jars" value={jars} />
      </div>

      <div className="mt-5 space-y-2">
        {SLOTS.map((slot) => {
          const report = summary.reports.find((item) => item.slot_number === slot.number);
          return (
            <div key={slot.number} className="flex items-center justify-between text-xs">
              <span className="text-jamun-200">{slot.label}</span>
              <span className={report ? 'text-mint-200' : 'text-jamun-400'}>
                {report ? `${report.bottles_sold} bottles · ${report.customers_approached} customers` : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>

      {summary.photos.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-jamun-300 text-xs">{summary.photos.length} evidence photos</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${selectMode ? 'border-mint-300/50 bg-mint-400/15 text-mint-200' : 'border-white/15 text-jamun-200 hover:text-white'}`}
              >
                <Check className="w-3.5 h-3.5" /> {selectMode ? 'Cancel' : 'Select'}
              </button>
              <button
                onClick={shareAll}
                className="inline-flex items-center gap-1.5 text-xs text-[#8af0ad] hover:text-white transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Share all
              </button>
            </div>
          </div>

          {selectMode && (
            <div className="flex flex-wrap items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-white/5">
              <button onClick={selectAll} className="text-xs text-mint-200 hover:text-white transition-colors">
                {selected.size === summary.photos.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-jamun-300 text-xs">{selected.size} selected</span>
              <button
                onClick={shareSelected}
                disabled={!selected.size}
                className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#25D366]/15 text-[#8af0ad] text-xs disabled:opacity-40 hover:bg-[#25D366]/25 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Share selected
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {summary.photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                <button
                  onClick={() => selectMode ? toggleSelect(photo.id) : setActivePhoto(photo)}
                  className="block w-full h-full"
                >
                  <img
                    src={photo.photo_url}
                    alt={`${photoLabels[photo.photo_type]} evidence`}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${selectMode && selected.has(photo.id) ? 'opacity-60' : ''}`}
                  />
                </button>
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(photo.id)}
                    className={`absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all ${selected.has(photo.id) ? 'bg-mint-400 text-jamun-950' : 'bg-black/50 text-white border border-white/30'}`}
                  >
                    {selected.has(photo.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] px-1.5 py-0.5 text-left pointer-events-none">
                  {photoLabels[photo.photo_type]}{photo.slot_number ? ` ${photo.slot_number}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.session && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-jamun-300 hover:text-mint-200 transition-colors py-2"
        >
          <Clock className="w-3.5 h-3.5" />
          {expanded ? 'Hide time-wise breakdown' : 'Show time-wise breakdown'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {expanded && summary.session && (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-3">
          {SLOTS.map((slot) => {
            const report = summary.reports.find((item) => item.slot_number === slot.number);
            const slotPhotos = summary.photos.filter((p) => p.slot_number === slot.number);
            return (
              <div key={slot.number} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs font-medium">{slot.label}</span>
                  <span className={`text-xs ${report ? 'text-mint-200' : 'text-jamun-400'}`}>
                    {report ? `${report.bottles_sold} bottles · ${report.customers_approached} customers · ${report.jars_given} jars` : 'No report'}
                  </span>
                </div>
                {slotPhotos.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {slotPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setActivePhoto(photo)}
                        className="relative aspect-square rounded-md overflow-hidden border border-white/10"
                      >
                        <img src={photo.photo_url} alt={`Slot ${slot.number} evidence`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setActivePhoto(null)} className="absolute -right-2 -top-10 text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={activePhoto.photo_url} alt="Evidence enlarged" className="max-h-[85vh] max-w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminHistoryView() {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data: locations, error: locError } = await supabase.from('locations').select('*').order('id');
    if (locError || !locations) {
      setMessage('Could not load locations.');
      setLoading(false);
      return;
    }
    const { data: sessions, error: sessError } = await supabase.from('sessions').select('*').order('session_date', { ascending: false });
    if (sessError) {
      setMessage('Could not load session history.');
      setLoading(false);
      return;
    }
    const sessionIds = (sessions ?? []).map((s) => s.id);
    const [reportsResult, photosResult] = await Promise.all([
      sessionIds.length
        ? supabase.from('slot_reports').select('*').in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase.from('activity_photos').select('*').in('session_id', sessionIds).order('created_at')
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (reportsResult.error || photosResult.error) {
      setMessage('Could not load historical evidence.');
      setLoading(false);
      return;
    }
    const byDate = new Map<string, HistoryDay>();
    for (const session of sessions ?? []) {
      const location = locations.find((l) => l.id === session.location_id);
      if (!location) continue;
      const date = session.session_date;
      if (!byDate.has(date)) byDate.set(date, { date, sessions: [] });
      byDate.get(date)!.sessions.push({
        session,
        location,
        reports: (reportsResult.data ?? []).filter((r) => r.session_id === session.id),
        photos: (photosResult.data ?? []).filter((p) => p.session_id === session.id),
      });
    }
    setDays(Array.from(byDate.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="py-20 text-center text-jamun-200">Loading daily history...</div>;
  if (message) return <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4 text-red-200 text-sm">{message}</div>;
  if (!days.length) return (
    <div className="rounded-3xl border border-white/10 bg-jamun-950/75 p-10 text-center">
      <Calendar className="w-10 h-10 text-jamun-500 mx-auto mb-3" />
      <p className="text-white font-medium">No history yet</p>
      <p className="text-jamun-300 text-sm mt-1">Completed activity days will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <p className="text-mint-200 text-xs uppercase tracking-[0.2em]">Archive</p>
        <h2 className="font-display text-3xl font-bold text-white">Daily report history</h2>
        <p className="text-jamun-200 text-sm mt-1">Open any date to see consolidated data, time-wise breakdown, and all photos store-wise.</p>
      </div>

      {days.map((day) => (
        <AdminHistoryDay
          key={day.date}
          day={day}
          open={expandedDate === day.date}
          onToggle={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
        />
      ))}
    </div>
  );
}

function AdminHistoryDay({ day, open, onToggle }: { day: HistoryDay; open: boolean; onToggle: () => void }) {
  const totalBottles = day.sessions.reduce((sum, s) => sum + s.reports.reduce((a, r) => a + r.bottles_sold, 0), 0);
  const totalCustomers = day.sessions.reduce((sum, s) => sum + s.reports.reduce((a, r) => a + r.customers_approached, 0), 0);
  const totalJars = day.sessions.reduce((sum, s) => sum + s.reports.reduce((a, r) => a + r.jars_given, 0), 0);
  const totalPhotos = day.sessions.reduce((sum, s) => sum + s.photos.length, 0);

  const formattedDate = new Date(`${day.date}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });

  const shareDay = () => {
    const lines = [`Minty Jamun daily report — ${formattedDate}`, `Bottles: ${totalBottles} | Customers: ${totalCustomers} | Jars: ${totalJars}`, ''];
    for (const entry of day.sessions) {
      const b = entry.reports.reduce((a, r) => a + r.bottles_sold, 0);
      const c = entry.reports.reduce((a, r) => a + r.customers_approached, 0);
      const j = entry.reports.reduce((a, r) => a + r.jars_given, 0);
      lines.push(`*${entry.location.name}*`);
      lines.push(`Bottles: ${b} | Customers: ${c} | Jars: ${j}`);
      if (entry.photos.length) {
        lines.push(`Photos: ${entry.photos.map((p) => p.photo_url).join(', ')}`);
      }
      lines.push('');
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-jamun-950/75 border border-white/10 rounded-3xl overflow-hidden">
      <button onClick={onToggle} className="w-full p-5 text-left flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint-400/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-mint-200" />
          </div>
          <div>
            <p className="text-white font-semibold">{formattedDate}</p>
            <p className="text-jamun-300 text-xs">{day.sessions.length} locations · {totalPhotos} photos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-4 text-xs">
            <span className="text-mint-200">{totalBottles} bottles</span>
            <span className="text-gold-300">{totalCustomers} customers</span>
            <span className="text-jamun-200">{totalJars} jars</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-jamun-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Bottles sold" value={totalBottles} />
            <StatBox label="Customers" value={totalCustomers} />
            <StatBox label="Jars given" value={totalJars} />
          </div>

          <button
            onClick={shareDay}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/15 text-[#8af0ad] text-sm hover:bg-[#25D366]/25 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Share full day report on WhatsApp
          </button>

          {day.sessions.map((entry) => (
            <AdminHistoryStoreEntry key={entry.session.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminHistoryStoreEntry({ entry }: { entry: { session: Session; location: Location; reports: SlotReport[]; photos: ActivityPhoto[] } }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [activePhoto, setActivePhoto] = useState<ActivityPhoto | null>(null);

  const bottles = entry.reports.reduce((a, r) => a + r.bottles_sold, 0);
  const customers = entry.reports.reduce((a, r) => a + r.customers_approached, 0);
  const jars = entry.reports.reduce((a, r) => a + r.jars_given, 0);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === entry.photos.length) setSelected(new Set());
    else setSelected(new Set(entry.photos.map((p) => p.id)));
  };

  const shareSelected = () => {
    const chosen = entry.photos.filter((p) => selected.has(p.id));
    if (!chosen.length) return;
    const text = `${entry.location.name} — selected photos\n${chosen.map((p) => `${photoLabels[p.photo_type]}${p.slot_number ? ` ${p.slot_number}` : ''} photo: ${p.photo_url}`).join('\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const shareAll = () => {
    if (!entry.photos.length) return;
    const text = `${entry.location.name} — all photos\n${entry.photos.map((p) => `${photoLabels[p.photo_type]}${p.slot_number ? ` ${p.slot_number}` : ''} photo: ${p.photo_url}`).join('\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const shareReport = () => {
    const lines = [`*${entry.location.name}* report`];
    lines.push(`Bottles: ${bottles} | Customers: ${customers} | Jars: ${jars}`);
    lines.push('');
    for (const slot of SLOTS) {
      const report = entry.reports.find((r) => r.slot_number === slot.number);
      lines.push(`${slot.label}: ${report ? `${report.bottles_sold} bottles, ${report.customers_approached} customers, ${report.jars_given} jars` : 'No report'}`);
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-white font-semibold text-sm">{entry.location.name}</h4>
        <div className="flex items-center gap-2">
          <button onClick={shareReport} className="text-xs text-[#8af0ad] hover:text-white transition-colors inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Report
          </button>
          {entry.photos.length > 0 && (
            <>
              <button
                onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
                className={`text-xs px-2 py-1 rounded-lg border transition-colors inline-flex items-center gap-1 ${selectMode ? 'border-mint-300/50 bg-mint-400/15 text-mint-200' : 'border-white/15 text-jamun-200 hover:text-white'}`}
              >
                <Check className="w-3 h-3" /> {selectMode ? 'Cancel' : 'Select'}
              </button>
              <button onClick={shareAll} className="text-xs text-[#8af0ad] hover:text-white transition-colors inline-flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> All photos
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Mini label="Bottles" value={bottles} />
        <Mini label="Customers" value={customers} />
        <Mini label="Jars" value={jars} />
      </div>

      <div className="space-y-1.5 mb-3">
        {SLOTS.map((slot) => {
          const report = entry.reports.find((r) => r.slot_number === slot.number);
          return (
            <div key={slot.number} className="flex items-center justify-between text-xs">
              <span className="text-jamun-200">{slot.label}</span>
              <span className={report ? 'text-mint-200' : 'text-jamun-400'}>
                {report ? `${report.bottles_sold} b · ${report.customers_approached} c · ${report.jars_given} j` : 'No report'}
              </span>
            </div>
          );
        })}
      </div>

      {entry.photos.length > 0 ? (
        <div>
          {selectMode && (
            <div className="flex flex-wrap items-center gap-3 mb-2 px-2.5 py-1.5 rounded-lg bg-white/5">
              <button onClick={selectAll} className="text-xs text-mint-200 hover:text-white transition-colors">
                {selected.size === entry.photos.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-jamun-300 text-xs">{selected.size} selected</span>
              <button
                onClick={shareSelected}
                disabled={!selected.size}
                className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#25D366]/15 text-[#8af0ad] text-xs disabled:opacity-40 hover:bg-[#25D366]/25 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Share selected
              </button>
            </div>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {entry.photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                <button
                  onClick={() => selectMode ? toggleSelect(photo.id) : setActivePhoto(photo)}
                  className="block w-full h-full"
                >
                  <img
                    src={photo.photo_url}
                    alt={`${photoLabels[photo.photo_type]} evidence`}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${selectMode && selected.has(photo.id) ? 'opacity-60' : ''}`}
                  />
                </button>
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(photo.id)}
                    className={`absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center transition-all ${selected.has(photo.id) ? 'bg-mint-400 text-jamun-950' : 'bg-black/50 text-white border border-white/30'}`}
                  >
                    {selected.has(photo.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] px-1.5 py-0.5 text-left pointer-events-none">
                  {photoLabels[photo.photo_type]}{photo.slot_number ? ` ${photo.slot_number}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-jamun-400 text-xs py-2">
          <Camera className="w-4 h-4" /> No photos for this store on this date.
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setActivePhoto(null)} className="absolute -right-2 -top-10 text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={activePhoto.photo_url} alt="Evidence enlarged" className="max-h-[85vh] max-w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <p className="text-jamun-300 text-xs">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-jamun-900/50 p-3">
      <p className="text-jamun-300 text-xs">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-jamun-950/75 border border-white/10 rounded-2xl p-4">
      <Icon className="w-5 h-5 text-mint-200 mb-3" />
      <p className="text-white text-2xl font-bold">{value}</p>
      <p className="text-jamun-200 text-xs mt-1">{label}</p>
    </div>
  );
}
