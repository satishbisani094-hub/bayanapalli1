import { supabase } from '../lib/supabase';
import {
  DEFAULT_COMMITTEE,
  DEFAULT_FESTIVALS,
  DEFAULT_ALBUMS,
  DEFAULT_PHOTOS,
  DEFAULT_MILESTONES
} from './defaultData';

const DB_KEY = 'bayanapalli_community_db';

export const getInitialDatabase = () => ({
  committee: DEFAULT_COMMITTEE,
  festivals: DEFAULT_FESTIVALS,
  albums: DEFAULT_ALBUMS,
  photos: DEFAULT_PHOTOS,
  milestones: DEFAULT_MILESTONES,
  messages: []
});

export const getDatabase = () => {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : getInitialDatabase();
  } catch (e) {
    console.error('Error reading localStorage:', e);
    return getInitialDatabase();
  }
};

const dbChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bayanapalli_db_channel') : null;

export const notifyDbChanged = () => {
  try {
    if (dbChannel) {
      dbChannel.postMessage({ type: 'DB_UPDATED', timestamp: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('bayanapalli_db_updated'));
  } catch (e) {
    console.warn('Failed to broadcast db change event:', e);
  }
};

export const subscribeDbChanged = (callback) => {
  const handleMessage = (e) => {
    if (e.data && e.data.type === 'DB_UPDATED') {
      callback();
    }
  };
  const handleCustomEvent = () => callback();

  if (dbChannel) {
    dbChannel.addEventListener('message', handleMessage);
  }
  window.addEventListener('bayanapalli_db_updated', handleCustomEvent);

  return () => {
    if (dbChannel) {
      dbChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('bayanapalli_db_updated', handleCustomEvent);
  };
};

// --- Normalization Helpers ---
const normalizeMember = (m) => ({
  id: m.id || `member_${Date.now()}`,
  name: m.name || '',
  role: m.role || '',
  description: m.description || '',
  status: m.status || 'active',
  startYear: m.startYear ? parseInt(m.startYear) : new Date().getFullYear(),
  endYear: m.endYear ? parseInt(m.endYear) : null,
  phone: m.phone || '',
  photo: m.photo || m.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
  image: m.photo || m.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'
});

const normalizeFestival = (f) => ({
  id: f.id || `fest_${Date.now()}`,
  name: f.name || f.title || '',
  title: f.title || f.name || '',
  year: f.year ? String(f.year) : '2026',
  date: f.date || '',
  location: f.location || '',
  description: f.description || '',
  type: f.type || 'cultural',
  coverImage: f.coverImage || f.image || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&fit=crop',
  image: f.coverImage || f.image || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&fit=crop'
});

const normalizeAlbum = (a) => ({
  id: a.id || `album_${Date.now()}`,
  name: a.name || a.title || '',
  title: a.title || a.name || '',
  date: a.date || '',
  year: a.year ? String(a.year) : '2026',
  festivalId: a.festivalId || '',
  description: a.description || '',
  coverImage: a.coverImage || a.cover_image || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600',
  cover_image: a.coverImage || a.cover_image || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600'
});

const normalizePhoto = (p) => ({
  id: p.id || `photo_${Date.now()}`,
  albumId: p.albumId || p.album_id || '',
  album_id: p.albumId || p.album_id || '',
  url: p.url || '',
  caption: p.caption || '',
  likes: p.likes || 0
});

const normalizeMilestone = (m) => ({
  id: m.id || `ms_${Date.now()}`,
  year: String(m.year || '2026'),
  title: m.title || '',
  description: m.description || ''
});

const normalizeMessage = (msg) => ({
  id: msg.id || `msg_${Date.now()}`,
  name: msg.name || '',
  email: msg.email || '',
  phone: msg.phone || '',
  message: msg.message || '',
  read: Boolean(msg.read)
});

// --- Supabase Smart Insert/Update Helper ---
async function safeInsert(table, payload, fallbackPayload) {
  let { data, error } = await supabase.from(table).insert([payload]).select();
  if (error && error.code === 'PGRST204' && fallbackPayload) {
    console.warn(`Retrying insert into ${table} with fallback schema payload`);
    const retry = await supabase.from(table).insert([fallbackPayload]).select();
    data = retry.data;
    error = retry.error;
  }
  if (error) console.error(`Insert error for ${table}:`, error);
  return data;
}

async function safeUpdate(table, id, updatedFields, fallbackFields) {
  let { error } = await supabase.from(table).update(updatedFields).eq('id', id);
  if (error && error.code === 'PGRST204' && fallbackFields) {
    console.warn(`Retrying update for ${table} with fallback schema fields`);
    const retry = await supabase.from(table).update(fallbackFields).eq('id', id);
    error = retry.error;
  }
  if (error) console.error(`Update error for ${table}:`, error);
}

// --- Query API ---
export const fetchDatabaseApi = async () => {
  try {
    const [resC, resF, resA, resP, resM, resMsg] = await Promise.all([
      supabase.from('committee').select('*').order('created_at', { ascending: true }),
      supabase.from('festivals').select('*').order('created_at', { ascending: true }),
      supabase.from('albums').select('*').order('created_at', { ascending: true }),
      supabase.from('photos').select('*').order('created_at', { ascending: true }),
      supabase.from('milestones').select('*').order('created_at', { ascending: true }),
      supabase.from('messages').select('*').order('created_at', { ascending: true })
    ]);

    const data = {
      committee: (resC.data || []).map(normalizeMember),
      festivals: (resF.data || []).map(normalizeFestival),
      albums: (resA.data || []).map(normalizeAlbum),
      photos: (resP.data || []).map(normalizePhoto),
      milestones: (resM.data || []).map(normalizeMilestone),
      messages: (resMsg.data || []).map(normalizeMessage)
    };

    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage cache failed:', e);
    }

    return data;
  } catch (err) {
    console.error('Error fetching database from Supabase:', err);
    return getDatabase();
  }
};

export const getFreshDatabase = async () => {
  return await fetchDatabaseApi();
};

// Committee Members
export const getMembers = () => getDatabase().committee;

export const addMember = async (member) => {
  const full = normalizeMember(member);
  const coreFallback = {
    name: full.name,
    role: full.role,
    phone: full.phone,
    image: full.photo
  };

  const data = await safeInsert('committee', full, coreFallback);
  notifyDbChanged();
  return (data && data[0]) ? normalizeMember(data[0]) : full;
};

export const updateMember = async (id, updatedFields) => {
  const coreFallback = {};
  if (updatedFields.name) coreFallback.name = updatedFields.name;
  if (updatedFields.role) coreFallback.role = updatedFields.role;
  if (updatedFields.phone) coreFallback.phone = updatedFields.phone;
  if (updatedFields.photo || updatedFields.image) coreFallback.image = updatedFields.photo || updatedFields.image;

  await safeUpdate('committee', id, updatedFields, coreFallback);
  notifyDbChanged();
};

export const deleteMember = async (id) => {
  const { error } = await supabase.from('committee').delete().eq('id', id);
  if (error) console.error('deleteMember error:', error);
  notifyDbChanged();
};

// Festivals
export const addFestival = async (festival) => {
  const full = normalizeFestival(festival);
  const coreFallback = {
    title: full.title || full.name,
    date: full.date,
    description: full.description,
    image: full.coverImage
  };

  const data = await safeInsert('festivals', full, coreFallback);
  notifyDbChanged();
  return (data && data[0]) ? normalizeFestival(data[0]) : full;
};

export const updateFestival = async (id, updatedFields) => {
  const coreFallback = {};
  if (updatedFields.title || updatedFields.name) coreFallback.title = updatedFields.title || updatedFields.name;
  if (updatedFields.date) coreFallback.date = updatedFields.date;
  if (updatedFields.description) coreFallback.description = updatedFields.description;
  if (updatedFields.coverImage || updatedFields.image) coreFallback.image = updatedFields.coverImage || updatedFields.image;

  await safeUpdate('festivals', id, updatedFields, coreFallback);
  notifyDbChanged();
};

export const deleteFestival = async (id) => {
  const { error } = await supabase.from('festivals').delete().eq('id', id);
  if (error) console.error('deleteFestival error:', error);
  notifyDbChanged();
};

// Photo Albums
export const addAlbum = async (album) => {
  const full = normalizeAlbum(album);
  const coreFallback = {
    title: full.title || full.name,
    date: full.date,
    cover_image: full.coverImage
  };

  const data = await safeInsert('albums', full, coreFallback);
  notifyDbChanged();
  return (data && data[0]) ? normalizeAlbum(data[0]) : full;
};

export const updateAlbum = async (id, updatedFields) => {
  const coreFallback = {};
  if (updatedFields.title || updatedFields.name) coreFallback.title = updatedFields.title || updatedFields.name;
  if (updatedFields.date) coreFallback.date = updatedFields.date;
  if (updatedFields.coverImage || updatedFields.cover_image) coreFallback.cover_image = updatedFields.coverImage || updatedFields.cover_image;

  await safeUpdate('albums', id, updatedFields, coreFallback);
  notifyDbChanged();
};

export const deleteAlbum = async (id) => {
  const { error } = await supabase.from('albums').delete().eq('id', id);
  if (error) console.error('deleteAlbum error:', error);
  notifyDbChanged();
};

// Photos
export const addPhoto = async (photo) => {
  const full = normalizePhoto(photo);
  const coreFallback = {
    url: full.url,
    caption: full.caption
  };

  const data = await safeInsert('photos', full, coreFallback);
  notifyDbChanged();
  return (data && data[0]) ? normalizePhoto(data[0]) : full;
};

export const addPhotos = async (photosList) => {
  const payloads = photosList.map(normalizePhoto);
  const { data, error } = await supabase.from('photos').insert(payloads).select();
  if (error) console.error('addPhotos error:', error);
  notifyDbChanged();
  return (data || []).map(normalizePhoto);
};

export const updatePhoto = async (id, updatedFields) => {
  await safeUpdate('photos', id, updatedFields, { caption: updatedFields.caption });
  notifyDbChanged();
};

export const deletePhoto = async (id) => {
  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) console.error('deletePhoto error:', error);
  notifyDbChanged();
};

export const likePhoto = async (id) => {
  const { data: current } = await supabase.from('photos').select('likes').eq('id', id).single();
  const currentLikes = (current && current.likes) ? current.likes : 0;
  const { data, error } = await supabase.from('photos').update({ likes: currentLikes + 1 }).eq('id', id).select();
  if (error) console.error('likePhoto error:', error);
  notifyDbChanged();
  return (data && data[0]) ? normalizePhoto(data[0]) : { id, likes: currentLikes + 1 };
};

// Milestones
export const addMilestone = async (milestone) => {
  const full = normalizeMilestone(milestone);
  const data = await safeInsert('milestones', full, full);
  notifyDbChanged();
  return (data && data[0]) ? normalizeMilestone(data[0]) : full;
};

export const updateMilestone = async (id, updatedFields) => {
  await safeUpdate('milestones', id, updatedFields, updatedFields);
  notifyDbChanged();
};

export const deleteMilestone = async (id) => {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) console.error('deleteMilestone error:', error);
  notifyDbChanged();
};

// Contact Messages
export const addMessage = async (message) => {
  const full = normalizeMessage(message);
  const coreFallback = {
    name: full.name,
    email: full.email,
    phone: full.phone,
    message: full.message
  };

  const data = await safeInsert('messages', full, coreFallback);
  notifyDbChanged();
  return (data && data[0]) ? normalizeMessage(data[0]) : full;
};

export const toggleMessageReadStatus = async (id) => {
  const { data: current } = await supabase.from('messages').select('read').eq('id', id).single();
  const newReadState = current ? !current.read : true;
  await safeUpdate('messages', id, { read: newReadState }, {});
  notifyDbChanged();
};

export const deleteMessage = async (id) => {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) console.error('deleteMessage error:', error);
  notifyDbChanged();
};

// Backup & Restore
export const exportDatabase = async () => {
  const db = await fetchDatabaseApi();
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(db, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `bayanapalli_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importDatabase = async (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (data && typeof data === 'object') {
      if (Array.isArray(data.committee) && data.committee.length > 0) {
        await supabase.from('committee').upsert(data.committee.map(normalizeMember));
      }
      if (Array.isArray(data.festivals) && data.festivals.length > 0) {
        await supabase.from('festivals').upsert(data.festivals.map(normalizeFestival));
      }
      if (Array.isArray(data.albums) && data.albums.length > 0) {
        await supabase.from('albums').upsert(data.albums.map(normalizeAlbum));
      }
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        await supabase.from('photos').upsert(data.photos.map(normalizePhoto));
      }
      if (Array.isArray(data.milestones) && data.milestones.length > 0) {
        await supabase.from('milestones').upsert(data.milestones.map(normalizeMilestone));
      }
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        await supabase.from('messages').upsert(data.messages.map(normalizeMessage));
      }
      notifyDbChanged();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Import database failed:', e);
    return false;
  }
};

// Global Search
export const globalSearch = async (query) => {
  if (!query || !query.trim()) return [];
  const db = await fetchDatabaseApi();
  const q = query.toLowerCase();
  const results = [];

  (db.committee || []).forEach(m => {
    if (m.name?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q)) {
      results.push({ type: 'member', title: m.name, subtitle: m.role, item: m });
    }
  });

  (db.festivals || []).forEach(f => {
    if (f.title?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q)) {
      results.push({ type: 'festival', title: f.title || f.name, subtitle: f.date, item: f });
    }
  });

  (db.albums || []).forEach(a => {
    if (a.title?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q)) {
      results.push({ type: 'album', title: a.title || a.name, subtitle: a.date, item: a });
    }
  });

  (db.milestones || []).forEach(m => {
    if (m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q) || m.year?.includes(q)) {
      results.push({ type: 'milestone', title: m.title, subtitle: m.year, item: m });
    }
  });

  return results;
};
