import { Star, TrendingUp } from "lucide-react";

interface Creator {
  id: string;
  name: string;
  avatar: string;
  role: string;
  videosCompleted: number;
  rating: number;
  trend: number;
}

const creators: Creator[] = [
  { 
    id: "1", 
    name: "María García", 
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    role: "Creadora UGC",
    videosCompleted: 24,
    rating: 4.9,
    trend: 12
  },
  { 
    id: "2", 
    name: "Carlos López", 
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    role: "Editor Senior",
    videosCompleted: 18,
    rating: 4.8,
    trend: 8
  },
  { 
    id: "3", 
    name: "Ana Martínez", 
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    role: "Creadora UGC",
    videosCompleted: 15,
    rating: 4.7,
    trend: 15
  },
];

export function TopCreators() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-card-foreground mb-4">Top Creadores</h3>
      
      <div className="space-y-4">
        {creators.map((creator, index) => (
          <div key={creator.id} className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={creator.avatar} 
                alt={creator.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
              />
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {index + 1}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-card-foreground truncate">
                {creator.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {creator.role} • {creator.videosCompleted} videos
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span className="text-sm font-medium text-card-foreground">{creator.rating}</span>
              </div>
              <div className="flex items-center gap-0.5 text-success">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">+{creator.trend}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
