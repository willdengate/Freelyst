import ListingCard from './ListingCard';

export default function ListingGrid({ listings, savedIds, onToggleSave }) {
  if (!listings?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🛍️</span>
        </div>
        <p className="text-foreground font-semibold">No listings found</p>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isSaved={savedIds?.includes(listing.id)}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
}