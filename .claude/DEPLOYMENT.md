# NetWatch - Deployment Guide

## Quick Deploy to Railway.app (Recommended)

### Prerequisites
- Railway.app account (free tier available)
- This GitHub repository

### Steps

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your NetWatch repository

3. **Configure Environment Variables**
   Railway will auto-detect your Node.js app. Set these variables:
   
   ```
   JWT_SECRET=generate_a_long_random_string_here_minimum_32_characters
   PORT=3000
   ```

4. **Deploy**
   - Railway automatically:
     - Installs dependencies (`npm install`)
     - Runs the app (`npm start`)
     - Provides a public URL

5. **Access Your App**
   - Railway gives you a URL like: `https://netwatch-production.up.railway.app`
   - Your app is now live!

### Generate JWT_SECRET

Use one of these methods:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Online:**
- https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")

**Or just use this:**
```
your_very_long_and_secure_jwt_secret_key_for_netwatch_production_minimum_32_chars
```

---

## Alternative: Render.com

1. **Sign up:** https://render.com
2. **New Web Service**
3. **Connect GitHub**
4. **Settings:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variable: `JWT_SECRET`
5. **Deploy**

---

## Seeding Production Database

After deployment, seed the database:

### Create Student Account
```bash
# SSH into your server or use Railway CLI
npm run seed:student
```

### Create Instructor Account
```bash
npm run seed:instructor
```

Default credentials will be shown in the console output.

---

## Verify Deployment

1. Visit your deployed URL
2. Check landing page loads
3. Try "Start a scenario" → should show login
4. Try "Explore the tool" → should load Teach Mode
5. Test on mobile device

---

## Troubleshooting

### App won't start
- Check `JWT_SECRET` is set in environment variables
- Check logs in Railway/Render dashboard

### Database issues
- SQLite file should be created automatically
- Check file permissions if using VPS

### CORS errors
- Already configured in `backend/server.js`
- Should work out of the box

---

## Production Checklist

- [ ] Environment variables set
- [ ] JWT_SECRET is secure and random
- [ ] Database seeded with test accounts
- [ ] All pages load correctly
- [ ] Login/authentication works
- [ ] Lessons and skills load
- [ ] Mobile responsive works
- [ ] No console errors

---

## For Skripsi Documentation

Include these deployment details in your thesis:

1. **Architecture:** Node.js + Express backend, vanilla JavaScript frontend
2. **Database:** SQLite (file-based, no separate server needed)
3. **Hosting:** Railway.app (Platform-as-a-Service)
4. **URL:** [Your deployed URL here]
5. **Test Accounts:** [List the seeded accounts]

---

## Support

For Railway-specific issues: https://docs.railway.app
For Render issues: https://render.com/docs
