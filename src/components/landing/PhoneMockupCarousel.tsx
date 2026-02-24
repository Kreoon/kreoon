import { useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { FADE_IN_UP, useScrollAnimation } from '@/lib/animations';

const BUNNY_CDN_BASE = 'https://vz-78fcd769-050.b-cdn.net';

/** How many videos to fetch from DB (pool for randomization) */
const FETCH_POOL = 50;

interface PortfolioVideo {
  bunny_video_id: string;
  thumbnail_url: string | null;
  title: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PhoneFrame({ video }: { video: PortfolioVideo }) {
  return (
    <div className="relative mx-auto flex-shrink-0">
      {/* Phone bezel */}
      <div className="relative rounded-[2rem] border-[3px] border-neutral-800 bg-black p-1 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-16 h-4 bg-neutral-800 rounded-b-xl" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[1.7rem] bg-neutral-900" style={{ aspectRatio: '9/16' }}>
          <video
            src={`${BUNNY_CDN_BASE}/${video.bunny_video_id}/play_480p.mp4`}
            poster={video.thumbnail_url || `${BUNNY_CDN_BASE}/${video.bunny_video_id}/thumbnail.jpg`}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Glass reflection overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

interface PhoneMockupCarouselProps {
  className?: string;
  title?: string;
  subtitle?: string;
  /** Total videos to display (default 10) */
  maxVideos?: number;
}

export default function PhoneMockupCarousel({
  className = '',
  title = 'Contenido real de nuestra comunidad',
  subtitle = 'Creado por talento verificado en Kreoon',
  maxVideos = 10,
}: PhoneMockupCarouselProps) {
  const [videos, setVideos] = useState<PortfolioVideo[]>([]);
  const scrollAnim = useScrollAnimation();

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      slidesToScroll: 1,
      containScroll: 'trimSnaps',
    },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );

  useEffect(() => {
    const fetchVideos = async () => {
      // Fetch a large pool so we get variety across all brands
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('bunny_video_id, thumbnail_url, title')
        .eq('is_public', true)
        .eq('media_type', 'video')
        .not('bunny_video_id', 'is', null)
        .limit(FETCH_POOL);

      if (!error && data && data.length > 0) {
        setVideos(data as PortfolioVideo[]);
      }
    };

    fetchVideos();
  }, []);

  // Shuffle full pool then pick maxVideos — random on every render/page load
  const displayed = useMemo(() => {
    if (videos.length === 0) return [];
    return shuffle(videos).slice(0, maxVideos);
  }, [videos, maxVideos]);

  if (displayed.length === 0) return null;

  return (
    <section className={`py-12 md:py-20 ${className}`}>
      <motion.div variants={FADE_IN_UP} {...scrollAnim} className="text-center mb-8 px-4">
        <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">
          Portafolio
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-white/50 text-sm">
          {subtitle}
        </p>
      </motion.div>

      {/* Embla carousel — 5 visible on lg, 3 on md, 2 on sm */}
      <div ref={emblaRef} className="overflow-hidden px-4 lg:px-0">
        <div className="flex gap-3 md:gap-4">
          {displayed.map((video) => (
            <div
              key={video.bunny_video_id}
              className="flex-[0_0_42%] sm:flex-[0_0_30%] md:flex-[0_0_22%] lg:flex-[0_0_18.5%] min-w-0"
            >
              <PhoneFrame video={video} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
