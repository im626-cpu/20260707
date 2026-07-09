-- CreateEnum
CREATE TYPE "MeetupStatus" AS ENUM ('RECRUITING', 'MATCHED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REMOVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "schoolEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meetup" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "locationBuilding" TEXT NOT NULL,
    "locationDetail" TEXT NOT NULL,
    "mealTimeStart" TIMESTAMP(3) NOT NULL,
    "mealTimeEnd" TIMESTAMP(3) NOT NULL,
    "storeName" TEXT NOT NULL,
    "menuDescription" TEXT NOT NULL,
    "deliveryFee" INTEGER NOT NULL,
    "minOrderAmount" INTEGER NOT NULL,
    "status" "MeetupStatus" NOT NULL DEFAULT 'RECRUITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expectedAmount" INTEGER NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolEmail_key" ON "User"("schoolEmail");

-- CreateIndex
CREATE INDEX "Meetup_status_idx" ON "Meetup"("status");

-- CreateIndex
CREATE INDEX "Meetup_hostId_idx" ON "Meetup"("hostId");

-- CreateIndex
CREATE INDEX "Participation_meetupId_status_idx" ON "Participation"("meetupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_meetupId_userId_key" ON "Participation"("meetupId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_meetupId_createdAt_idx" ON "ChatMessage"("meetupId", "createdAt");

-- AddForeignKey
ALTER TABLE "Meetup" ADD CONSTRAINT "Meetup_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
