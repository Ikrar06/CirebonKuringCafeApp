# 🔧 Fix Halaman Hitam - Employee Portal

## Penyebab Masalah

1. **Table `employees` tidak punya kolom `username` dan `password_hash`**
2. **Browser localStorage mungkin corrupt**
3. **AuthContext error saat verify token**

---

## ✅ Solusi Lengkap

### **Step 1: Setup Database**

1. **Buka Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Pilih project Anda
   - Klik tab "SQL Editor"

2. **Run SQL Script:**
   - Buka file: `/SETUP_EMPLOYEE_LOGIN.sql`
   - Copy semua isinya
   - Paste di SQL Editor
   - Click "Run"

3. **Verifikasi:**
   ```sql
   SELECT username, full_name, employment_status
   FROM employees
   WHERE employment_status = 'active';
   ```

---

### **Step 2: Clear Browser Data**

1. **Buka Browser DevTools:**
   - Tekan `F12` atau `Cmd+Option+I` (Mac)

2. **Clear localStorage:**
   - Tab "Console"
   - Ketik:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

3. **Atau Clear Cache Manual:**
   - Chrome: `Ctrl+Shift+Delete` (Windows) atau `Cmd+Shift+Delete` (Mac)
   - Pilih "Cached images and files" + "Cookies and site data"
   - Click "Clear data"

---

### **Step 3: Restart Server**

```bash
# Kill proses yang running
lsof -ti:3001 | xargs kill -9

# Start ulang
cd apps/employee-portal
pnpm dev
```

---

### **Step 4: Test Login**

1. Buka browser (incognito/private mode recommended)
2. Go to: **http://localhost:3001/login**
3. Login dengan test account:
   - **Username:** `test.kasir`
   - **Password:** `test123`

---

## 🧪 Test Accounts yang Sudah Dibuat

Setelah run SQL script, Anda punya 2 test accounts:

| Username | Password | Position | Status |
|----------|----------|----------|--------|
| test.kasir | test123 | kasir | active |
| test.pelayan | test123 | pelayan | active |

---

## 🔐 Setup Password untuk Employee yang Sudah Ada

Untuk employee existing (EMP002, EMP003, EMP004):

1. **Generate Password Hash:**
   - Buka: https://bcrypt-generator.com/
   - Input password yang diinginkan (contoh: `pegawai123`)
   - Cost factor: 10
   - Copy hash yang dihasilkan

2. **Update di Database:**
   ```sql
   -- Ganti 'YOUR_EMPLOYEE_ID' dengan ID employee
   -- Ganti 'YOUR_BCRYPT_HASH' dengan hash dari step 1

   UPDATE employees
   SET
       username = 'emp002',  -- atau username yang diinginkan
       password_hash = '$2a$10$...'  -- hash dari bcrypt generator
   WHERE id = '51544134-6290-43b2-a2f2-62d19992d376';  -- ID untuk EMP002
   ```

3. **Verifikasi:**
   ```sql
   SELECT username, full_name,
          CASE WHEN password_hash IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as pwd
   FROM employees;
   ```

---

## 🐛 Debugging - Cek Error di Browser

1. **Buka DevTools (F12)**
2. **Tab Console** - lihat error messages
3. **Tab Network** - cek failed requests
4. **Common Errors:**
   - `fetch failed` → Server tidak running
   - `401 Unauthorized` → Username/password salah
   - `Column 'username' does not exist` → SQL script belum dijalankan

---

## ❓ Troubleshooting

### Masalah: Halaman masih hitam setelah semua step

**Solusi:**
1. Check browser console (F12) untuk error
2. Pastikan server running di port 3001
3. Try different browser atau incognito mode
4. Clear DNS cache:
   ```bash
   # Mac
   sudo dscacheutil -flushcache

   # Windows
   ipconfig /flushdns
   ```

### Masalah: Login gagal terus

**Solusi:**
1. Cek username dan password di database
2. Pastikan `employment_status = 'active'`
3. Cek API response di Network tab
4. Cek JWT_SECRET di `.env.local`

### Masalah: "Token tidak valid"

**Solusi:**
```javascript
// Di browser console
localStorage.removeItem('employee_auth_token')
localStorage.removeItem('employee_data')
location.reload()
```

---

## ✅ Checklist

- [ ] Run SQL script di Supabase
- [ ] Clear browser localStorage
- [ ] Restart dev server
- [ ] Test login dengan test account
- [ ] Buka di incognito mode
- [ ] Check console untuk error

---

**Jika masih ada masalah, screenshot error di console dan share!**
