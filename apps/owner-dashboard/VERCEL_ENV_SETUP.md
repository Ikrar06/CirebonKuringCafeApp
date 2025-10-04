# Vercel Environment Variables Setup

## Required Environment Variables

Add these environment variables in Vercel Dashboard:

### 1. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://gxlplxfjssxdjljtbonb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHBseGZqc3N4ZGpsanRib25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczODE0OTQsImV4cCI6MjA3Mjk1NzQ5NH0.peJ2Fqglc9chq1CdkLGyZXi3s-o3yeB7KWw-ifqJE_8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHBseGZqc3N4ZGpsanRib25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM4MTQ5NCwiZXhwIjoyMDcyOTU3NDk0fQ.nSn9gRSKx7IfcpoSR9xM4L2KExg9OCUkZ2J8nyBOlRQ
```

### 2. NextAuth Configuration (REQUIRED!)
```
NEXTAUTH_URL=https://your-deployed-url.vercel.app
NEXTAUTH_SECRET=your-generated-secret-here
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Or use online generator: https://generate-secret.vercel.app/32

### 3. Optional - Telegram Bot
```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
```

## How to Add in Vercel

1. Go to your project in Vercel Dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in sidebar
4. Add each variable:
   - Key: Variable name (e.g., `NEXTAUTH_URL`)
   - Value: Variable value
   - Environment: Select **Production**, **Preview**, and **Development**
5. Click **Save**

## Important Notes

- ⚠️ **NEXTAUTH_URL** must match your deployed URL exactly
- ⚠️ **NEXTAUTH_SECRET** must be at least 32 characters long
- ⚠️ After adding env variables, **redeploy** your app for changes to take effect
- 🔒 Never commit `.env` or `.env.local` files to git
