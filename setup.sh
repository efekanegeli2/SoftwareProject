#!/bin/bash

echo "🚀 Setting up English Assessment System..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# NOTE: Prisma schema lives in ./prisma, so sqlite relative path resolves to ./prisma/dev.db
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
AI_SERVICE_URL="http://localhost:8001"
PORT=3000
EOF
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists"
fi

# Initialize database
echo "🗄️  Initializing database..."
npx prisma migrate dev --name init
npx prisma generate

cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd ai-service
if command -v pip3 &> /dev/null; then
    pip3 install -r requirements.txt
elif command -v pip &> /dev/null; then
    pip install -r requirements.txt
else
    echo "⚠️  Python pip not found. Please install Python dependencies manually:"
    echo "   cd ai-service && pip install -r requirements.txt"
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start all services, run:"
echo "  npm run dev"
echo ""
echo "Services will be available at:"
echo "  - Server: http://localhost:3000"
echo "  - AI Service: http://localhost:8001"
echo "  - Client: http://localhost:5173"
echo ""
