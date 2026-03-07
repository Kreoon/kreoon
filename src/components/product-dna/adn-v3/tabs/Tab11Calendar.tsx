/**
 * Tab11Calendar
 * Calendario de contenido de 30 días
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Video,
  Image,
  FileText,
  MessageSquare,
  Instagram,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentPost {
  day: number;
  platform: string;
  content_type: "video" | "image" | "carousel" | "text" | "story" | "reel";
  pillar: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  best_time: string;
  visual_description?: string;
}

interface CalendarData {
  strategy_overview: {
    posting_frequency: Record<string, number>;
    content_pillars: Array<{
      pillar: string;
      percentage: number;
      description: string;
    }>;
    weekly_rhythm: string;
  };
  posts: ContentPost[];
  themes_by_week: Array<{
    week: number;
    theme: string;
    focus: string;
    posts_count: number;
  }>;
}

interface Tab11CalendarProps {
  data: CalendarData | null | undefined;
}

const contentTypeIcons = {
  video: Video,
  image: Image,
  carousel: LayoutGrid,
  text: FileText,
  story: Instagram,
  reel: Video,
};

const contentTypeColors = {
  video: "bg-red-500/20 text-red-400 border-red-500/30",
  image: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  carousel: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  text: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  story: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  reel: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

function PostCard({ post, onCopy }: { post: ContentPost; onCopy: (text: string) => void }) {
  const Icon = contentTypeIcons[post.content_type] || FileText;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Día {post.day}
          </Badge>
          <Badge className={contentTypeColors[post.content_type]}>
            <Icon className="w-3 h-3 mr-1" />
            {post.content_type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{post.platform}</span>
          <span>•</span>
          <span>{post.best_time}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          {post.pillar}
        </Badge>

        <div className="space-y-2">
          <div className="p-2 rounded bg-primary/10 border-l-2 border-primary">
            <p className="text-sm font-medium">{post.hook}</p>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {post.caption}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {post.hashtags?.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs text-blue-400">
              #{tag}
            </span>
          ))}
          {post.hashtags?.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{post.hashtags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            {post.cta}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              onCopy(
                `${post.hook}\n\n${post.caption}\n\n${post.hashtags?.map((h) => `#${h}`).join(" ")}\n\n${post.cta}`
              )
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Tab11Calendar({ data }: Tab11CalendarProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (text: string, id?: number) => {
    await navigator.clipboard.writeText(text);
    if (id !== undefined) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const postsByWeek = useMemo(() => {
    if (!data?.posts) return {};
    const grouped: Record<number, ContentPost[]> = {};
    data.posts.forEach((post) => {
      const week = Math.ceil(post.day / 7);
      if (!grouped[week]) grouped[week] = [];
      grouped[week].push(post);
    });
    return grouped;
  }, [data?.posts]);

  const weeks = Object.keys(postsByWeek).map(Number).sort((a, b) => a - b);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin calendario</h3>
        <p className="text-sm text-muted-foreground">
          El calendario de 30 días se generará al completar el research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Posting Frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Frecuencia de Publicación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.strategy_overview?.posting_frequency || {}).map(
                ([platform, count]) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{platform}</span>
                    <Badge variant="secondary">{count}/semana</Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Pillars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pilares de Contenido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.strategy_overview?.content_pillars?.map((pillar, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{pillar.pillar}</span>
                    <span className="text-muted-foreground">
                      {pillar.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${pillar.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Rhythm */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ritmo Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.strategy_overview?.weekly_rhythm}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Themes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Temas Semanales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.themes_by_week?.map((week) => (
              <div
                key={week.week}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  currentWeek === week.week
                    ? "border-primary bg-primary/10"
                    : "hover:border-primary/50"
                )}
                onClick={() => setCurrentWeek(week.week)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Semana {week.week}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {week.posts_count} posts
                  </span>
                </div>
                <p className="font-medium text-sm mb-1">{week.theme}</p>
                <p className="text-xs text-muted-foreground">{week.focus}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Semana {currentWeek}:{" "}
                {data.themes_by_week?.find((w) => w.week === currentWeek)?.theme}
              </CardTitle>
              <CardDescription>
                {postsByWeek[currentWeek]?.length || 0} publicaciones programadas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek((prev) => Math.max(1, prev - 1))}
                disabled={currentWeek === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentWeek((prev) => Math.min(weeks.length, prev + 1))
                }
                disabled={currentWeek === weeks.length}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="border-l pl-2 ml-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="ml-1"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {postsByWeek[currentWeek]?.map((post, idx) => (
                <PostCard key={idx} post={post} onCopy={(text) => handleCopy(text, idx)} />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {postsByWeek[currentWeek]?.map((post, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="text-2xl font-bold">{post.day}</div>
                          <div className="text-xs text-muted-foreground">
                            {post.best_time}
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge className={contentTypeColors[post.content_type]}>
                              {post.content_type}
                            </Badge>
                            <Badge variant="outline">{post.platform}</Badge>
                            <Badge variant="secondary">{post.pillar}</Badge>
                          </div>
                          <div className="p-3 rounded bg-muted/50">
                            <p className="font-medium mb-2">{post.hook}</p>
                            <p className="text-sm text-muted-foreground">
                              {post.caption}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags?.map((tag, tagIdx) => (
                                <span key={tagIdx} className="text-xs text-blue-400">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  `${post.hook}\n\n${post.caption}\n\n${post.hashtags?.map((h) => `#${h}`).join(" ")}`,
                                  idx
                                )
                              }
                            >
                              {copiedId === idx ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copiar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
