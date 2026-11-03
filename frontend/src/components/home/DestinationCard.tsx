import { Link } from "react-router-dom";
import type { Destination } from "@vibetrip/shared-types";
import { defaultStay, stayToQueryString } from "../hotels/stayDates";

interface DestinationCardProps {
  destination: Destination;
}

// One city tile. Clicking opens the stays in that city for default dates (two weeks out, 3 nights),
// so the user lands on real results and can change the dates there.
export default function DestinationCard({ destination }: DestinationCardProps) {
  const params = new URLSearchParams({ city: destination.city });
  const link = `/hotels?${params.toString()}&${stayToQueryString(defaultStay())}`;

  return (
    <Link to={link} className="group flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden rounded-[16px] bg-surface-container-highest">
        <img
          src={destination.image}
          alt={destination.city}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-3">
        <h3 className="truncate font-title text-title text-on-surface">
          {destination.city}, {destination.country}
        </h3>
        <p className="mt-0.5 line-clamp-2 font-body-sm text-label-sm text-on-surface-variant">
          {destination.description}
        </p>
      </div>
    </Link>
  );
}
