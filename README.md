# 🏃 NexaFit - Android App

Personal health tracking app untuk kalori, workout, tidur, dan defisit kalori diet.

## Tech Stack
- **Kotlin** + **Jetpack Compose** (Material 3)
- **Navigation Compose** — bottom navigation
- **DataStore Preferences** + **Gson** — penyimpanan data lokal
- **ViewModel + StateFlow** — manajemen state

## Fitur
| Fitur | Deskripsi |
|-------|-----------|
| 📊 Overview | Dashboard ringkasan harian + grafik 7 hari |
| 🥗 Kalori | Catat makanan, makro (protein/karbo/lemak), quick-add |
| 🏋️ Workout | 9 tipe olahraga, estimasi kalori terbakar |
| 🌙 Tidur | Tracker jam tidur, kualitas, grafik pola tidur |
| ⚙️ Target | Profil (BB/TB/usia), kalkulasi BMR & TDEE otomatis |

## Cara Setup di Android Studio

### Prasyarat
- Android Studio Hedgehog (2023.1.1) atau lebih baru
- JDK 11+
- Android SDK 26+

### Langkah-langkah

1. **Buka Android Studio**
2. **File → Open** → pilih folder `NexaFit`
3. Tunggu Gradle sync selesai (butuh internet pertama kali)
4. **Run** → pilih emulator atau device fisik (min Android 8.0)
5. Klik tombol ▶️ Run

### Atau build APK langsung:
```bash
cd NexaFit
./gradlew assembleDebug
# APK ada di: app/build/outputs/apk/debug/app-debug.apk
```

## Struktur Project
```
app/src/main/java/com/nexafit/app/
├── MainActivity.kt          # Entry point + Navigation
├── data/
│   ├── Models.kt            # Data classes (Food, Workout, Sleep, Profile)
│   └── HealthRepository.kt  # DataStore persistence
├── viewmodel/
│   └── HealthViewModel.kt   # Business logic + state
└── ui/
    ├── Theme.kt             # Warna & tema
    ├── components/
    │   └── Components.kt    # Reusable UI components
    └── screens/
        ├── OverviewScreen.kt
        ├── KaloriScreen.kt
        ├── WorkoutScreen.kt
        ├── TidurScreen.kt
        └── ProfilScreen.kt
```

## Cara Extend / Modifikasi

### Tambah makanan ke daftar cepat
Edit `quickFoods` di `data/Models.kt`:
```kotlin
FoodEntry(name = "Bubur ayam", gram = 200f, calPer100g = 65f, proteinPer100g = 4f, ...)
```

### Tambah tipe workout
Edit `workoutTypes` di `data/Models.kt`:
```kotlin
Triple("Lompat tali", "⛹️", 10f)  // (nama, emoji, kalori/menit)
```

### Ganti warna tema
Edit `ui/Theme.kt` — ubah nilai `Green`, `Blue`, dll.

## Kalkulasi yang Digunakan

**BMR (Harris-Benedict):**
- Pria: 88.36 + (13.4 × BB) + (4.8 × TB) - (5.7 × Usia)
- Wanita: 447.6 + (9.2 × BB) + (3.1 × TB) - (4.3 × Usia)

**TDEE:** BMR × Faktor aktivitas

**Defisit:** BMR + Kalori workout - Kalori makan

**Penurunan berat:** Defisit × 7 ÷ 7.700 (kg/minggu)

## GitHub Pages Owner Dashboard

This package includes a GitHub Pages-ready owner dashboard. See:

```text
GITHUB_PAGES_DEPLOY.md
```

Dashboard folder:

```text
owner-dashboard
```

Deployment workflow:

```text
.github/workflows/deploy-dashboard.yml
```
