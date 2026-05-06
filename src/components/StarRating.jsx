import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StarRating({ score, onRate, size = 'sm', showEmpty = true }) {
  const stars = [1, 2, 3, 4, 5];
  const sz = size === 'lg' ? 'w-7 h-7' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          disabled={!onRate}
          onClick={() => onRate?.(s)}
          className={cn('transition-transform', onRate && 'hover:scale-125 cursor-pointer', !onRate && 'cursor-default')}
        >
          <Star
            className={cn(
              sz,
              s <= Math.round(score || 0)
                ? 'fill-yellow-400 text-yellow-400'
                : showEmpty
                ? 'text-muted-foreground/30'
                : 'text-transparent'
            )}
          />
        </button>
      ))}
    </div>
  );
}