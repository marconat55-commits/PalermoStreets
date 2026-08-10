@echo off
setlocal
set "GODOT=C:\Users\Utente\Documents\PIXIES\Tools\Godot-4.7.1\Godot_v4.7.1-stable_win64.exe"
if not exist "%GODOT%" set "GODOT=%~dp0..\Tools\Godot-4.7.1\Godot_v4.7.1-stable_win64.exe"
if not exist "%GODOT%" set "GODOT=%~dp0..\..\Tools\Godot-4.7.1\Godot_v4.7.1-stable_win64.exe"
if not exist "%GODOT%" (
  echo ERRORE: Godot non trovato.
  echo Cartella attesa: C:\Users\Utente\Documents\PIXIES\Tools\Godot-4.7.1
  pause
  exit /b 1
)
start "" /D "%~dp0" "%GODOT%" --editor --path "%~dp0" --rendering-method gl_compatibility
exit /b 0
