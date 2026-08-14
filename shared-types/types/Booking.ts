import type { Flight } from "./Flight";
import type { Hotel } from "./Hotel";
import type { User } from "./User";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Booking {
  id: string;
  user: User;
  flight?: Flight;
  hotel?: Hotel;
  status: BookingStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
}
