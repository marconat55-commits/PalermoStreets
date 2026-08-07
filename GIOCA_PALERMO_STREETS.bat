@echo off
setlocal
cd /d "%~dp0"
title Palermo Streets - PixiJS

echo ============================================================
echo  PALERMO STREETS - AVVIO GIOCO
echo ============================================================

where node >nul 2>nul || goto :node_error
where npm.cmd >nul 2>nul || goto :npm_error

if not exist "node_modules\pixi.js\package.json" (
  echo Prima preparazione del progetto...
  call npm.cmd install || goto :error
)

echo.
echo Il gioco sara disponibile all'indirizzo mostrato qui sotto.
echo Per chiuderlo, torna in questa finestra e premi CTRL+C.
echo.
call npm.cmd run dev -- --open
exit /b %errorlevel%

:node_error
echo ERRORE: Node.js non e disponibile.
echo Chiudi e riapri Visual Studio Code dopo l'installazione di Node.js.
pause
exit /b 1

:npm_error
echo ERRORE: npm.cmd non e disponibile.
pause
exit /b 1

:error
echo.
echo AVVIO INTERROTTO PER UN ERRORE.
pause
exit /b 1
