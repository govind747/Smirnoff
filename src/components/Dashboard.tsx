import { useState, useEffect, useCallback } from 'react';
import {
  Wine, LogOut, Camera, Package, TrendingUp, Users, Gift, Plus,
  Clock, CheckCircle2, AlertCircle, Upload, X, BarChart3, Calendar,
  RefreshCw, ShoppingCart,
} from 'lucide-react';
import {
  supabase, SLOTS, getISTDate,
  type ActivityPhoto, type Location, type Session, type SlotReport, type JarStockAddition,
} from '@/lib/supabase';
import PhotoGallery from '@/components/PhotoGallery';
import DailyHistory from '@/components/DailyHistory';

type Props = {
  location: Location;
  onLogout: () => void;
};

type Tab = 'dashboard' | 'slots' | 'stock' | 'report' | 'photos' | 'history';

export default function Dashboard({ location, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [slotReports, setSlotReports] = useState<SlotReport[]>([]);
  const [stockAdditions, setStockAdditions] = useState<JarStockAddition[]>([]);
  const [activityPhotos, setActivityPhotos] = useState<ActivityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const currentISTTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    const today = getISTDate();

    // Get or create today's session
    const { data: existing } = await supabase
      .from('sessions')
      .select('*')
      .eq('location_id', location.id)
      .eq('session_date', today)
      .maybeSingle();

    if (existing) {
      setSession(existing);
      const [slotsRes, additionsRes, photosRes] = await Promise.all([
        supabase.from('slot_reports').select('*').eq('session_id', existing.id).order('slot_number'),
        supabase.from('jar_stock_additions').select('*').eq('session_id', existing.id).order('created_at'),
        supabase.from('activity_photos').select('*').eq('session_id', existing.id).order('created_at'),
      ]);
      setSlotReports(slotsRes.data ?? []);
      setStockAdditions(additionsRes.data ?? []);
      setActivityPhotos(photosRes.data ?? []);
    } else {
      setSession(null);
      setSlotReports([]);
      setStockAdditions([]);
      setActivityPhotos([]);
    }
    setLoading(false);
  }, [location.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize session with opening stock and photo
  const initSession = async (photoUrl: string, openingStock: number) => {
    const today = getISTDate();
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        location_id: location.id,
        session_date: today,
        login_photo_url: photoUrl,
        opening_jar_stock: openingStock,
      })
      .select()
      .single();

    if (error) {
      showToast('Failed to start session. Try again.', 'error');
      return;
    }

    setSession(data);
    await supabase.from('activity_photos').insert({ session_id: data.id, photo_type: 'login', slot_number: null, photo_url: photoUrl });
    showToast('Session started successfully!');
    loadData();
  };

  const handlePhotoUpload = async (file: File, openingStock: number) => {
    setUploadingPhoto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `login_${location.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('activity-photos')
      .upload(fileName, file);

    if (uploadError) {
      // Try without storage bucket — use base64 data URL as fallback
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        await initSession(dataUrl, openingStock);
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('activity-photos')
      .getPublicUrl(fileName);

    await initSession(urlData.publicUrl, openingStock);
    setUploadingPhoto(false);
  };

  const saveSlot = async (slotNumber: number, bottles: number, customers: number, jars: number, photoUrl?: string | null) => {
    if (!session) return;
    const existing = slotReports.find((r) => r.slot_number === slotNumber);

    if (existing) {
      const { data, error } = await supabase
        .from('slot_reports')
        .update({
          bottles_sold: bottles,
          customers_approached: customers,
          jars_given: jars,
          ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) { showToast('Save failed', 'error'); return; }
      setSlotReports((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    } else {
      const { data, error } = await supabase
        .from('slot_reports')
        .insert({
          session_id: session.id,
          slot_number: slotNumber,
          bottles_sold: bottles,
          customers_approached: customers,
          jars_given: jars,
          photo_url: photoUrl ?? null,
        })
        .select()
        .single();
      if (error) { showToast('Save failed', 'error'); return; }
      setSlotReports((prev) => [...prev, data].sort((a, b) => a.slot_number - b.slot_number));
    }
    showToast(`Slot ${slotNumber} report saved!`);
  };

  const uploadSlotPhoto = async (slotNumber: number, file: File) => {
    if (!session) return;
    const fileName = `slot_${session.id}_${slotNumber}_${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`;
    const { error } = await supabase.storage.from('activity-photos').upload(fileName, file);
    if (!error) {
      const { data } = supabase.storage.from('activity-photos').getPublicUrl(fileName);
      await saveSlot(slotNumber, slotReports.find((r) => r.slot_number === slotNumber)?.bottles_sold ?? 0, slotReports.find((r) => r.slot_number === slotNumber)?.customers_approached ?? 0, slotReports.find((r) => r.slot_number === slotNumber)?.jars_given ?? 0, data.publicUrl);
      return data.publicUrl;
    }
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const url = reader.result as string;
        const report = slotReports.find((r) => r.slot_number === slotNumber);
        await saveSlot(slotNumber, report?.bottles_sold ?? 0, report?.customers_approached ?? 0, report?.jars_given ?? 0, url);
        resolve(url);
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadActivityPhoto = async (file: File, photoType: ActivityPhoto['photo_type'], slotNumber?: number) => {
    if (!session) return;
    const fileName = `gallery_${session.id}_${photoType}_${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`;
    const upload = await supabase.storage.from('activity-photos').upload(fileName, file);
    let photoUrl: string;
    if (!upload.error) {
      photoUrl = supabase.storage.from('activity-photos').getPublicUrl(fileName).data.publicUrl;
    } else {
      photoUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
    const { data, error } = await supabase.from('activity_photos').insert({ session_id: session.id, photo_type: photoType, slot_number: photoType === 'slot' ? slotNumber : null, photo_url: photoUrl }).select().maybeSingle();
    if (error || !data) return;
    setActivityPhotos((previous) => [...previous, data]);
  };

  const addStock = async (quantity: number, note: string) => {
    if (!session) return;
    const { data, error } = await supabase
      .from('jar_stock_additions')
      .insert({ session_id: session.id, quantity, note: note || null })
      .select()
      .single();
    if (error) { showToast('Failed to add stock', 'error'); return; }
    setStockAdditions((prev) => [...prev, data]);
    setShowStockModal(false);
    showToast(`${quantity} jars added to stock!`);
  };

  // Calculations
  const totalBottles = slotReports.reduce((s, r) => s + r.bottles_sold, 0);
  const totalCustomers = slotReports.reduce((s, r) => s + r.customers_approached, 0);
  const totalJarsGiven = slotReports.reduce((s, r) => s + r.jars_given, 0);
  const totalStockAdded = stockAdditions.reduce((s, a) => s + a.quantity, 0);
  const stockBalance = session
    ? session.opening_jar_stock + totalStockAdded - totalJarsGiven
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-jamun-300 mt-4 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-jamun-975/90 backdrop-blur-xl border-b border-jamun-700/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-jamun-700 to-jamun-950 rounded-xl flex items-center justify-center border border-mint-400/20">
              <Wine className="w-5 h-5 text-mint-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-mint-300 text-xs font-medium tracking-wider uppercase">Smirnoff Minty Jamun</p>
              <h1 className="text-white font-semibold text-sm leading-tight">{location.name}</h1>
              <p className="text-jamun-300 text-[11px]">IST · {currentISTTime}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-jamun-300 hover:text-red-400 transition-colors text-sm px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {([
            { id: 'dashboard', label: 'Overview', icon: BarChart3 },
            { id: 'slots', label: 'Time Slots', icon: Clock },
            { id: 'stock', label: 'Stock', icon: Package },
            { id: 'report', label: 'Final Report', icon: TrendingUp },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'history', label: 'History', icon: Calendar },
          ] as { id: Tab; label: string; icon: typeof BarChart3 }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                ${tab === t.id
                  ? 'border-mint-400 text-mint-300'
                  : 'border-transparent text-jamun-300 hover:text-white'}
              `}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Session not started */}
        {!session && <StartSession onUpload={handlePhotoUpload} uploading={uploadingPhoto} />}

        {/* Dashboard tab */}
        {session && tab === 'dashboard' && (
          <DashboardOverview
            session={session}
            slotReports={slotReports}
            activityPhotos={activityPhotos}
            onPhotoUpload={uploadActivityPhoto}
            totalBottles={totalBottles}
            totalCustomers={totalCustomers}
            totalJarsGiven={totalJarsGiven}
            stockBalance={stockBalance}
            totalStockAdded={totalStockAdded}
            onRefresh={loadData}
          />
        )}

        {/* Slots tab */}
        {session && tab === 'slots' && (
          <SlotReports
            slotReports={slotReports}
            onSave={saveSlot}
            onPhotoUpload={uploadSlotPhoto}
          />
        )}

        {/* Stock tab */}
        {session && tab === 'stock' && (
          <StockManagement
            session={session}
            stockAdditions={stockAdditions}
            stockBalance={stockBalance}
            totalStockAdded={totalStockAdded}
            totalJarsGiven={totalJarsGiven}
            onAddStock={() => setShowStockModal(true)}
          />
        )}

        {/* Report tab */}
        {session && tab === 'photos' && (
          <PhotoGallery photos={activityPhotos} onUpload={uploadActivityPhoto} title={`${location.name} photo history`} />
        )}

        {session && tab === 'history' && <DailyHistory location={location} />}

        {session && tab === 'report' && (
          <FinalReport
            locationName={location.name}
            session={session}
            slotReports={slotReports}
            stockAdditions={stockAdditions}
            totalBottles={totalBottles}
            totalCustomers={totalCustomers}
            totalJarsGiven={totalJarsGiven}
            stockBalance={stockBalance}
            totalStockAdded={totalStockAdded}
          />
        )}
      </main>

      {/* Stock modal */}
      {showStockModal && session && (
        <AddStockModal onClose={() => setShowStockModal(false)} onAdd={addStock} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg border
            ${toast.type === 'success'
              ? 'bg-mint-500/20 border-mint-400/30 text-mint-200'
              : 'bg-red-500/20 border-red-400/30 text-red-200'}
          `}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Start Session Component ---

function StartSession({ onUpload, uploading }: { onUpload: (file: File, stock: number) => void; uploading: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stock, setStock] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in-up">
      <div className="text-center mb-6">
        <div className="inline-flex w-16 h-16 bg-mint-500/10 rounded-2xl items-center justify-center mb-4 border border-mint-400/20">
          <Camera className="w-8 h-8 text-mint-300" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">Start Today's Session</h2>
        <p className="text-jamun-200 text-sm">Take a login photo and enter your opening jar stock to begin reporting</p>
      </div>

      <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-6 space-y-6">
        {/* Photo upload */}
        <div>
          <label className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-3 block">Login Photo</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`relative rounded-xl border-2 border-dashed transition-all p-6 text-center cursor-pointer
              ${dragOver ? 'border-mint-400 bg-mint-500/5' : 'border-jamun-600/40 hover:border-mint-400/40'}
            `}
            onClick={() => document.getElementById('photo-input')?.click()}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Login preview" className="max-h-48 mx-auto rounded-lg" />
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <Upload className="w-8 h-8 text-jamun-400" />
                <p className="text-jamun-200 text-sm">Click or drag to upload login photo</p>
                <p className="text-jamun-400 text-xs">JPG, PNG up to 5MB</p>
              </div>
            )}
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </div>

        {/* Opening stock */}
        <div>
          <label className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-2 block">Opening Jar Stock</label>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="e.g. 50"
            className="w-full bg-jamun-900/60 border border-jamun-600/40 rounded-xl px-4 py-3 text-white placeholder-jamun-400 focus:border-mint-400 focus:outline-none transition-colors"
          />
          <p className="text-jamun-400 text-xs mt-2">Number of jars (dispensers) you have in hand right now</p>
        </div>

        <button
          onClick={() => file && stock && onUpload(file, parseInt(stock))}
          disabled={!file || !stock || uploading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-400 hover:to-mint-500 disabled:from-jamun-700 disabled:to-jamun-800 disabled:text-jamun-400 disabled:cursor-not-allowed text-jamun-950 font-semibold py-4 rounded-xl transition-all shadow-lg shadow-mint-500/20"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-jamun-950 border-t-transparent rounded-full animate-spin" />
              Starting Session...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Start Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// --- Dashboard Overview ---

function DashboardOverview({
  session, slotReports, activityPhotos, onPhotoUpload, totalBottles, totalCustomers,
  totalJarsGiven, stockBalance, totalStockAdded, onRefresh,
}: {
  session: Session; slotReports: SlotReport[]; activityPhotos: ActivityPhoto[];
  onPhotoUpload: (file: File, type: ActivityPhoto['photo_type'], slotNumber?: number) => Promise<void>;
  totalBottles: number; totalCustomers: number; totalJarsGiven: number;
  stockBalance: number; totalStockAdded: number; onRefresh: () => void;
}) {
  const slotsCompleted = slotReports.length;
  const conversionRate = totalCustomers > 0 ? Math.round((totalBottles / totalCustomers) * 100) : 0;

  const stats = [
    { label: 'Bottles Sold', value: totalBottles, icon: ShoppingCart, color: 'mint' },
    { label: 'Customers Approached', value: totalCustomers, icon: Users, color: 'gold' },
    { label: 'Jars Given', value: totalJarsGiven, icon: Gift, color: 'jamun' },
    { label: 'Stock Balance', value: stockBalance, icon: Package, color: stockBalance < 5 ? 'red' : 'mint' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Session info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mint-500/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-mint-300" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {new Date(`${session.session_date}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
            </p>
            <p className="text-jamun-300 text-xs">Session active &middot; 2 PM - 10 PM</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-mint-300 text-xs">Slots Reported</p>
            <p className="text-white font-semibold">{slotsCompleted}/4</p>
          </div>
          <button onClick={onRefresh} className="p-2 text-jamun-300 hover:text-mint-300 transition-colors rounded-lg hover:bg-jamun-700/30">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5 animate-scale-in"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3
              ${stat.color === 'mint' ? 'bg-mint-500/10' : stat.color === 'gold' ? 'bg-gold-500/10' : stat.color === 'red' ? 'bg-red-500/10' : 'bg-jamun-600/20'}
            `}>
              <stat.icon className={`w-5 h-5
                ${stat.color === 'mint' ? 'text-mint-300' : stat.color === 'gold' ? 'text-gold-400' : stat.color === 'red' ? 'text-red-400' : 'text-jamun-200'}
              `} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-jamun-300 text-xs leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Login photo + conversion */}
      <div className="grid lg:grid-cols-3 gap-4">
        {session.login_photo_url && (
          <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-4">
            <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-3">Login Photo</p>
            <img src={session.login_photo_url} alt="Login" className="w-full rounded-lg max-h-48 object-cover" />
          </div>
        )}
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-4 lg:col-span-2">
          <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-4">Quick Stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{totalStockAdded}</p>
              <p className="text-jamun-300 text-xs">Stock Added Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{session.opening_jar_stock}</p>
              <p className="text-jamun-300 text-xs">Opening Stock</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-mint-300">{conversionRate}%</p>
              <p className="text-jamun-300 text-xs">Conversion Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{slotsCompleted}</p>
              <p className="text-jamun-300 text-xs">Reports Filed</p>
            </div>
          </div>
          {stockBalance < 5 && stockBalance >= 0 && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300 text-sm">Low stock warning! Only {stockBalance} jars remaining.</p>
            </div>
          )}
        </div>
      </div>

      <PhotoGallery photos={activityPhotos} onUpload={onPhotoUpload} title="Today's login, logout and slot photos" />

      {/* Slot progress */}
      <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
        <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-4">Reporting Progress</p>
        <div className="space-y-3">
          {SLOTS.map((slot) => {
            const report = slotReports.find((r) => r.slot_number === slot.number);
            return (
              <div key={slot.number} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${report ? 'bg-mint-500/20' : 'bg-jamun-700/30'}
                `}>
                  {report
                    ? <CheckCircle2 className="w-5 h-5 text-mint-400" />
                    : <Clock className="w-4 h-4 text-jamun-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{slot.label}</p>
                  {report && (
                    <p className="text-jamun-300 text-xs">
                      {report.bottles_sold} bottles &middot; {report.customers_approached} customers &middot; {report.jars_given} jars
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full
                  ${report ? 'bg-mint-500/10 text-mint-300' : 'bg-jamun-700/30 text-jamun-400'}
                `}>
                  {report ? 'Done' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Slot Reports ---

function SlotReports({ slotReports, onSave, onPhotoUpload }: {
  slotReports: SlotReport[];
  onSave: (slotNumber: number, bottles: number, customers: number, jars: number, photoUrl?: string | null) => void;
  onPhotoUpload: (slotNumber: number, file: File) => Promise<string | undefined>;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-white mb-1">Time Slot Reports</h2>
        <p className="text-jamun-200 text-sm">Update your numbers every 2 hours</p>
      </div>
      {SLOTS.map((slot, idx) => {
        const report = slotReports.find((r) => r.slot_number === slot.number);
        return (
          <SlotCard
            key={slot.number}
            slot={slot}
            report={report}
            onSave={onSave}
            onPhotoUpload={onPhotoUpload}
            delay={idx * 80}
          />
        );
      })}
    </div>
  );
}

function SlotCard({ slot, report, onSave, onPhotoUpload, delay }: {
  slot: { number: number; label: string; time: string };
  report?: SlotReport;
  onSave: (slotNumber: number, bottles: number, customers: number, jars: number, photoUrl?: string | null) => void;
  onPhotoUpload: (slotNumber: number, file: File) => Promise<string | undefined>;
  delay: number;
}) {
  const [bottles, setBottles] = useState(report?.bottles_sold?.toString() ?? '');
  const [customers, setCustomers] = useState(report?.customers_approached?.toString() ?? '');
  const [jars, setJars] = useState(report?.jars_given?.toString() ?? '');
  const [photoUrl, setPhotoUrl] = useState(report?.photo_url ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (report) {
      setBottles(report.bottles_sold.toString());
      setCustomers(report.customers_approached.toString());
      setJars(report.jars_given.toString());
      setPhotoUrl(report.photo_url);
    }
  }, [report]);

  const handleSave = () => {
    onSave(slot.number, parseInt(bottles) || 0, parseInt(customers) || 0, parseInt(jars) || 0, photoUrl);
  };

  const adjust = (field: 'bottles' | 'customers' | 'jars', amount: number) => {
    const nextBottles = Math.max(0, (parseInt(bottles) || 0) + (field === 'bottles' ? amount : 0));
    const nextCustomers = Math.max(0, (parseInt(customers) || 0) + (field === 'customers' ? amount : 0));
    const nextJars = Math.max(0, (parseInt(jars) || 0) + (field === 'jars' ? amount : 0));
    setBottles(String(nextBottles)); setCustomers(String(nextCustomers)); setJars(String(nextJars));
    onSave(slot.number, nextBottles, nextCustomers, nextJars, photoUrl);
  };

  const handlePhoto = async (file: File) => {
    setPhotoUploading(true);
    const url = await onPhotoUpload(slot.number, file);
    if (url) setPhotoUrl(url);
    setPhotoUploading(false);
  };

  return (
    <div
      className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5 animate-scale-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center
            ${report ? 'bg-mint-500/15' : 'bg-jamun-700/40'}
          `}>
            <Clock className={`w-5 h-5 ${report ? 'text-mint-300' : 'text-jamun-300'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{slot.label}</h3>
            <p className="text-jamun-300 text-xs">Slot {slot.number}</p>
          </div>
        </div>
        {report && (
          <span className="flex items-center gap-1 text-mint-300 text-xs bg-mint-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reported
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-jamun-300 text-xs mb-1.5 block flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> Bottles Sold
          </label>
          <input
            type="number"
            min="0"
            value={bottles}
            onChange={(e) => setBottles(e.target.value)}
            placeholder="0"
            className="w-full bg-jamun-900/60 border border-jamun-600/40 rounded-lg px-3 py-2.5 text-white text-center text-lg font-semibold placeholder-jamun-500 focus:border-mint-400 focus:outline-none transition-colors"
          />
          <button onClick={() => adjust('bottles', 1)} className="w-full mt-2 py-1.5 rounded-lg bg-mint-400/10 text-mint-200 text-xs hover:bg-mint-400/20">+1 live sale</button>
        </div>
        <div>
          <label className="text-jamun-300 text-xs mb-1.5 block flex items-center gap-1">
            <Users className="w-3 h-3" /> Customers
          </label>
          <input
            type="number"
            min="0"
            value={customers}
            onChange={(e) => setCustomers(e.target.value)}
            placeholder="0"
            className="w-full bg-jamun-900/60 border border-jamun-600/40 rounded-lg px-3 py-2.5 text-white text-center text-lg font-semibold placeholder-jamun-500 focus:border-mint-400 focus:outline-none transition-colors"
          />
          <button onClick={() => adjust('customers', 1)} className="w-full mt-2 py-1.5 rounded-lg bg-gold-500/10 text-gold-400 text-xs hover:bg-gold-500/20">+1 approached</button>
        </div>
        <div>
          <label className="text-jamun-300 text-xs mb-1.5 block flex items-center gap-1">
            <Gift className="w-3 h-3" /> Jars Given
          </label>
          <input
            type="number"
            min="0"
            value={jars}
            onChange={(e) => setJars(e.target.value)}
            placeholder="0"
            className="w-full bg-jamun-900/60 border border-jamun-600/40 rounded-lg px-3 py-2.5 text-white text-center text-lg font-semibold placeholder-jamun-500 focus:border-mint-400 focus:outline-none transition-colors"
          />
          <button onClick={() => adjust('jars', 1)} className="w-full mt-2 py-1.5 rounded-lg bg-jamun-600/30 text-jamun-100 text-xs hover:bg-jamun-600/50">+1 jar given</button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-mint-300/20 bg-mint-400/10 text-mint-200 text-sm cursor-pointer hover:bg-mint-400/20">
          <Camera className="w-4 h-4" />
          {photoUploading ? 'Uploading...' : photoUrl ? 'Update slot photo' : 'Add slot photo'}
          <input type="file" accept="image/*" className="hidden" disabled={photoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handlePhoto(file); }} />
        </label>
        {photoUrl && <img src={photoUrl} alt="Slot evidence" className="w-12 h-12 object-cover rounded-lg border border-mint-300/30" />}
      </div>

      <button
        onClick={handleSave}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-mint-500/10 hover:bg-mint-500/20 border border-mint-400/20 hover:border-mint-400/40 text-mint-300 font-medium py-2.5 rounded-lg transition-all text-sm"
      >
        <CheckCircle2 className="w-4 h-4" />
        {report ? 'Update Report' : 'Save Report'}
      </button>
    </div>
  );
}

// --- Stock Management ---

function StockManagement({
  session, stockAdditions, stockBalance, totalStockAdded, totalJarsGiven, onAddStock,
}: {
  session: Session; stockAdditions: JarStockAddition[];
  stockBalance: number; totalStockAdded: number; totalJarsGiven: number;
  onAddStock: () => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white mb-1">Jar Stock Management</h2>
          <p className="text-jamun-200 text-sm">Track your dispenser jar inventory</p>
        </div>
        <button
          onClick={onAddStock}
          className="flex items-center gap-2 bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-400 hover:to-mint-500 text-jamun-950 font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-mint-500/20"
        >
          <Plus className="w-4 h-4" />
          Add New Stock
        </button>
      </div>

      {/* Stock summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
          <p className="text-jamun-300 text-xs mb-1">Opening Stock</p>
          <p className="text-3xl font-bold text-white">{session.opening_jar_stock}</p>
        </div>
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
          <p className="text-jamun-300 text-xs mb-1">Stock Added</p>
          <p className="text-3xl font-bold text-mint-300">+{totalStockAdded}</p>
        </div>
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
          <p className="text-jamun-300 text-xs mb-1">Jars Given Out</p>
          <p className="text-3xl font-bold text-gold-400">-{totalJarsGiven}</p>
        </div>
        <div className={`rounded-2xl p-5 border
          ${stockBalance < 5
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-mint-500/10 border-mint-400/20'}
        `}>
          <p className="text-jamun-300 text-xs mb-1">Balance In Hand</p>
          <p className={`text-3xl font-bold ${stockBalance < 5 ? 'text-red-400' : 'text-mint-300'}`}>{stockBalance}</p>
        </div>
      </div>

      {/* Stock additions log */}
      <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
        <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-4">Stock Addition History</p>
        {stockAdditions.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-jamun-600 mx-auto mb-2" />
            <p className="text-jamun-300 text-sm">No stock additions yet</p>
            <p className="text-jamun-400 text-xs mt-1">New jars received will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stockAdditions.map((add) => (
              <div key={add.id} className="flex items-center justify-between bg-jamun-900/40 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-mint-500/10 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-mint-300" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">+{add.quantity} jars</p>
                    {add.note && <p className="text-jamun-300 text-xs">{add.note}</p>}
                  </div>
                </div>
                <span className="text-jamun-400 text-xs">
                  {new Date(add.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Add Stock Modal ---

function AddStockModal({ onClose, onAdd }: { onClose: () => void; onAdd: (qty: number, note: string) => void }) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-jamun-900 border border-jamun-700/40 rounded-2xl p-6 w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-bold text-white">Add Jar Stock</h3>
          <button onClick={onClose} className="text-jamun-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-2 block">Quantity Received</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 20"
              className="w-full bg-jamun-800/60 border border-jamun-600/40 rounded-xl px-4 py-3 text-white text-lg font-semibold placeholder-jamun-500 focus:border-mint-400 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-2 block">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Restock from supervisor"
              className="w-full bg-jamun-800/60 border border-jamun-600/40 rounded-xl px-4 py-3 text-white placeholder-jamun-500 focus:border-mint-400 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={() => quantity && onAdd(parseInt(quantity), note)}
            disabled={!quantity}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-400 hover:to-mint-500 disabled:from-jamun-700 disabled:to-jamun-800 disabled:text-jamun-400 disabled:cursor-not-allowed text-jamun-950 font-semibold py-3.5 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Add to Stock
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Final Report ---

function FinalReport({
  locationName, session, slotReports, stockAdditions,
  totalBottles, totalCustomers, totalJarsGiven, stockBalance, totalStockAdded,
}: {
  locationName: string; session: Session; slotReports: SlotReport[]; stockAdditions: JarStockAddition[];
  totalBottles: number; totalCustomers: number; totalJarsGiven: number;
  stockBalance: number; totalStockAdded: number;
}) {
  const conversionRate = totalCustomers > 0 ? Math.round((totalBottles / totalCustomers) * 100) : 0;
  const jarsPerBottle = totalBottles > 0 ? (totalJarsGiven / totalBottles).toFixed(2) : '0';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Report header */}
      <div className="bg-gradient-to-br from-jamun-800/60 to-jamun-900/60 border border-mint-400/20 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center mb-3">
          <div className="w-12 h-12 bg-mint-500/10 rounded-xl flex items-center justify-center border border-mint-400/20">
            <Wine className="w-6 h-6 text-mint-300" strokeWidth={1.5} />
          </div>
        </div>
        <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-1">Consolidated Daily Report</p>
        <h2 className="font-display text-2xl font-bold text-white mb-1">Smirnoff Minty Jamun</h2>
        <p className="text-jamun-200 text-sm">{locationName}</p>
        <p className="text-jamun-300 text-xs mt-2">
          {new Date(session.session_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-mint-500/10 border border-mint-400/20 rounded-2xl p-6 text-center">
          <ShoppingCart className="w-8 h-8 text-mint-300 mx-auto mb-2" />
          <p className="text-4xl font-bold text-white">{totalBottles}</p>
          <p className="text-mint-200 text-sm mt-1">Total Bottles Sold</p>
        </div>
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-6 text-center">
          <Users className="w-8 h-8 text-gold-400 mx-auto mb-2" />
          <p className="text-4xl font-bold text-white">{totalCustomers}</p>
          <p className="text-gold-300 text-sm mt-1">Total Customers Approached</p>
        </div>
        <div className="bg-jamun-600/20 border border-jamun-500/30 rounded-2xl p-6 text-center">
          <Gift className="w-8 h-8 text-jamun-200 mx-auto mb-2" />
          <p className="text-4xl font-bold text-white">{totalJarsGiven}</p>
          <p className="text-jamun-200 text-sm mt-1">Total Jars Given</p>
        </div>
      </div>

      {/* Slot breakdown table */}
      <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-jamun-700/30">
          <p className="text-mint-300 text-xs font-medium tracking-wider uppercase">Time Slot Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-jamun-700/30">
                <th className="text-left px-5 py-3 text-jamun-300 font-medium">Time Slot</th>
                <th className="text-center px-5 py-3 text-jamun-300 font-medium">Bottles</th>
                <th className="text-center px-5 py-3 text-jamun-300 font-medium">Customers</th>
                <th className="text-center px-5 py-3 text-jamun-300 font-medium">Jars Given</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => {
                const r = slotReports.find((rep) => rep.slot_number === slot.number);
                return (
                  <tr key={slot.number} className="border-b border-jamun-700/20 last:border-0">
                    <td className="px-5 py-3.5 text-white font-medium">{slot.label}</td>
                    <td className="px-5 py-3.5 text-center text-white">{r?.bottles_sold ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-white">{r?.customers_approached ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-white">{r?.jars_given ?? '—'}</td>
                  </tr>
                );
              })}
              <tr className="bg-jamun-700/20">
                <td className="px-5 py-4 text-mint-300 font-bold">TOTAL</td>
                <td className="px-5 py-4 text-center text-mint-300 font-bold text-lg">{totalBottles}</td>
                <td className="px-5 py-4 text-center text-mint-300 font-bold text-lg">{totalCustomers}</td>
                <td className="px-5 py-4 text-center text-mint-300 font-bold text-lg">{totalJarsGiven}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock summary */}
      <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
        <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-4">Stock Summary</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-jamun-700/20">
            <span className="text-jamun-200 text-sm">Opening Jar Stock</span>
            <span className="text-white font-semibold">{session.opening_jar_stock}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-jamun-700/20">
            <span className="text-jamun-200 text-sm">Total Stock Added</span>
            <span className="text-mint-300 font-semibold">+{totalStockAdded}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-jamun-700/20">
            <span className="text-jamun-200 text-sm">Total Jars Given Out</span>
            <span className="text-gold-400 font-semibold">-{totalJarsGiven}</span>
          </div>
          <div className="flex items-center justify-between py-3 bg-mint-500/10 rounded-xl px-4">
            <span className="text-mint-200 text-sm font-medium">Stock Balance In Hand</span>
            <span className={`text-2xl font-bold ${stockBalance < 5 ? 'text-red-400' : 'text-mint-300'}`}>{stockBalance}</span>
          </div>
        </div>
      </div>

      {/* Extra insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5 text-center">
          <p className="text-jamun-300 text-xs mb-1">Conversion Rate</p>
          <p className="text-3xl font-bold text-mint-300">{conversionRate}%</p>
          <p className="text-jamun-400 text-xs mt-1">Bottles per customer approached</p>
        </div>
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5 text-center">
          <p className="text-jamun-300 text-xs mb-1">Jars Per Bottle</p>
          <p className="text-3xl font-bold text-gold-400">{jarsPerBottle}</p>
          <p className="text-jamun-400 text-xs mt-1">Average jars given per bottle sold</p>
        </div>
      </div>

      {/* Stock additions log in report */}
      {stockAdditions.length > 0 && (
        <div className="bg-jamun-800/40 border border-jamun-700/30 rounded-2xl p-5">
          <p className="text-mint-300 text-xs font-medium tracking-wider uppercase mb-4">Stock Additions Log</p>
          <div className="space-y-2">
            {stockAdditions.map((add) => (
              <div key={add.id} className="flex items-center justify-between text-sm py-2 border-b border-jamun-700/20 last:border-0">
                <div>
                  <span className="text-white font-medium">+{add.quantity} jars</span>
                  {add.note && <span className="text-jamun-300 ml-2">— {add.note}</span>}
                </div>
                <span className="text-jamun-400 text-xs">
                  {new Date(add.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
