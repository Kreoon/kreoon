import { ImageIcon, Video, Lightbulb } from 'lucide-react';
import { CampaignMediaUpload } from './CampaignMediaUpload';

export interface CampaignMediaData {
  coverImageUrl: string;
  coverMediaId: string;
  videoBriefUrl: string;
  videoBriefMediaId: string;
  videoBriefThumbnailUrl: string;
}

interface CampaignStepMediaProps {
  data: CampaignMediaData;
  campaignId?: string;
  onChange: <K extends keyof CampaignMediaData>(field: K, value: CampaignMediaData[K]) => void;
  onTempFile?: (mediaType: 'cover_image' | 'video_brief', file: File) => void;
}

export function CampaignStepMedia({ data, campaignId, onChange, onTempFile }: CampaignStepMediaProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Media de la Campana</h2>
        <p className="text-gray-400 text-sm mt-1">
          Agrega imagenes y videos para que los creadores entiendan mejor tu campana.
        </p>
      </div>

      {/* Cover Image */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Imagen de Portada</h3>
          <span className="text-xs text-gray-500">(Opcional)</span>
        </div>
        <p className="text-gray-400 text-xs">
          Se muestra como la imagen principal de tu campana en el feed. Recomendado 16:9.
        </p>
        <CampaignMediaUpload
          campaignId={campaignId}
          mediaType="cover_image"
          currentUrl={data.coverImageUrl || undefined}
          onUpload={(url, mediaId) => {
            onChange('coverImageUrl', url);
            onChange('coverMediaId', mediaId);
          }}
          onRemove={() => {
            onChange('coverImageUrl', '');
            onChange('coverMediaId', '');
          }}
          onTempFile={(file) => onTempFile?.('cover_image', file)}
        />
      </div>

      {/* Video Brief */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Video Explicativo</h3>
          <span className="text-xs text-gray-500">(Opcional)</span>
        </div>
        <p className="text-gray-400 text-xs">
          Un video corto explicando lo que buscas. Los creadores valoran mucho este tipo de brief visual.
        </p>
        <CampaignMediaUpload
          campaignId={campaignId}
          mediaType="video_brief"
          currentUrl={data.videoBriefUrl || undefined}
          onUpload={(url, mediaId, thumbnailUrl) => {
            onChange('videoBriefUrl', url);
            onChange('videoBriefMediaId', mediaId);
            onChange('videoBriefThumbnailUrl', thumbnailUrl || '');
          }}
          onRemove={() => {
            onChange('videoBriefUrl', '');
            onChange('videoBriefMediaId', '');
            onChange('videoBriefThumbnailUrl', '');
          }}
          onTempFile={(file) => onTempFile?.('video_brief', file)}
        />
      </div>

      {/* Tips */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-sm p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-medium">Consejos</span>
        </div>
        <ul className="text-gray-400 text-xs space-y-1.5 ml-6 list-disc">
          <li>Una buena imagen de portada aumenta las aplicaciones en un 40%</li>
          <li>Los videos breves (1-3 min) tienen mejor engagement de creadores</li>
          <li>Muestra ejemplos del estilo que buscas en el video</li>
          <li>Puedes agregar media ahora o despues de publicar</li>
        </ul>
      </div>
    </div>
  );
}
