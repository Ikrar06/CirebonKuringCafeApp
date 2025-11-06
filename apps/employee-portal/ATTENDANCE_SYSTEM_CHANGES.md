# Perubahan Sistem Attendance - Employee Portal

## Overview
Sistem attendance telah diperbaiki untuk menghapus field `work_hours` yang tidak ada di database dan menambahkan fitur-fitur baru untuk manajemen keterlambatan dan lembur yang lebih baik.

---

## 1. Perubahan Database Schema

### Tabel: `attendance`
Field yang digunakan (sesuai dengan schema database):
- `scheduled_in` (TIME) - Jadwal masuk shift
- `scheduled_out` (TIME) - Jadwal keluar shift
- `shift_type` (VARCHAR) - Jenis shift (regular, overtime, holiday, special)
- `clock_in` (TIMESTAMPTZ) - Waktu clock in aktual
- `clock_out` (TIMESTAMPTZ) - Waktu clock out aktual
- `regular_hours` (DECIMAL) - Jam kerja reguler
- `total_hours` (DECIMAL) - Total jam kerja (regular + overtime)
- `overtime_hours` (DECIMAL) - Jam lembur
- `overtime_approved` (BOOLEAN) - Status approval lembur
- `late_minutes` (INTEGER) - Menit keterlambatan
- `early_leave_minutes` (INTEGER) - Menit pulang lebih awal
- `status` (VARCHAR) - Status absensi (present, late, absent, dll)

### Tabel: `shift_schedules`
Digunakan untuk mendapatkan jadwal shift karyawan:
- `employee_id` (UUID) - ID karyawan
- `date` (DATE) - Tanggal shift
- `shift_start` (TIME) - Jam mulai shift
- `shift_end` (TIME) - Jam selesai shift
- `shift_type` (VARCHAR) - Jenis shift
- `break_duration` (INTEGER) - Durasi istirahat (menit)

---

## 2. Perubahan API Routes

### A. Clock-In API (`/api/attendance/clock-in/route.ts`)

#### Fitur Baru:
1. **Validasi Jadwal Shift**
   - Mengecek apakah karyawan punya jadwal shift hari ini
   - Tidak bisa clock in jika tidak ada jadwal

2. **Deteksi Keterlambatan**
   - Threshold: 15 menit setelah scheduled_in
   - Jika terlambat > 15 menit:
     - Status: `late`
     - `late_minutes` tercatat
     - Notifikasi ke karyawan

3. **Format Lokasi**
   - Menggunakan format PostgreSQL POINT: `(lat,lng)`
   - Contoh: `(-5.213018,119.492179)`

#### Request Body:
```json
{
  "latitude": -5.213018,
  "longitude": 119.492179,
  "distance": 10.24
}
```

#### Response (Success):
```json
{
  "attendance": {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2025-11-03",
    "clock_in": "2025-11-03T17:11:46.582Z",
    "scheduled_in": "17:00:00",
    "scheduled_out": "23:00:00",
    "shift_type": "regular",
    "status": "late",
    "late_minutes": 11,
    "clock_in_location": "(-5.213018,119.492179)",
    "clock_in_distance": 10.24,
    ...
  },
  "isLate": true,
  "lateMinutes": 11
}
```

#### Error Responses:
```json
// Tidak ada jadwal
{ "error": "Anda tidak memiliki jadwal shift hari ini" }

// Sudah clock in
{ "error": "Anda sudah clock in hari ini" }

// Terlalu jauh
{ "error": "Anda terlalu jauh dari cafe (500m). Maksimal 200m." }
```

---

### B. Clock-Out API (`/api/attendance/clock-out/route.ts`)

#### Fitur Baru:
1. **Kalkulasi Jam Kerja Akurat**
   - Regular hours: Jam kerja sesuai jadwal
   - Dikurangi dengan waktu break
   - Formula: `(clock_out - clock_in - break) / 60` menit

2. **Deteksi Lembur Otomatis**
   - **< 2 jam**: Lembur otomatis tercatat, tidak perlu approval
   - **> 2 jam**: Perlu approval owner melalui overtime_requests

3. **Validasi Overtime Request**
   - Cek tabel `overtime_requests` untuk approval
   - Status harus `approved`
   - Harus untuk tanggal yang sama

4. **Deteksi Pulang Lebih Awal**
   - Jika clock out sebelum scheduled_out
   - Tercatat di `early_leave_minutes`

#### Logika Kalkulasi:
```typescript
// Total menit bekerja
totalMinutesWorked = clockOut - clockIn

// Menit efektif (dikurangi break)
netMinutesWorked = totalMinutesWorked - breakMinutes

// Jadwal menit
scheduledMinutes = scheduledOut - scheduledIn

if (netMinutesWorked <= scheduledMinutes) {
  // Tidak lembur
  regularHours = netMinutesWorked / 60
  overtimeHours = 0
} else {
  // Ada lembur
  regularHours = scheduledMinutes / 60
  overtimeHours = (netMinutesWorked - scheduledMinutes) / 60

  if (overtimeHours <= 2) {
    // Auto-approve
    overtimeApproved = false
  } else {
    // Cek overtime request
    if (hasApprovedOvertimeRequest) {
      overtimeApproved = true
    } else {
      // Lembur tercatat tapi belum approved
      overtimeApproved = false
      needsApproval = true
    }
  }
}
```

#### Response (Success):
```json
{
  "attendance": {
    "id": "uuid",
    "clock_out": "2025-11-03T19:30:00.000Z",
    "regular_hours": 6.5,
    "overtime_hours": 0.5,
    "overtime_approved": false,
    "total_hours": 7.0,
    "early_leave_minutes": 0,
    ...
  },
  "overtime": {
    "hours": 0.5,
    "approved": false,
    "needsApproval": false,
    "autoApproved": true
  },
  "earlyLeave": null
}
```

#### Contoh Response (Lembur > 2 jam tanpa approval):
```json
{
  "attendance": {
    ...
    "overtime_hours": 3.5,
    "overtime_approved": false
  },
  "overtime": {
    "hours": 3.5,
    "approved": false,
    "needsApproval": true,
    "autoApproved": false
  }
}
```

---

## 3. Perubahan UI (Attendance Page)

### A. Interface AttendanceRecord
Ditambahkan field baru:
```typescript
interface AttendanceRecord {
  // ... existing fields
  status: string
  late_minutes: number
  scheduled_in: string
  scheduled_out: string
  shift_type: string
  regular_hours: number
  overtime_hours: number
  overtime_approved: boolean
  early_leave_minutes: number
  total_hours: number
}
```

### B. Clock In Display
Menampilkan:
- Waktu clock in aktual
- Jadwal clock in
- Status keterlambatan (jika ada)

```tsx
✓ 17:11
Jadwal: 17:00:00
⚠️ Terlambat 11 menit
```

### C. Clock Out Display
Menampilkan:
- Waktu clock out aktual
- Jadwal clock out
- Jam kerja reguler
- Jam lembur (dengan status approval)
- Pulang lebih awal (jika ada)

```tsx
✓ 19:30
Jadwal: 19:00:00
Jam kerja: 6.5 jam
⏳ Lembur: 0.5 jam (otomatis)
```

atau

```tsx
✓ 22:30
Jadwal: 19:00:00
Jam kerja: 6.0 jam
⏳ Lembur: 3.5 jam (menunggu persetujuan)
```

### D. Success Messages
- Clock in tepat waktu: `"Clock in berhasil! Tepat waktu."`
- Clock in terlambat: `"Clock in berhasil! (Terlambat 11 menit)"`
- Clock out normal: `"Clock out berhasil!"`
- Clock out dengan lembur: `"Clock out berhasil! Lembur 0.5 jam (otomatis disetujui)."`
- Clock out lembur perlu approval: `"Clock out berhasil! Lembur 3.5 jam menunggu persetujuan owner."`
- Pulang lebih awal: `"Clock out berhasil! Anda pulang 30 menit lebih awal."`

### E. Info Box
Ditambahkan catatan:
- Anda harus memiliki jadwal shift untuk bisa clock in
- Terlambat lebih dari 15 menit akan dicatat sebagai keterlambatan
- Lembur dibawah 2 jam akan otomatis tercatat
- Lembur diatas 2 jam memerlukan persetujuan owner terlebih dahulu

---

## 4. Testing Guide

### Persiapan Testing

#### A. Setup Test Data
1. **Buat Employee Test**:
```sql
-- Employee sudah ada, ambil ID-nya
SELECT id, full_name FROM employees WHERE username = 'test_employee';
```

2. **Buat Shift Schedule**:
```sql
INSERT INTO shift_schedules (
  employee_id,
  date,
  shift_start,
  shift_end,
  shift_type,
  break_duration,
  is_published
) VALUES (
  'employee-uuid-here',
  CURRENT_DATE,
  '09:00:00',
  '17:00:00',
  'regular',
  60, -- 1 jam break
  true
);
```

3. **Setup Cafe Location** (jika belum ada):
```sql
INSERT INTO system_settings (category, key, value)
VALUES (
  'cafe',
  'location',
  '{"lat": -6.7063803, "lng": 108.5619729, "radius": 200}'::jsonb
)
ON CONFLICT (category, key) DO UPDATE
SET value = EXCLUDED.value;
```

### Skenario Testing

#### Skenario 1: Clock In Tepat Waktu
**Setup**:
- Shift start: 09:00:00
- Clock in time: 09:10:00 (dalam 15 menit threshold)

**Expected Result**:
- `status`: "present"
- `late_minutes`: 0
- Success message: "Clock in berhasil! Tepat waktu."

---

#### Skenario 2: Clock In Terlambat
**Setup**:
- Shift start: 09:00:00
- Clock in time: 09:20:00 (20 menit terlambat)

**Expected Result**:
- `status`: "late"
- `late_minutes`: 20
- Success message: "Clock in berhasil! (Terlambat 20 menit)"
- UI menampilkan: "⚠️ Terlambat 20 menit"

---

#### Skenario 3: Clock Out Normal (Tidak Lembur)
**Setup**:
- Shift: 09:00 - 17:00 (8 jam)
- Break: 60 menit
- Clock in: 09:00:00
- Clock out: 17:00:00

**Expected Result**:
- `regular_hours`: 7.0 (8 jam - 1 jam break)
- `overtime_hours`: 0
- `total_hours`: 7.0
- Success message: "Clock out berhasil!"

---

#### Skenario 4: Lembur < 2 Jam (Auto-approved)
**Setup**:
- Shift: 09:00 - 17:00
- Clock in: 09:00:00
- Clock out: 18:30:00 (1.5 jam setelah shift)

**Expected Result**:
- `regular_hours`: 7.0
- `overtime_hours`: 1.5
- `overtime_approved`: false
- Response: `overtime.autoApproved`: true
- Success message: "Clock out berhasil! Lembur 1.5 jam (otomatis disetujui)."
- UI: "⏳ Lembur: 1.5 jam (otomatis)"

---

#### Skenario 5: Lembur > 2 Jam Tanpa Approval
**Setup**:
- Shift: 09:00 - 17:00
- Clock in: 09:00:00
- Clock out: 20:00:00 (3 jam setelah shift)
- Tidak ada overtime request

**Expected Result**:
- `regular_hours`: 7.0
- `overtime_hours`: 3.0
- `overtime_approved`: false
- Response: `overtime.needsApproval`: true
- Success message: "Clock out berhasil! Lembur 3.0 jam menunggu persetujuan owner."
- UI: "⏳ Lembur: 3.0 jam (menunggu persetujuan)"

---

#### Skenario 6: Lembur > 2 Jam Dengan Approval
**Setup**:
1. Buat overtime request:
```sql
INSERT INTO overtime_requests (
  employee_id,
  date,
  start_time,
  end_time,
  reason,
  status,
  approved_at
) VALUES (
  'employee-uuid',
  CURRENT_DATE,
  '17:00:00',
  '20:00:00',
  'Project deadline',
  'approved',
  NOW()
);
```

2. Clock in: 09:00:00
3. Clock out: 20:00:00

**Expected Result**:
- `regular_hours`: 7.0
- `overtime_hours`: 3.0
- `overtime_approved`: true
- Response: `overtime.approved`: true
- Success message: "Clock out berhasil! Lembur 3.0 jam (disetujui)."
- UI: "✓ Lembur: 3.0 jam"

---

#### Skenario 7: Pulang Lebih Awal
**Setup**:
- Shift: 09:00 - 17:00
- Clock in: 09:00:00
- Clock out: 16:30:00 (30 menit lebih awal)

**Expected Result**:
- `regular_hours`: 6.5 (total kerja dikurangi break)
- `early_leave_minutes`: 30
- Success message: "Clock out berhasil! Anda pulang 30 menit lebih awal."
- UI: "⚠️ Pulang 30 menit lebih awal"

---

#### Skenario 8: Clock In Tanpa Jadwal
**Setup**:
- Tidak ada shift schedule untuk hari ini

**Expected Result**:
- Error: "Anda tidak memiliki jadwal shift hari ini"
- HTTP Status: 400

---

#### Skenario 9: Clock In Terlalu Jauh
**Setup**:
- Lokasi karyawan > 200m dari cafe

**Expected Result**:
- Error: "Anda terlalu jauh dari cafe (XXXm). Maksimal 200m."
- HTTP Status: 400

---

### Testing dengan cURL

#### Clock In Test:
```bash
# Get token first (login)
TOKEN="your-jwt-token-here"

# Clock in
curl -X POST http://localhost:3001/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": -6.7063803,
    "longitude": 108.5619729,
    "distance": 10.5
  }'
```

#### Clock Out Test:
```bash
# Clock out
curl -X POST http://localhost:3001/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": -6.7063803,
    "longitude": 108.5619729,
    "distance": 10.5
  }'
```

#### Get Today's Attendance:
```bash
curl -X GET http://localhost:3001/api/attendance/today \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Migration Notes

### Breaking Changes:
❌ **Field `work_hours` dihapus** - Field ini tidak pernah ada di database schema

✅ **Field baru ditambahkan**:
- `scheduled_in`, `scheduled_out` - Dari shift_schedules
- `late_minutes` - Kalkulasi keterlambatan
- `overtime_hours` - Kalkulasi lembur terpisah
- `early_leave_minutes` - Kalkulasi pulang cepat

### Data Migration:
Tidak perlu migration karena ini adalah perbaikan bug. Sistem sekarang menggunakan field yang benar sesuai schema database.

---

## 6. Business Rules Summary

### Keterlambatan:
- **Threshold**: 15 menit setelah scheduled_in
- **Status**: "late" jika terlambat > 15 menit
- **Pencatatan**: Dicatat dalam `late_minutes`

### Lembur:
- **< 2 jam**: Otomatis tercatat, tidak perlu approval
- **> 2 jam**:
  - Harus ada overtime_request dengan status "approved"
  - Jika tidak ada approval, lembur tetap tercatat tapi `overtime_approved = false`
  - Owner harus approve di sistem

### Jam Kerja:
- **Regular Hours**: Maksimal sesuai scheduled hours, dikurangi break
- **Total Hours**: Regular hours + overtime hours
- **Break**: Dikurangi dari total waktu kerja

### Validasi:
- Harus ada shift schedule untuk hari ini
- Harus dalam radius cafe (default 200m)
- Hanya bisa clock in 1x per hari
- Harus clock in sebelum bisa clock out
- Hanya bisa clock out 1x per hari

---

## 7. Future Enhancements

Beberapa fitur yang bisa ditambahkan:
1. **Break Tracking**: Clock break start/end
2. **Notification**: Telegram notification untuk keterlambatan/lembur
3. **Report**: Monthly attendance report dengan overtime summary
4. **Auto-overtime**: Create overtime request otomatis jika > 2 jam
5. **Approval Workflow**: UI untuk owner approve overtime dari owner-dashboard

---

## 8. Files Modified

1. `/apps/employee-portal/src/app/api/attendance/clock-in/route.ts`
   - Tambah validasi shift schedule
   - Tambah kalkulasi keterlambatan
   - Fix format lokasi PostgreSQL POINT

2. `/apps/employee-portal/src/app/api/attendance/clock-out/route.ts`
   - Tambah kalkulasi overtime dengan aturan 2 jam
   - Tambah validasi overtime request
   - Tambah kalkulasi early leave
   - Fix field `regular_hours` dan `total_hours` (hapus `work_hours`)

3. `/apps/employee-portal/src/app/(auth)/attendance/page.tsx`
   - Update interface AttendanceRecord
   - Tambah display late minutes
   - Tambah display overtime info
   - Tambah display early leave
   - Update success messages
   - Update info box

---

## Contact

Untuk pertanyaan atau issue terkait sistem attendance:
- Check dokumentasi ini terlebih dahulu
- Review test scenarios yang sudah disediakan
- Lihat console logs untuk debugging

---

**Last Updated**: 2025-11-04
**Version**: 2.0.0
