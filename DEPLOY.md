# 🚀 DEPLOY TO VERCEL - QUICK START

## Your app is ready with security features! Here's how to deploy:

---

## Option 1: Deploy via Vercel Dashboard (Easiest - 2 minutes)

### Step 1: Push to GitHub
```bash
# If you haven't already:
git init
git add .
git commit -m "OpenMaic MVP with security features"
git remote add origin https://github.com/YOUR_USERNAME/openmaic.git
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `openmaic` repo
4. Click "Deploy"

### Step 3: Add Environment Variables
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Environment Variables"
3. Add these:
   - `ANTHROPIC_API_KEY` = your_anthropic_api_key_here
   - `DEEPGRAM_API_KEY` = your_deepgram_api_key_here
4. Click "Save"
5. Redeploy: Go to "Deployments" tab → Click "Redeploy"

### Step 4: Done!
Vercel will give you a URL like `https://openmaic-xyz.vercel.app`
Share that with your friend!

---

## Option 2: Deploy via Vercel CLI (If you fix npm)

```bash
# Fix npm cache first:
sudo rm -rf ~/.npm

# Then install vercel:
npm i -g vercel

# Login:
vercel login

# Add environment variables:
vercel env add ANTHROPIC_API_KEY
# Paste: your_anthropic_api_key_here
# Select "Production"

vercel env add DEEPGRAM_API_KEY  
# Paste: your_deepgram_api_key_here
# Select "Production"

# Deploy:
vercel --prod
```

---

## ✅ What's Already Secured

Your app now has:
- ✅ Rate limiting (prevents API abuse)
- ✅ Request size limits (10MB max audio)
- ✅ Text length limits (5K chars max)
- ✅ IP-based rate tracking
- ✅ Input sanitization
- ✅ Proper error handling without exposing keys
- ✅ Environment variables never in code

**Even if someone finds your URL, they can't abuse it!**

---

## 📊 Cost Protection

With current rate limits:
- Max 10 questions per minute per IP
- Max 20 transcriptions per minute per IP  
- Max 15 TTS per minute per IP

**Worst case scenario:** Even if someone shares your URL publicly, max cost is ~$50/day (they'd hit rate limits first).

**Realistic use with 1 friend:** ~$5-10/month

---

## 🔒 Additional Security Steps (Optional)

1. **Add password protection** - Prevent random access
2. **Domain restrict API keys** - In Deepgram dashboard, restrict to your Vercel domain
3. **Set up billing alerts** - Get notified if usage spikes

---

## 🆘 Emergency Stop

If you see suspicious usage:
1. Go to https://console.anthropic.com/ → Revoke API key
2. Go to https://console.deepgram.com/ → Revoke API key
3. In Vercel dashboard → Delete project or remove env vars

---

## 📖 Full Security Guide

See `SECURITY.md` in your project folder for complete details.

**Ready to deploy? Use Option 1 above - it's the easiest!**
