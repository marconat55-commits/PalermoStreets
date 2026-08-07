@echo off
setlocal
cd /d "%~dp0"
title Palermo Streets - Controllo progetto

echo ============================================================
echo  PALERMO STREETS - CONTROLLO COMPLETO
echo ============================================================

where node >nul 2>nul || goto :node_error
where npm.cmd >nul 2>nul || goto :npm_error

if not exist "node_modules\pixi.js\package.json" (
  echo Prima preparazione del progetto...
  call npm.cmd install || goto :error
)

call npm.cmd run check || goto :error
echo.
echo TUTTI I CONTROLLI SONO PASSATI.
pause
exit /b 0

:node_error
echo ERRORE: Node.js non e disponibile.
pause
exit /b 1

:npm_error
echo ERRORE: npm.cmd non e disponibile.
pause
exit /b 1

:error
echo.
echo CONTROLLO INTERROTTO PER UN ERRORE.
pause
exit /b 1
