import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './lib/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper for database queries
async function handleSelect(table, res) {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true });
  if (error) {
    console.error(`Error fetching ${table}:`, error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
}

// 1. COMMITTEE ENDPOINTS
app.get('/api/committee', (req, res) => handleSelect('committee', res));

app.post('/api/committee', async (req, res) => {
  const { data, error } = await supabase.from('committee').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// 2. FESTIVALS ENDPOINTS
app.get('/api/festivals', (req, res) => handleSelect('festivals', res));

app.post('/api/festivals', async (req, res) => {
  const { data, error } = await supabase.from('festivals').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// 3. ALBUMS ENDPOINTS
app.get('/api/albums', (req, res) => handleSelect('albums', res));

app.post('/api/albums', async (req, res) => {
  const { data, error } = await supabase.from('albums').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// 4. PHOTOS ENDPOINTS
app.get('/api/photos', (req, res) => handleSelect('photos', res));

app.post('/api/photos', async (req, res) => {
  const { data, error } = await supabase.from('photos').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// 5. MILESTONES ENDPOINTS
app.get('/api/milestones', (req, res) => handleSelect('milestones', res));

app.post('/api/milestones', async (req, res) => {
  const { data, error } = await supabase.from('milestones').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// 6. MESSAGES ENDPOINTS (Contact Form)
app.get('/api/messages', (req, res) => handleSelect('messages', res));

app.post('/api/messages', async (req, res) => {
  const { data, error } = await supabase.from('messages').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.listen(PORT, () => {
  console.log(`⚡ Express Backend Server connected to Supabase running on port ${PORT}`);
});

export default app;
