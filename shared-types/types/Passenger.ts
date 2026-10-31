// One traveller, as the client sends them at checkout. Duffel's pas_ ids are not here:
// the server pairs travellers to ids by position.
export type PassengerInput = {
  title: string;
  givenName: string;
  familyName: string;
  bornOn: string;
  gender: string;
  email: string;
  phoneNumber: string;
};

// A traveller after the server paired them with the offer's Duffel passenger id (pas_...).
export type OrderPassenger = PassengerInput & {
  id: string;
};
