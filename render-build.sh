#!/usr/bin/env bash
# Salir si hay un error
set -o errexit

# Instalar dependencias de Node
npm install

# Comando para instalar Google Chrome en el servidor de Render
echo "Instalando Google Chrome..."
apt-get update && apt-get install -y google-chrome-stable
