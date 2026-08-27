# Supabase Setup Guide for Bayanapalli Project

This folder contains all Supabase configuration, schema definitions, and migration scripts.

---

## 🚀 Quick Setup Instructions

### Step 1: Run SQL Schema in Supabase
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`mstmcwrwtihrirqzxiuq`).
3. Click **SQL Editor** in the left menu.
4. Open [`schema.sql`](./schema.sql), copy all SQL code, paste it into the editor, and click **RUN**.
5. This automatically creates all 6 tables:
   - `committee`
   - `festivals`
   - `albums`
   - `photos`
   - `milestones`
   - `messages`

---

### Step 2: Storage Bucket for Images (Optional)
1. Go to **Storage** in the Supabase Dashboard.
2. Click **New Bucket**.
3. Name it `gallery`.
4. Toggle **Public Bucket** to **ON**.
5. Save the bucket.

---

### Step 3: Frontend Client Integration
The frontend Supabase client SDK is configured at [`frontend/src/lib/supabase.js`](../frontend/src/lib/supabase.js).
