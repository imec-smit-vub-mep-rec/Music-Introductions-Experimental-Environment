"use client";
import { GenreSelectionScreen } from "@/components/screens/GenreSelectionScreen";
import { experimentConfig } from "@/lib/config";

export default function GenrePage() {
  return (
    <div>
      <GenreSelectionScreen
        genres={experimentConfig.genres}
        selectedGenre={null}
        onSelectGenre={() => {}}
        onStart={() => {}}
      />
    </div>
  );
}
