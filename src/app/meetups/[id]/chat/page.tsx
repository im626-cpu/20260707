import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ChatWindow from "./ChatWindow";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const meetup = await prisma.meetup.findUnique({
    where: { id },
    include: {
      host: true,
      participations: { where: { status: "APPROVED" }, include: { user: true } },
    },
  });

  if (!meetup) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/meetups/${id}/chat`);

  const isApprovedParticipant = meetup.participations.some((p) => p.userId === user.id);
  const isHost = meetup.hostId === user.id;

  if (meetup.status !== "MATCHED" || (!isHost && !isApprovedParticipant)) {
    notFound();
  }

  const messages = await prisma.chatMessage.findMany({
    where: { meetupId: id },
    orderBy: { createdAt: "asc" },
  });

  const participants = [
    { id: meetup.host.id, nickname: meetup.host.nickname },
    ...meetup.participations
      .filter((p) => p.userId !== meetup.host.id)
      .map((p) => ({ id: p.user.id, nickname: p.user.nickname })),
  ];

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-lg flex-col px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">{meetup.storeName} 채팅방</h1>
      <ChatWindow
        meetupId={id}
        currentUserId={user.id}
        participants={participants}
        initialMessages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          userId: m.userId,
        }))}
      />
    </main>
  );
}
