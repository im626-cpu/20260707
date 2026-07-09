CREATE TYPE "public"."MeetupStatus" AS ENUM('RECRUITING', 'MATCHED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ParticipationStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REMOVED');--> statement-breakpoint
CREATE TABLE "ChatMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"meetupId" text NOT NULL,
	"userId" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Meetup" (
	"id" text PRIMARY KEY NOT NULL,
	"hostId" text NOT NULL,
	"locationBuilding" text NOT NULL,
	"locationDetail" text NOT NULL,
	"mealTimeStart" timestamp (3) NOT NULL,
	"mealTimeEnd" timestamp (3) NOT NULL,
	"storeName" text NOT NULL,
	"menuDescription" text NOT NULL,
	"deliveryFee" integer NOT NULL,
	"minOrderAmount" integer NOT NULL,
	"status" "MeetupStatus" DEFAULT 'RECRUITING' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Participation" (
	"id" text PRIMARY KEY NOT NULL,
	"meetupId" text NOT NULL,
	"userId" text NOT NULL,
	"expectedAmount" integer NOT NULL,
	"status" "ParticipationStatus" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"schoolEmail" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_meetupId_Meetup_id_fk" FOREIGN KEY ("meetupId") REFERENCES "public"."Meetup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Meetup" ADD CONSTRAINT "Meetup_hostId_User_id_fk" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_meetupId_Meetup_id_fk" FOREIGN KEY ("meetupId") REFERENCES "public"."Meetup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ChatMessage_meetupId_createdAt_idx" ON "ChatMessage" USING btree ("meetupId","createdAt");--> statement-breakpoint
CREATE INDEX "Meetup_status_idx" ON "Meetup" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Meetup_hostId_idx" ON "Meetup" USING btree ("hostId");--> statement-breakpoint
CREATE UNIQUE INDEX "Participation_meetupId_userId_key" ON "Participation" USING btree ("meetupId","userId");--> statement-breakpoint
CREATE INDEX "Participation_meetupId_status_idx" ON "Participation" USING btree ("meetupId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "User_schoolEmail_key" ON "User" USING btree ("schoolEmail");