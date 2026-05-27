@echo off
title Enterprise AI Setup

echo ==========================================
echo Enterprise AI Assistant - First Time Setup
echo ==========================================

echo Checking Python...
python --version
if %errorlevel% neq 0 (
    echo Python is not installed.
    pause
    exit
)

echo Checking Docker...
docker --version
if %errorlevel% neq 0 (
    echo Docker Desktop is not installed.
    pause
    exit
)

echo Checking Ollama...
ollama --version
if %errorlevel% neq 0 (
    echo Ollama is not installed.
    pause
    exit
)

echo Creating virtual environment...
python -m venv venv

echo Installing Python dependencies...
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt

echo Running migrations...
venv\Scripts\python.exe manage.py migrate

echo Pulling AI model...
ollama pull llama3:8b

echo Starting Docker containers...
docker rm -f qdrant >nul 2>&1
docker rm -f redis-server >nul 2>&1

docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
docker run -d --name redis-server -p 6379:6379 redis

echo ==========================================
echo Setup Completed Successfully
echo ==========================================

pause