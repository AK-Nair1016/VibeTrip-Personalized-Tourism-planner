// The card area of the hotel checkout. The card only guarantees the room: nothing is charged now,
// and it is charged only if the guest cancels after the free cancellation deadline.
//
// The page talks to this component through the props below, so wiring Stripe later is a change
// in THIS file only:
//   - onCardSaved(setupIntentId): call it once the card is saved, the page then enables "Complete booking"
//   - onError(message): call it when the card is refused or saving fails
//   - disabled: true while the booking request runs
//
// TODO(stripe): after Aman approves @stripe/react-stripe-js, do this here:
//   1. call createHotelCardSetup() from api/hotelBookings.ts to get { setupIntentId, clientSecret }
//   2. show Stripe's <CardElement /> inside <Elements>
//   3. confirmCardSetup(clientSecret) with the card; on success call onCardSaved(setupIntentId)
//   4. on failure call onError(error.message)
export interface CardGuaranteeSectionProps {
  onCardSaved: (setupIntentId: string) => void;
  onError: (message: string) => void;
  disabled: boolean;
}

export default function CardGuaranteeSection({ disabled }: CardGuaranteeSectionProps) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7">
      <div className="mb-6 border-b border-outline-variant pb-4">
        <h3 className="font-headline-sm text-headline-sm font-extrabold text-on-surface">
          Guarantee your room with a card
        </h3>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Your card is only a guarantee. It is not charged today. We charge it only if you cancel after the
          free cancellation deadline, and then only the late fee shown in your price summary.
        </p>
      </div>

      {/* Clearly marked placeholder: no fake card fields, so nobody types a real card number into it */}
      <div
        aria-disabled={disabled}
        className="flex items-start gap-3 rounded-xl border border-dashed border-outline bg-surface-container-low p-4"
      >
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[22px] text-on-surface-variant">
          credit_card_off
        </span>
        <div>
          <p className="font-label-md text-label-md font-semibold text-on-surface">
            Card form arrives with Stripe Elements
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Card entry is not connected yet, so this booking cannot be completed in this build.
          </p>
        </div>
      </div>
    </section>
  );
}
