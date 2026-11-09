import { Share2 } from 'lucide-react';

function getYouTubeId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'youtu.be' ? parts[0]
      : ['youtube.com', 'youtube-nocookie.com'].includes(host)
        ? (url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null))
        : null;
    return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

export default function MegaLinkAdMedia({ ad }) {
  const videoId = ad.type === 'video' ? getYouTubeId(ad.video_url) : null;
  return (
    <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
      {videoId ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0`}
          title={ad.title}
          className="w-full h-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : ad.image_url ? (
        <img src={ad.image_url} alt={ad.title} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Share2 className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}
      {!videoId && <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card to-transparent" />}
    </div>
  );
}