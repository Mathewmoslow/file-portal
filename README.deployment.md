# File Portal - Deployment Guide

## 🚀 Deploy to Vercel (Recommended)

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
   ```bash
   cd file-portal
   git init
   git add .
   git commit -m "Initial commit - File Portal MVP"
   ```

2. **Push to GitHub**:
   - Create a new repository on GitHub: https://github.com/new
   - Name it: `file-portal`
   - Then run:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/file-portal.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign up/Login to Vercel**:
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Project**:
   - Click "Add New Project"
   - Import your `file-portal` repository
   - Vercel will auto-detect the setup

3. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables**:
   Click "Environment Variables" and add:
   ```
   JWT_SECRET=your-super-secret-key-here-make-it-random
   PASSWORD=your-secure-password-here
   FILE_BASE_PATH=/tmp/files
   CORS_ORIGIN=https://mathewmoslow.com
   VITE_API_URL=/api
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at `your-project.vercel.app`

### Step 3: Custom Domain (mathewmoslow.com/login)

1. **In Vercel Dashboard**:
   - Go to your project
   - Click "Settings" → "Domains"
   - Add `mathewmoslow.com`

2. **In IONOS DNS Settings**:
   - Add a CNAME record:
     - **Type**: CNAME
     - **Name**: `@` (or `www`)
     - **Value**: `cname.vercel-dns.com`

3. **Or use subdomain**:
   - Create: `portal.mathewmoslow.com`
   - CNAME to: `cname.vercel-dns.com`

### Step 4: Set Base Path (if using /login route)

If you want it at `mathewmoslow.com/login`, update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/login/',
  // ... rest of config
})
```

Then rebuild and redeploy.

---

## 🔧 Alternative: Deploy Backend Separately

If you want to keep files on your IONOS server:

1. **Deploy Backend to Railway/Render** (free tier):
   - Use Railway.app or Render.com for Node.js backend
   - Connect to IONOS via SFTP for file storage

2. **Deploy Frontend to Vercel**:
   - Update `VITE_API_URL` to point to your backend URL

---

## 📝 Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `abc123xyz789...` (random string) |
| `PASSWORD` | Portal login password | `mySecurePassword123` |
| `FILE_BASE_PATH` | Where files are stored | `/tmp/files` (Vercel) or `/var/www/files` |
| `VITE_API_URL` | API endpoint | `/api` (same domain) or `https://api.example.com` |
| `CORS_ORIGIN` | Allowed origin | `https://mathewmoslow.com` |

---

## ⚠️ Important Security Notes

1. **Change default password** immediately in environment variables
2. **Use strong JWT_SECRET** (generate with: `openssl rand -base64 32`)
3. **Enable HTTPS** (Vercel does this automatically)
4. **Don't commit `.env` files** to Git (they're in `.gitignore`)

---

## 🧪 Testing Your Deployment

1. Visit your deployed URL
2. Login with your password
3. Try creating/editing files
4. Check if changes persist

---

## 🆘 Troubleshooting

**Files don't persist?**
- Vercel's `/tmp` is ephemeral
- Consider using Vercel Blob Storage or connect to IONOS via SFTP

**CORS errors?**
- Check `CORS_ORIGIN` matches your domain exactly
- Include protocol: `https://` not just domain

**Login not working?**
- Verify `JWT_SECRET` and `PASSWORD` are set in Vercel dashboard
- Check browser console for errors

**404 on /login route?**
- Make sure `vercel.json` routing is configured correctly
- Or use base path in vite.config.ts

---

Need help? The deployment should take about 10 minutes total!
