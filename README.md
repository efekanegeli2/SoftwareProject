# English Proficiency Assessment System

A production-ready microservices-based English proficiency assessment system with three distinct services.

## Architecture

- **Server** (Node.js + Express): Main API, Authentication, Database, Dashboard Logic
- **AI Service** (Python + FastAPI): Dedicated AI Scoring Engine
- **Client** (React + Vite + Tailwind CSS): Frontend with Student, Teacher, and Admin panels

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

> Python / AI service is **optional**. This project works fully without it.

### Installation Steps


1. **Install dependencies (server + client):**
```bash
npm run install:all
```
2. **Install database (Use this commands only on the first boot):**
```bash
cd server
npm install
npx prisma migrate dev
npx prisma generate
```
3. **Start (server + client):**
```bash
npm run dev
```

This will start:
- Server on http://localhost:3000
- Client on http://localhost:5173

### Optional: AI Service
If you also want to run the Python service:
```bash
npm run install:ai
npm run dev:all
```

## Services

- **Server**: http://localhost:3000
- **Client**: http://localhost:5173

## Usage

### Quick Demo Login
The login page provides quick demo buttons for each role:
- **Student**: Click "Student" button to auto-login as a student
- **Teacher**: Click "Teacher" button to auto-login as a teacher
- **Admin**: Click "Admin" button to auto-login as an admin

Demo credentials:
- **Student**: `student@demo.com` / `demo123`
- **Teacher**: `teacher@demo.com` / `demo123`
- **Admin**: `admin@demo.com` / `demo123`

### Manual Registration/Login
You can also register new users manually:
- Email: Any valid email format
- Password: Any password (minimum 6 characters recommended)
- Role: Select from STUDENT, TEACHER, or ADMIN

## Features

### Student Panel
- Take English proficiency assessment
- 15 Grammar/Vocabulary multiple-choice questions
- Listening passage + 5 questions
- Writing task (topic changes)
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
- `GET /api/exam/generate` - Generate exam content (Student only)
- `POST /api/exam/evaluate` - Submit answers + get score (Student only)

### Dashboard
- `GET /api/dashboard/profile` - Student profile + history (Student)
- `GET /api/dashboard/teacher` - Get all students (Teacher/Admin)
- `GET /api/dashboard/teacher/student/:id` - Get student details (Teacher/Admin)
- `GET /api/dashboard/admin` - Get system overview (Admin only)
- `DELETE /api/dashboard/admin/user/:id` - Delete user (Admin only)

## Architecture Notes

- **Storage (no DB):** The server stores users + exam results in `server/data/store.json`.
- **Authentication:** JWT-based authentication.
- **CORS:** Enabled for all origins (configure for production).
# SoftwareProject
