import { useState } from "react";

interface PhotoGalleryProps {
  photos: string[];
  hotelName: string;
}

// One big photo and up to four small ones, like the mock. Hotels with fewer photos get a simpler grid.
export default function PhotoGallery({ photos, hotelName }: PhotoGalleryProps) {
  const [showAll, setShowAll] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-[18px] bg-surface-container text-on-surface-variant">
        <span className="material-symbols-outlined text-[44px]">image_not_supported</span>
      </div>
    );
  }

  const mainPhoto = photos[0];
  const sidePhotos = photos.slice(1, 5);
  const hasMorePhotos = photos.length > 5;

  return (
    <section aria-label="Photo gallery" className="relative w-full">
      <div
        className={`grid h-[340px] gap-2 overflow-hidden rounded-[18px] bg-surface-container sm:h-[420px] lg:h-[520px] ${
          sidePhotos.length > 0 ? "md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        <img src={mainPhoto} alt={`${hotelName} main photo`} className="h-full w-full object-cover" />

        {sidePhotos.length > 0 ? (
          <div className="hidden h-full grid-cols-2 grid-rows-2 gap-2 md:grid">
            {sidePhotos.map((photo, index) => (
              <img
                key={photo}
                src={photo}
                alt={`${hotelName} photo ${index + 2}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      {hasMorePhotos ? (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 font-label-md text-label-md text-on-surface shadow-[0_6px_20px_rgba(0,0,0,0.12)] hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          <span>{showAll ? "Hide extra photos" : `Show all ${photos.length} photos`}</span>
        </button>
      ) : null}

      {showAll ? (
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          {photos.map((photo, index) => (
            <img
              key={photo}
              src={photo}
              alt={`${hotelName} photo ${index + 1}`}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
