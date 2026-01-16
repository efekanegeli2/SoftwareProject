-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "emailVerifiedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "mcqQuestionIds" TEXT,
    "listeningScenarioId" INTEGER,
    "writingTopicId" INTEGER,
    "speakingSetId" INTEGER,
    "mcqAnswers" TEXT,
    "listeningAnswers" TEXT,
    "writingAnswer" TEXT,
    "speakingTranscript" TEXT,
    "speakingScore" INTEGER,
    CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamAttempt_listeningScenarioId_fkey" FOREIGN KEY ("listeningScenarioId") REFERENCES "ListeningScenario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExamAttempt_writingTopicId_fkey" FOREIGN KEY ("writingTopicId") REFERENCES "WritingTopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExamAttempt_speakingSetId_fkey" FOREIGN KEY ("speakingSetId") REFERENCES "SpeakingSet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActiveExam" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attemptId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mcqCorrect" TEXT NOT NULL,
    "listeningCorrect" TEXT NOT NULL,
    CONSTRAINT "ActiveExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveExam_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attemptId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "grammarScore" INTEGER NOT NULL,
    "writingScore" INTEGER NOT NULL,
    "speakingScore" INTEGER NOT NULL,
    "listeningScore" INTEGER NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'A1 (Beginner)',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McqQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct" TEXT NOT NULL,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ListeningScenario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topic" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ListeningQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scenarioId" INTEGER NOT NULL,
    "qid" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct" TEXT NOT NULL,
    CONSTRAINT "ListeningQuestion_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ListeningScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WritingTopic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SpeakingSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SpeakingPrompt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "SpeakingPrompt_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SpeakingSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheatingEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attemptId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheatingEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudioResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attemptId" INTEGER NOT NULL,
    "promptIndex" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "durationMs" INTEGER,
    "asrText" TEXT,
    "asrConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudioResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveExam_attemptId_key" ON "ActiveExam"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_attemptId_key" ON "ExamResult"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningQuestion_scenarioId_qid_key" ON "ListeningQuestion"("scenarioId", "qid");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
