#!/bin/bash

# MCT Project - Quick Start Guide

echo "=========================================="
echo "MCT - Student Management Platform v2.0"
echo "=========================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v14+"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi
echo "✅ npm: $(npm --version)"

if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please ensure PostgreSQL server is running."
else
    echo "✅ PostgreSQL client available"
fi

echo ""
echo "=========================================="
echo "🗄️  DATABASE SETUP"
echo "=========================================="

# Create database and run schema
echo "Creating database: mct_project"
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'mct_project'" | grep -q 1 || \
    psql -U postgres -c "CREATE DATABASE mct_project"

echo "Running migrations..."
psql -U postgres -d mct_project -f backend/database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup complete!"
else
    echo "⚠️  Database setup had issues. Please check manually."
fi

echo ""
echo "=========================================="
echo "🔧 BACKEND SETUP"
echo "=========================================="

cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mct_project
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=mct_jwt_secret_key_change_in_production_2024
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
EOF
    echo "✅ .env created (edit if needed)"
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Backend dependencies installed"
    else
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
else
    echo "✅ Backend dependencies already installed"
fi

cd ..

echo ""
echo "=========================================="
echo "⚛️  FRONTEND SETUP"
echo "=========================================="

cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Frontend dependencies installed"
    else
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
else
    echo "✅ Frontend dependencies already installed"
fi

cd ..

echo ""
echo "=========================================="
echo "✨ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "🚀 TO START THE APPLICATION:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && npm run dev"
echo "  (runs on http://localhost:5000)"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend && npm run dev"
echo "  (runs on http://localhost:5173)"
echo ""
echo "🔐 DEFAULT CREDENTIALS:"
echo "  Coordinator:"
echo "    MSSID: MSS0000000"
echo "    Password: password"
echo ""
echo "📚 DOCUMENTATION:"
echo "  See README.md for detailed API endpoints and features"
echo ""
echo "🧪 QUICK TESTING:"
echo "  1. Open http://localhost:5173"
echo "  2. Try coordinator login (MSS0000000 / password)"
echo "  3. Or register as a new student (MSS + 7 digits)"
echo ""
