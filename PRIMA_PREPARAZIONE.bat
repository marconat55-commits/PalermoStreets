@echo off
setlocal
cd /d "%~dp0"
title Palermo Streets - Prima preparazione

echo ============================================================
echo  PALERMO STREETS - PRIMA PREPARAZIONE
echo ============================================================

where node >nul 2>nul || goto :node_error
where npm.cmd >nul 2>nul || goto :npm_error

echo [1/2] Preparazione delle dipendenze...
call npm.cmd install || goto :error

echo [2/2] Controllo completo...
call npm.cmd run check || goto :error

echo.
echo PREPARAZIONE COMPLETATA.
echo Ora puoi usare GIOCA_PALERMO_STREETS.bat.
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
echo PREPARAZIONE INTERROTTA PER UN ERRORE.
pause
exit /b 1
