import RoomDetailClient from "../_components/room-detail-client";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RoomDetailPage({ params }: PageProps) {
    const { id } = await params;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
            <RoomDetailClient roomId={id} />
        </div>
    );
}
