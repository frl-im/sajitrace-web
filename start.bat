@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Pasang Node.js 20 atau lebih baru, lalu buka kembali file ini.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Memasang dependency SajiTrace...
  call npm install
  if errorlevel 1 (
    echo Instalasi gagal. Periksa koneksi internet dan coba jalankan npm install secara manual.
    pause
    exit /b 1
  )
)
call npm run dev
pause
