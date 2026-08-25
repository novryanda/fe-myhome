import RoomHistoryDetailClient from "../_components/room-history-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RoomHistoryDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-6xl flex-1 space-y-4 p-4 pt-6 md:p-8">
      <RoomHistoryDetailClient roomId={id} />
    </div>
  );
}
