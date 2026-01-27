import GameClient from "@/components/game/game-client";

export default function GamePage({ params }: { params: { id: string } }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-black">
        <GameClient gameId={params.id} />
    </div>
  );
}
