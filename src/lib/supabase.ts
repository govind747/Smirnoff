import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Location = {
  id: number;
  name: string;
  pin: string;
  created_at: string;
};

export type Session = {
  id: string;
  location_id: number;
  session_date: string;
  login_photo_url: string | null;
  opening_jar_stock: number;
  created_at: string;
};

export type SlotReport = {
  id: string;
  session_id: string;
  slot_number: number;
  bottles_sold: number;
  customers_approached: number;
  jars_given: number;
  updated_at: string;
  photo_url: string | null;
};

export type ActivityPhoto = {
  id: string;
  session_id: string;
  slot_number: number | null;
  photo_type: 'login' | 'logout' | 'slot';
  photo_url: string;
  created_at: string;
};

export type JarStockAddition = {
  id: string;
  session_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
};

export const IST_TIME_ZONE = 'Asia/Kolkata';

export const SLOTS = [
  { number: 1, label: '2 PM - 4 PM', time: '2:00 PM' },
  { number: 2, label: '4 PM - 6 PM', time: '4:00 PM' },
  { number: 3, label: '6 PM - 8 PM', time: '6:00 PM' },
  { number: 4, label: '8 PM - 10 PM', time: '8:00 PM' },
];

export const getISTDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIME_ZONE }).format(new Date());

export const LOCATION_NAMES: Record<number, string> = {
  1: 'TLDW ISCO Chowk',
  2: 'TLDW DLF Phase 3',
  3: 'PRIBE Preview',
  4: 'Nasgela Chowk',
};
