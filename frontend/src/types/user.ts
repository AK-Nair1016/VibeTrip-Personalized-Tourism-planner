import type { User } from "@vibetrip/shared-types";

// What the backend really sends for a user (it returns the raw Mongo document minus secrets).
// The shared-types User is smaller and calls the id `id`, but the API calls it `_id`.
// The API also sends googleId, wishlist (hotel ids), savedTravelers and __v; no page here uses them.
export interface ApiUser {
  _id: string;
  userName: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// The auth store holds the small shared-types User, so convert once here.
export function toStoreUser(apiUser: ApiUser): User {
  return {
    id: apiUser._id,
    name: apiUser.name,
    email: apiUser.email,
    createdAt: apiUser.createdAt
  };
}
