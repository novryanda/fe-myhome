import PublicRoomDetailClient from "./_components/public-room-detail-client";
import { PublicFooter } from "../../_components/public-footer";
import { PublicHeader } from "../../_components/public-header";

export default async function RoomTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <PublicRoomDetailClient roomId={id} />
      </main>
      <PublicFooter />
    </div>
  );
}
