# English Proficiency Assessment System

A production-ready microservices-based English proficiency assessment system with three distinct services.

## Architecture

- **Server** (Node.js + Express): Main API, Authentication, Database, Dashboard Logic
- **AI Service** (Python + FastAPI): Dedicated AI Scoring Engine
- **Client** (React + Vite + Tailwind CSS): Frontend with Student, Teacher, and Admin panels

## Setup

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- npm or yarn

### Installation Steps

1. **Install all dependencies:**
```bash
npm run install:all
```

2. **Set up environment variables:**
   - Navigate to the `server` directory
   - Create a `.env` file with the following content:
   ```
   DATABASE_URL="file:./prisma/dev.db"
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   AI_SERVICE_URL="http://localhost:8001"
   PORT=3000
   ```

3. **Initialize the database:**
```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

4. **Start all services:**
```bash
npm run dev
```

This will start:
- Server on http://localhost:3000
- AI Service on http://localhost:8001
- Client on http://localhost:5173

## Services

- **Server**: http://localhost:3000
- **AI Service**: http://localhost:8001
- **Client**: http://localhost:5173

## Usage

### Quick Demo Login
The login page provides quick demo buttons for each role:
- **Student**: Click "Student" button to auto-login as a student
- **Teacher**: Click "Teacher" button to auto-login as a teacher
- **Admin**: Click "Admin" button to auto-login as an admin

### Manual Registration/Login
You can also register new users manually:
- Email: Any valid email format
- Password: Any password (minimum 6 characters recommended)
- Role: Select from STUDENT, TEACHER, or ADMIN

## Features

### Student Panel
- Take English proficiency assessment
- 20 Multiple Choice Questions
- Writing task (essay on "Advantages of AI")
- Speaking task (mock recording)
- View results with CEFR level and feedback

### Teacher Panel
- View all students and their exam history
- View detailed answers for each student
- See scores and CEFR levels

### Admin Panel
- System overview with statistics
- User management (view and delete users)
- View recent exams across all students

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Exam
- `GET /exam/generate` - Generate exam content (Student only)
- `POST /exam/submit` - Submit exam answers (Student only)

### Dashboard
- `GET /dashboard/teacher` - Get all students (Teacher/Admin)
- `GET /dashboard/teacher/student/:id` - Get student details (Teacher/Admin)
- `GET /dashboard/admin` - Get system overview (Admin only)
- `DELETE /dashboard/admin/user/:id` - Delete user (Admin only)

## Architecture Notes

- **Microservices**: Server and AI Service communicate via HTTP
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT-based authentication
- **CORS**: Enabled for all origins (configure for production)
- **Scoring**: AI Service calculates scores with weighted components (MCQ 40%, Writing 35%, Speaking 25%)
