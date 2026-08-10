@echo off
set "GODOT=%~dp0..\Tools\Godot-4.7.1\Godot_v4.7.1-stable_win64.exe"
if not exist "%GODOT%" set "GODOT=%~dp0..\..\Tools\Godot-4.7.1\Godot_v4.7.1-stable_win64.exe"
if not exist "%GODOT%" (
  echo Godot non trovato in: %GODOT%
  pause
  exit /b 1
)
start "Palermo Streets Godot" "%GODOT%" --editor --path "%~dp0"
