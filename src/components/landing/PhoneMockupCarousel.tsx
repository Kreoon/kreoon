import { useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { FADE_IN_UP, useScrollAnimation } from '@/lib/animations';

const BUNNY_CDN_BASE = 'https://vz-78fcd769-050.b-cdn.net';

interface PortfolioVideo {
  bunny_video_id: string;
  thumbnail_url: string | null;
  title: string | null;
}

function PhoneFrame({ video }: { video: PortfolioVideo }) {
  return (
    <div className="relative mx-auto w-[200px] sm:w-[220px] flex-shrink-0">
      {/* Phone bezel */}
      <div className="relative rounded-[2.5rem] border-4 border-neutral-800 bg-black p-1.5 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-24 h-6 bg-neutral-800 rounded-b-2xl" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2rem] bg-neutral-900" style={{ aspectRatio: '9/16' }}>
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
}

export default function PhoneMockupCarousel({
  className = '',
  title = 'Contenido real de nuestra comunidad',
  subtitle = 'Creado por talento verificado en Kreoon',
}: PhoneMockupCarouselProps) {
  const [videos, setVideos] = useState<PortfolioVideo[]>([]);
  const scrollAnim = useScrollAnimation();

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      slidesToScroll: 1,
      containScroll: false,
    },
    [Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('bunny_video_id, thumbnail_url, title')
        .eq('is_public', true)
        .eq('media_type', 'video')
        .not('bunny_video_id', 'is', null)
        .order('views_count', { ascending: false })
        .limit(12);

      if (!error && data && data.length > 0) {
        setVideos(data as PortfolioVideo[]);
      }
    };

    fetchVideos();
  }, []);

  // Shuffle on client
  const shuffled = useMemo(() => {
    if (videos.length === 0) return [];
    const arr = [...videos];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [videos]);

  if (shuffled.length === 0) return null;

  return (
    <section className={`py-16 md:py-24 overflow-hidden ${className}`}>
      <motion.div variants={FADE_IN_UP} {...scrollAnim} className="text-center mb-10 px-4">
        <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">
          Portfolio
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-white/50 text-sm">
          {subtitle}
        </p>
      </motion.div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-4 md:gap-6 pl-4">
          {shuffled.map((video) => (
            <div
              key={video.bunny_video_id}
              className="flex-[0_0_220px] sm:flex-[0_0_240px] min-w-0"
            >
              <PhoneFrame video={video} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
