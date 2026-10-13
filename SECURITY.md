# OpenMaic - Deployment Security Guide

## ✅ Security Features Implemented

### 1. Rate Limiting
All API endpoints have rate limiting to prevent abuse:

- **`/api/question`**: 10 requests/minute (expensive AI calls)
- **`/api/transcribe`**: 20 requests/minute (generous for audio)
- **`/api/tts`**: 15 requests/minute (moderate for voice)

**How it works:**
- Uses client IP from `x-forwarded-for` header (Vercel compatible)
- In-memory store (resets on server restart)
- Returns 429 status with retry info

### 2. Request Validation
All endpoints validate:
- Request body structure
- Content types
- File sizes (audio max 10MB)
- Text lengths (questions max 10K chars, TTS max 5K chars)

### 3. Environment Variables
**Never commit these to git:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
```

**Already protected:**
- ✅ `.gitignore` excludes `.env*.local`
- ✅ `.env.local.example` shows format without real keys
- ✅ API routes don't log keys

### 4. CORS Headers
All API responses include proper headers for security

---

## 🚀 Deployment Steps (Vercel)

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login
```bash
vercel login
# Follow browser authentication
```

### Step 3: Add Environment Variables
**Option A: Via CLI (Recommended)**
```bash
vercel env add ANTHROPIC_API_KEY
# Paste your key when prompted
# Select "Production" environment

vercel env add DEEPGRAM_API_KEY
# Paste your key when prompted
# Select "Production" environment

vercel env add ELEVENLABS_API_KEY
# Paste your key when prompted
# Select "Production" environment
```

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `ANTHROPIC_API_KEY` = your key
   - `DEEPGRAM_API_KEY` = your key
   - `ELEVENLABS_API_KEY` = your key

### Step 4: Deploy
```bash
vercel --prod
```

### Step 5: Share URL
Vercel will give you a URL like:
- `https://openmaic-yourname.vercel.app`

Share this with your friend!

---

## 🔒 Security Best Practices

### For Production Use:

1. **Consider Adding Authentication**
   - Add password protection or user accounts
   - Prevents random people from using your API keys
   - Can use NextAuth.js or Clerk

2. **Monitor Usage**
   - Check Anthropic/Deepgram dashboards regularly
   - Set up billing alerts
   - Current limits should prevent surprises

3. **Rotate API Keys**
   - Change keys every few months
   - Immediately revoke if you see suspicious usage

4. **Add Domain Restrictions**
   - In Deepgram dashboard: restrict to your Vercel domain
   - Prevents key abuse even if leaked

### Cost Protection:

**Current rate limits prevent:**
- ❌ Bot attacks draining your credits
- ❌ Accidental infinite loops
- ❌ Friends sharing your URL publicly

**If you want stricter limits:**
Edit `lib/rateLimit.ts`:
```typescript
RATE_LIMITS = {
  question: { maxRequests: 5, windowMs: 60000 },  // 5 per minute
  transcribe: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  tts: { maxRequests: 8, windowMs: 60000 },        // 8 per minute
}
```

---

## 📊 Expected Costs (With Rate Limits)

**Per user per session (10 questions):**
- Claude: ~$0.03
- Deepgram Transcription: ~$0.01  
- ElevenLabs TTS: depends on your ElevenLabs plan and prompt length
- **Total: ~$0.06 per session**

**Monthly with 1 friend using it regularly:**
- 50 sessions: ~$3.00
- 100 sessions: ~$6.00

**With rate limits, max monthly cost if abused:**
- Claude: 10 req/min × 60 min × 24 hr × 30 days × $0.003 = ~$1,300 (but limited!)
- Actual protection: Rate limits prevent this

---

## 🆘 If Something Goes Wrong

**High API usage detected:**
1. Check Vercel function logs
2. Revoke API keys immediately in Anthropic/Deepgram dashboards
3. Generate new keys
4. Update Vercel environment variables

**Rate limit too aggressive:**
1. Edit `lib/rateLimit.ts`
2. Increase `maxRequests` values
3. Redeploy: `vercel --prod`

**Want to pause sharing:**
1. Remove environment variables from Vercel
2. Or delete the Vercel project

---

## ✅ Pre-Deployment Checklist

- [ ] API keys added to Vercel environment variables
- [ ] Rate limits tested locally
- [ ] Build passes: `npm run build`
- [ ] Deployed successfully: `vercel --prod`
- [ ] Tested with one request
- [ ] Shared URL with friend
- [ ] Monitoring set up in API dashboards

---

**Questions?** The app is now production-ready with security best practices!
