import { ManageRoomTypeClient } from "./_components/manage-room-type-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ManageRoomTypePage({ params }: PageProps) {
    const { id } = await params;

    return (
        <div className="flex-1 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
            <ManageRoomTypeClient roomTypeId={id} />
        </div>
    );
}
