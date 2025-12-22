import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Music, Play, Pause, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  previewUrl: string | null;
  duration: number;
  spotifyUrl: string;
}

interface SpotifyMusicPickerProps {
  onSelect: (track: SpotifyTrack) => void;
  onClose: () => void;
  selectedTrackId?: string;
}

export function SpotifyMusicPicker({
  onSelect,
  onClose,
  selectedTrackId,
}: SpotifyMusicPickerProps) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const searchTracks = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setTracks([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotify-search", {
        body: { query: searchQuery, limit: 20 },
      });

      if (error) throw error;
      setTracks(data?.tracks || []);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchTracks(value);
    }, 500);
  };

  const togglePlay = (track: SpotifyTrack) => {
    if (!track.previewUrl) return;

    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(track.id);
    }
  };

  const handleSelect = (track: SpotifyTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onSelect(track);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const playableTracks = tracks.filter((t) => Boolean(t.previewUrl));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-0 overflow-hidden">
        <DialogDescription className="sr-only">
          Busca canciones disponibles con preview de 30 segundos y selecciónalas para tu historia.
        </DialogDescription>
        <div className="flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-foreground" />
              <DialogTitle className="font-semibold">Buscar en Spotify</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Buscar canciones, artistas..."
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : query && playableTracks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <p>No hay canciones con preview para esta búsqueda.</p>
                <p className="text-xs">
                  Spotify ya no ofrece preview para muchas canciones; prueba con otra búsqueda.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {playableTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedTrackId === track.id
                        ? "bg-primary/10 border border-primary/30"
                        : ""
                    }`}
                    onClick={() => handleSelect(track)}
                  >
                    {track.albumArt ? (
                      <img
                        src={track.albumArt}
                        alt={track.album}
                        className="w-12 h-12 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Music className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(track.duration)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(track);
                        }}
                      >
                        {playingId === track.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {query && playableTracks.length > 0 && (
            <div className="p-3 border-t border-border text-center text-xs text-muted-foreground">
              Mostrando {playableTracks.length} canciones con preview (30s)
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
