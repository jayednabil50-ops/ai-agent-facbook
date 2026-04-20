import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CarouselElement {
  title: string;
  image_url: string;
  subtitle?: string;
  buttons?: { type: string; title: string; payload?: string; url?: string }[];
}

interface CarouselMessageProps {
  elements: CarouselElement[];
}

const CarouselMessage = ({ elements }: CarouselMessageProps) => {
  const [current, setCurrent] = useState(0);
  const total = elements.length;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  const el = elements[current];
  if (!el) return null;

  return (
    <div className="w-[260px] rounded-xl overflow-hidden bg-card border border-border shadow-sm">
      {/* Image */}
      {el.image_url && (
        <img
          src={el.image_url}
          alt={el.title}
          className="w-full h-[180px] object-cover cursor-pointer"
          onClick={() => window.open(el.image_url, '_blank')}
          loading="lazy"
        />
      )}

      {/* Content */}
      <div className="p-3 space-y-1">
        <h4 className="font-bold text-sm text-foreground leading-tight">{el.title}</h4>
        {el.subtitle && (
          <p className="text-xs text-muted-foreground leading-snug">{el.subtitle}</p>
        )}
      </div>

      {/* Action Buttons */}
      {el.buttons && el.buttons.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {el.buttons.map((btn, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="w-full text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => {
                if (btn.type === 'web_url' && btn.url) window.open(btn.url, '_blank');
              }}
            >
              {btn.title}
            </Button>
          ))}
        </div>
      )}

      {/* Navigation */}
      {total > 1 && (
        <div className="flex items-center justify-between px-3 pb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            {current + 1} / {total}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CarouselMessage;

/**
 * Tries to parse a message content string as a Facebook Generic Template carousel.
 * Returns the elements array if valid, otherwise null.
 */
export function parseCarouselData(content: string | undefined | null): CarouselElement[] | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    // Direct attachment format
    const payload =
      parsed?.attachment?.payload ??
      parsed?.message?.attachment?.payload ??
      parsed?.payload;

    if (
      payload?.template_type === 'generic' &&
      Array.isArray(payload.elements) &&
      payload.elements.length > 0
    ) {
      return payload.elements;
    }
    return null;
  } catch {
    return null;
  }
}
