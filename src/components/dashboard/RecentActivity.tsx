import { cn } from "@/lib/utils";
import { Video, Upload, Check, Edit, MessageSquare } from "lucide-react";

interface Activity {
  id: string;
  type: "video" | "upload" | "complete" | "edit" | "comment";
  user: string;
  action: string;
  target: string;
  time: string;
}

const activities: Activity[] = [
  { 
    id: "1", 
    type: "complete", 
    user: "María García", 
    action: "completó la edición de", 
    target: "Video Producto Skincare", 
    time: "Hace 5 min" 
  },
  { 
    id: "2", 
    type: "upload", 
    user: "Carlos López", 
    action: "subió contenido para", 
    target: "Campaña Navidad 2024", 
    time: "Hace 15 min" 
  },
  { 
    id: "3", 
    type: "video", 
    user: "Ana Martínez", 
    action: "inició grabación de", 
    target: "Review Tech Gadgets", 
    time: "Hace 1 hora" 
  },
  { 
    id: "4", 
    type: "comment", 
    user: "Cliente MarcaX", 
    action: "dejó comentarios en", 
    target: "Video Unboxing", 
    time: "Hace 2 horas" 
  },
  { 
    id: "5", 
    type: "edit", 
    user: "Pedro Ruiz", 
    action: "actualizó el guión de", 
    target: "Tutorial Maquillaje", 
    time: "Hace 3 horas" 
  },
];

const iconConfig = {
  video: { icon: Video, className: "bg-info/10 text-info" },
  upload: { icon: Upload, className: "bg-success/10 text-success" },
  complete: { icon: Check, className: "bg-success/10 text-success" },
  edit: { icon: Edit, className: "bg-warning/10 text-warning" },
  comment: { icon: MessageSquare, className: "bg-primary/10 text-primary" },
};

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-card-foreground mb-4">Actividad Reciente</h3>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const config = iconConfig[activity.type];
          const Icon = config.icon;
          
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.className
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground">
                  <span className="font-medium">{activity.user}</span>
                  {" "}{activity.action}{" "}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
