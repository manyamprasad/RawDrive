import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { INDIAN_STATES_CITIES } from '@/constants/locations';
import { Loader2, MapPin, User } from 'lucide-react';

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'photographer'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPhotographers: any[] = [];
      snapshot.forEach((doc) => {
        fetchedPhotographers.push({ id: doc.id, ...doc.data() });
      });
      setPhotographers(fetchedPhotographers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredPhotographers = photographers.filter(p => {
    return (selectedState ? p.state === selectedState : true) &&
           (selectedCity ? p.city === selectedCity : true);
  });

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex gap-4 mb-6">
        <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedCity(''); }} className="p-2 rounded-xl border">
          <option value="">All States</option>
          {Object.keys(INDIAN_STATES_CITIES).map(state => <option key={state} value={state}>{state}</option>)}
        </select>
        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedState} className="p-2 rounded-xl border">
          <option value="">All Cities</option>
          {selectedState && INDIAN_STATES_CITIES[selectedState]?.map(city => <option key={city} value={city}>{city}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotographers.map(p => (
          <GlassCard key={p.id} className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-10 h-10 text-zinc-400" />
              <div>
                <h3 className="font-bold">{p.displayName}</h3>
                <p className="text-sm text-zinc-500">{p.email}</p>
              </div>
            </div>
            <div className="text-sm text-zinc-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {p.city}, {p.state}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
