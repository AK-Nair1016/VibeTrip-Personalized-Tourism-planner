interface HeartButtonProps {
  saved: boolean;
  disabled: boolean;
  hotelName: string;
  onToggle: () => void;
}

// The round heart on a photo. Filled and red when the hotel is saved.
export default function HeartButton({ saved, disabled, hotelName, onToggle }: HeartButtonProps) {
  const label = saved ? `Remove ${hotelName} from saved stays` : `Save ${hotelName} to saved stays`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      disabled={disabled}
      onClick={(event) => {
        // The heart sits on top of a card that is a link: do not follow it
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition hover:scale-110 disabled:opacity-60 ${
        saved ? "text-[#E11D48]" : "text-on-surface hover:text-[#E11D48]"
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
      >
        favorite
      </span>
    </button>
  );
}
