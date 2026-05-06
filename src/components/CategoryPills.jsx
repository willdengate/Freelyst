import { cn } from '@/lib/utils';
import { Laptop, Car, Sofa, Shirt, TreePine, Dumbbell, Baby, BookOpen, Music, PawPrint, Grid3X3 } from 'lucide-react';

const categories = [
  { name: 'All', icon: Grid3X3 },
  { name: 'Electronics', icon: Laptop },
  { name: 'Vehicles', icon: Car },
  { name: 'Furniture', icon: Sofa },
  { name: 'Clothing', icon: Shirt },
  { name: 'Home & Garden', icon: TreePine },
  { name: 'Sports', icon: Dumbbell },
  { name: 'Toys', icon: Baby },
  { name: 'Books', icon: BookOpen },
  { name: 'Music', icon: Music },
  { name: 'Pet Supplies', icon: PawPrint },
];

export default function CategoryPills({ selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      {categories.map(({ name, icon: Icon }) => {
        const isActive = selected === name || (name === 'All' && !selected);
        return (
          <button
            key={name}
            onClick={() => onSelect(name === 'All' ? null : name)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap text-sm font-medium",
              "transition-all duration-200 flex-shrink-0",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {name}
          </button>
        );
      })}
    </div>
  );
}