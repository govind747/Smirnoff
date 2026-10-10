import { useState, useEffect } from 'react';
import WelcomePage from '@/components/WelcomePage';
import LocationSelect from '@/components/LocationSelect';
import PinEntry from '@/components/PinEntry';
import Dashboard from '@/components/Dashboard';
import AdminPanel from '@/components/AdminPanel';
import { supabase, type Location } from '@/lib/supabase';

type Screen = 'welcome' | 'location' | 'pin' | 'dashboard' | 'admin';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (screen === 'location' && locations.length === 0) {
      setLocationsLoading(true);
      supabase
        .from('locations')
        .select('*')
        .order('id')
        .then(({ data, error }) => {
          if (error) {
            setLocationsLoading(false);
            return;
          }
          setLocations(data ?? []);
          setLocationsLoading(false);
        });
    }
  }, [screen, locations.length]);

  const handleStart = () => setScreen('location');
  const handleAdmin = () => setScreen('admin');

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setPinError(null);
    setScreen('pin');
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedLocation) return;
    setVerifying(true);
    setPinError(null);

    const { data, error } = await supabase
      .from('locations')
      .select('id, name, pin')
      .eq('id', selectedLocation.id)
      .eq('pin', pin)
      .maybeSingle();

    setVerifying(false);

    if (error || !data) {
      setPinError('Incorrect PIN. Please try again.');
      return;
    }

    setScreen('dashboard');
  };

  const handleLogout = () => {
    setSelectedLocation(null);
    setPinError(null);
    setScreen('welcome');
  };

  return (
    <div className="min-h-screen bg-jamun-975">
      {screen === 'welcome' && <WelcomePage onStart={handleStart} onAdmin={handleAdmin} />}
      {screen === 'location' && (
        <LocationSelect
          locations={locations}
          onSelect={handleSelectLocation}
          onBack={() => setScreen('welcome')}
          loading={locationsLoading}
        />
      )}
      {screen === 'pin' && selectedLocation && (
        <PinEntry
          locationName={selectedLocation.name}
          onSubmit={handlePinSubmit}
          onBack={() => setScreen('location')}
          error={pinError}
          verifying={verifying}
        />
      )}
      {screen === 'dashboard' && selectedLocation && (
        <Dashboard location={selectedLocation} onLogout={handleLogout} />
      )}
      {screen === 'admin' && <AdminPanel onBack={() => setScreen('welcome')} />}
    </div>
  );
}
