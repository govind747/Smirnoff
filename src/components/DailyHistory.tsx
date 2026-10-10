import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, MessageCircle, TrendingUp } from 'lucide-react';
import { supabase, SLOTS, type ActivityPhoto, type Location, type Session, type SlotReport } from '@/lib/supabase';

type Props = { location: Location };
type Day = { session: Session; reports: SlotReport[]; photos: ActivityPhoto[] };

export default function DailyHistory({ location }: Props) {
  const [days, setDays] = useState<Day[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sessions } = await supabase.from('sessions').select('*').eq('location_id', location.id).order('session_date', { ascending: false });
      const sessionList = sessions ?? [];
      const loaded = await Promise.all(sessionList.map(async (session) => {
        const [reportsResult, photosResult] = await Promise.all([
          supabase.from('slot_reports').select('*').eq('session_id', session.id).order('slot_number'),
          supabase.from('activity_photos').select('*').eq('session_id', session.id).order('created_at'),
        ]);
        return { session, reports: reportsResult.data ?? [], photos: photosResult.data ?? [] };
      }));
      setDays(loaded);
      setLoading(false);
    };
    void load();
  }, [location.id]);

  if (loading) return <div className="py-20 text-center text-jamun-200">Loading daily history...</div>;
  if (!days.length) return <div className="rounded-2xl border border-jamun-700/30 bg-jamun-800/40 p-10 text-center"><CalendarDays className="w-10 h-10 text-jamun-500 mx-auto mb-3" /><p className="text-white font-medium">No previous reports yet</p><p className="text-jamun-300 text-sm mt-1">Completed activity days will appear here.</p></div>;

  return <div className="space-y-4 animate-fade-in-up"><div><h2 className="font-display text-2xl font-bold text-white">Daily report history</h2><p className="text-jamun-200 text-sm mt-1">Open any date to see consolidated and time-wise numbers.</p></div>{days.map((day) => <DayCard key={day.session.id} day={day} open={expanded === day.session.id} onToggle={() => setExpanded(expanded === day.session.id ? null : day.session.id)} />)}</div>;
}

function DayCard({ day, open, onToggle }: { day: Day; open: boolean; onToggle: () => void }) {
  const bottles = day.reports.reduce((sum, report) => sum + report.bottles_sold, 0);
  const customers = day.reports.reduce((sum, report) => sum + report.customers_approached, 0);
  const jars = day.reports.reduce((sum, report) => sum + report.jars_given, 0);
  const share = () => {
    const text = `Smirnoff Minty Jamun daily report\nDate: ${day.session.session_date}\nBottles sold: ${bottles}\nCustomers approached: ${customers}\nJars given: ${jars}\nPhotos: ${day.photos.length}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };
  return <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl overflow-hidden"><button onClick={onToggle} className="w-full p-5 text-left flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-mint-400/10 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-mint-200" /></div><div><p className="text-white font-semibold">{new Date(`${day.session.session_date}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p><p className="text-jamun-300 text-xs">{day.reports.length}/4 slots · {day.photos.length} photos</p></div></div><div className="flex items-center gap-4"><div className="hidden sm:flex gap-4 text-xs"><span className="text-mint-200">{bottles} bottles</span><span className="text-gold-300">{customers} customers</span><span className="text-jamun-200">{jars} jars</span></div><ChevronDown className={`w-5 h-5 text-jamun-300 transition-transform ${open ? 'rotate-180' : ''}`} /></div></button>{open && <div className="border-t border-jamun-700/30 p-5 space-y-5"><div className="grid grid-cols-3 gap-3"><Stat label="Bottles sold" value={bottles} /><Stat label="Customers" value={customers} /><Stat label="Jars given" value={jars} /></div><div><div className="flex items-center justify-between mb-3"><p className="text-mint-200 text-xs uppercase tracking-wider">Time-wise data</p><button onClick={share} className="inline-flex items-center gap-2 text-xs text-[#8af0ad] hover:text-white"><MessageCircle className="w-4 h-4" /> Share report</button></div><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead><tr className="text-jamun-300 border-b border-jamun-700/30"><th className="text-left py-2">Slot</th><th className="text-center">Bottles</th><th className="text-center">Customers</th><th className="text-center">Jars</th></tr></thead><tbody>{SLOTS.map((slot) => { const report = day.reports.find((item) => item.slot_number === slot.number); return <tr key={slot.number} className="border-b border-jamun-700/20"><td className="py-3 text-white">{slot.label}</td><td className="text-center text-mint-200">{report?.bottles_sold ?? '—'}</td><td className="text-center text-gold-300">{report?.customers_approached ?? '—'}</td><td className="text-center text-jamun-100">{report?.jars_given ?? '—'}</td></tr>; })}</tbody></table></div></div><div><p className="text-mint-200 text-xs uppercase tracking-wider mb-3">Photo history</p>{day.photos.length ? <div className="grid grid-cols-4 gap-2">{day.photos.map((photo) => <img key={photo.id} src={photo.photo_url} alt={`${photo.photo_type} evidence`} className="aspect-square object-cover rounded-lg" />)}</div> : <p className="text-jamun-300 text-sm">No gallery photos for this date.</p>}</div><div className="flex items-center gap-2 text-jamun-300 text-xs"><TrendingUp className="w-4 h-4" /> Opening stock: {day.session.opening_jar_stock}</div></div>}</div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-jamun-900/50 p-3"><p className="text-jamun-300 text-xs">{label}</p><p className="text-white text-2xl font-bold mt-1">{value}</p></div>; }
