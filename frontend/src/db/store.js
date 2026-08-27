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

export const saveDatabaseLocal = (db) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
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

    const rawC = resC.data || [];
    const rawF = resF.data || [];
    const rawA = resA.data || [];
    const rawP = resP.data || [];
    const rawM = resM.data || [];
    const rawMsg = resMsg.data || [];

    const data = {
      committee: rawC.map(normalizeMember),
      festivals: rawF.map(normalizeFestival),
      albums: rawA.map(normalizeAlbum),
      photos: rawP.map(normalizePhoto),
      milestones: rawM.map(normalizeMilestone),
      messages: rawMsg.map(normalizeMessage)
    };

    saveDatabaseLocal(data);
    return data;
  } catch (err) {
    console.error('Error fetching database from Supabase:', err);
    return getDatabase();
  }
};

export const getFreshDatabase = async () => {
  return await fetchDatabaseApi();
};

// --- Committee Members ---
export const getMembers = () => getDatabase().committee;

export const addMember = async (member) => {
  const full = normalizeMember(member);
  
  // Optimistic local cache update for INSTANT UI rendering
  const db = getDatabase();
  db.committee = [...db.committee.filter(m => m.id !== full.id), full];
  saveDatabaseLocal(db);
  notifyDbChanged();

  // Async push to Supabase
  let { data, error } = await supabase.from('committee').insert([full]).select();
  if (error && error.code === 'PGRST204') {
    const corePayload = { name: full.name, role: full.role, phone: full.phone, image: full.photo };
    const retry = await supabase.from('committee').insert([corePayload]).select();
    data = retry.data;
  }
  
  const savedItem = (data && data[0]) ? normalizeMember(data[0]) : full;
  db.committee = [...db.committee.filter(m => m.id !== full.id && m.id !== savedItem.id), savedItem];
  saveDatabaseLocal(db);
  notifyDbChanged();
  return savedItem;
};

export const updateMember = async (id, updatedFields) => {
  const db = getDatabase();
  db.committee = db.committee.map(m => m.id === id ? normalizeMember({ ...m, ...updatedFields }) : m);
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { error } = await supabase.from('committee').update(updatedFields).eq('id', id);
  if (error && error.code === 'PGRST204') {
    const coreFields = {};
    if (updatedFields.name) coreFields.name = updatedFields.name;
    if (updatedFields.role) coreFields.role = updatedFields.role;
    if (updatedFields.phone) coreFields.phone = updatedFields.phone;
    if (updatedFields.photo || updatedFields.image) coreFields.image = updatedFields.photo || updatedFields.image;
    await supabase.from('committee').update(coreFields).eq('id', id);
  }
};

export const deleteMember = async (id) => {
  const db = getDatabase();
  db.committee = db.committee.filter(m => m.id !== id);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('committee').delete().eq('id', id);
};

// --- Festivals ---
export const addFestival = async (festival) => {
  const full = normalizeFestival(festival);
  const db = getDatabase();
  db.festivals = [...db.festivals.filter(f => f.id !== full.id), full];
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { data, error } = await supabase.from('festivals').insert([full]).select();
  if (error && error.code === 'PGRST204') {
    const corePayload = { title: full.title || full.name, date: full.date, description: full.description, image: full.coverImage };
    const retry = await supabase.from('festivals').insert([corePayload]).select();
    data = retry.data;
  }
  
  const savedItem = (data && data[0]) ? normalizeFestival(data[0]) : full;
  db.festivals = [...db.festivals.filter(f => f.id !== full.id && f.id !== savedItem.id), savedItem];
  saveDatabaseLocal(db);
  notifyDbChanged();
  return savedItem;
};

export const updateFestival = async (id, updatedFields) => {
  const db = getDatabase();
  db.festivals = db.festivals.map(f => f.id === id ? normalizeFestival({ ...f, ...updatedFields }) : f);
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { error } = await supabase.from('festivals').update(updatedFields).eq('id', id);
  if (error && error.code === 'PGRST204') {
    const coreFields = {};
    if (updatedFields.title || updatedFields.name) coreFields.title = updatedFields.title || updatedFields.name;
    if (updatedFields.date) coreFields.date = updatedFields.date;
    if (updatedFields.description) coreFields.description = updatedFields.description;
    if (updatedFields.coverImage || updatedFields.image) coreFields.image = updatedFields.coverImage || updatedFields.image;
    await supabase.from('festivals').update(coreFields).eq('id', id);
  }
};

export const deleteFestival = async (id) => {
  const db = getDatabase();
  db.festivals = db.festivals.filter(f => f.id !== id);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('festivals').delete().eq('id', id);
};

// --- Photo Albums ---
export const addAlbum = async (album) => {
  const full = normalizeAlbum(album);
  const db = getDatabase();
  db.albums = [...db.albums.filter(a => a.id !== full.id), full];
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { data, error } = await supabase.from('albums').insert([full]).select();
  if (error && error.code === 'PGRST204') {
    const corePayload = { title: full.title || full.name, date: full.date, cover_image: full.coverImage };
    const retry = await supabase.from('albums').insert([corePayload]).select();
    data = retry.data;
  }
  
  const savedItem = (data && data[0]) ? normalizeAlbum(data[0]) : full;
  db.albums = [...db.albums.filter(a => a.id !== full.id && a.id !== savedItem.id), savedItem];
  saveDatabaseLocal(db);
  notifyDbChanged();
  return savedItem;
};

export const updateAlbum = async (id, updatedFields) => {
  const db = getDatabase();
  db.albums = db.albums.map(a => a.id === id ? normalizeAlbum({ ...a, ...updatedFields }) : a);
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { error } = await supabase.from('albums').update(updatedFields).eq('id', id);
  if (error && error.code === 'PGRST204') {
    const coreFields = {};
    if (updatedFields.title || updatedFields.name) coreFields.title = updatedFields.title || updatedFields.name;
    if (updatedFields.date) coreFields.date = updatedFields.date;
    if (updatedFields.coverImage || updatedFields.cover_image) coreFields.cover_image = updatedFields.coverImage || updatedFields.cover_image;
    await supabase.from('albums').update(coreFields).eq('id', id);
  }
};

export const deleteAlbum = async (id) => {
  const db = getDatabase();
  db.albums = db.albums.filter(a => a.id !== id);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('albums').delete().eq('id', id);
};

// --- Photos ---
export const addPhoto = async (photo) => {
  const full = normalizePhoto(photo);
  const db = getDatabase();
  db.photos = [...db.photos.filter(p => p.id !== full.id), full];
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { data, error } = await supabase.from('photos').insert([full]).select();
  if (error && error.code === 'PGRST204') {
    const corePayload = { url: full.url, caption: full.caption };
    const retry = await supabase.from('photos').insert([corePayload]).select();
    data = retry.data;
  }
  const savedItem = (data && data[0]) ? normalizePhoto(data[0]) : full;
  db.photos = [...db.photos.filter(p => p.id !== full.id && p.id !== savedItem.id), savedItem];
  saveDatabaseLocal(db);
  notifyDbChanged();
  return savedItem;
};

export const addPhotos = async (photosList) => {
  const payloads = photosList.map(normalizePhoto);
  const db = getDatabase();
  db.photos = [...db.photos, ...payloads];
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { data, error } = await supabase.from('photos').insert(payloads).select();
  if (error && error.code === 'PGRST204') {
    const corePayloads = payloads.map(p => ({ url: p.url, caption: p.caption }));
    const retry = await supabase.from('photos').insert(corePayloads).select();
    data = retry.data;
  }
  return (data || []).map(normalizePhoto);
};

export const updatePhoto = async (id, updatedFields) => {
  const db = getDatabase();
  db.photos = db.photos.map(p => p.id === id ? normalizePhoto({ ...p, ...updatedFields }) : p);
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { error } = await supabase.from('photos').update(updatedFields).eq('id', id);
  if (error && error.code === 'PGRST204') {
    await supabase.from('photos').update({ caption: updatedFields.caption }).eq('id', id);
  }
};

export const deletePhoto = async (id) => {
  const db = getDatabase();
  db.photos = db.photos.filter(p => p.id !== id);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('photos').delete().eq('id', id);
};

export const likePhoto = async (id) => {
  const db = getDatabase();
  db.photos = db.photos.map(p => p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p);
  saveDatabaseLocal(db);
  notifyDbChanged();

  const { data: current } = await supabase.from('photos').select('likes').eq('id', id).single();
  const currentLikes = (current && current.likes) ? current.likes : 0;
  const { data } = await supabase.from('photos').update({ likes: currentLikes + 1 }).eq('id', id).select();
  return (data && data[0]) ? normalizePhoto(data[0]) : { id, likes: currentLikes + 1 };
};

// --- Milestones ---
export const addMilestone = async (milestone) => {
  const full = normalizeMilestone(milestone);
  const db = getDatabase();
  db.milestones = [...db.milestones.filter(m => m.id !== full.id), full];
  saveDatabaseLocal(db);
  notifyDbChanged();

  const { data } = await supabase.from('milestones').insert([full]).select();
  return (data && data[0]) ? normalizeMilestone(data[0]) : full;
};

export const updateMilestone = async (id, updatedFields) => {
  const db = getDatabase();
  db.milestones = db.milestones.map(m => m.id === id ? normalizeMilestone({ ...m, ...updatedFields }) : m);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('milestones').update(updatedFields).eq('id', id);
};

export const deleteMilestone = async (id) => {
  const db = getDatabase();
  db.milestones = db.milestones.filter(m => m.id !== id);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('milestones').delete().eq('id', id);
};

// --- Contact Messages ---
export const addMessage = async (message) => {
  const full = normalizeMessage(message);
  const db = getDatabase();
  db.messages = [full, ...db.messages.filter(msg => msg.id !== full.id)];
  saveDatabaseLocal(db);
  notifyDbChanged();

  let { data, error } = await supabase.from('messages').insert([full]).select();
  if (error && error.code === 'PGRST204') {
    const corePayload = { name: full.name, email: full.email, phone: full.phone, message: full.message };
    const retry = await supabase.from('messages').insert([corePayload]).select();
    data = retry.data;
  }
  return (data && data[0]) ? normalizeMessage(data[0]) : full;
};

export const toggleMessageReadStatus = async (id) => {
  const db = getDatabase();
  db.messages = db.messages.map(msg => msg.id === id ? { ...msg, read: !msg.read } : msg);
  saveDatabaseLocal(db);
  notifyDbChanged();

  const { data: current } = await supabase.from('messages').select('read').eq('id', id).single();
  const newReadState = current ? !current.read : true;
  await supabase.from('messages').update({ read: newReadState }).eq('id', id);
};

export const deleteMessage = async (id) => {
  const db = getDatabase();
  db.messages = db.messages.filter(msg => msg.id !== id);
  saveDatabaseLocal(db);
  notifyDbChanged();

  await supabase.from('messages').delete().eq('id', id);
};

// --- Backup & Restore ---
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
      saveDatabaseLocal(data);
      notifyDbChanged();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Import database failed:', e);
    return false;
  }
};

// --- Global Search ---
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
