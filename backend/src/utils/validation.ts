import type { Request } from "express";

const validator = require("validator");

type RequestBody = Record<string, any>;

const cabinClasses = ["economy", "premium", "business"];
const bookingStatuses = ["pending", "confirmed", "cancelled"];
const orderTypes = ["flight", "hotel"];
const orderStatuses = ["created", "paid", "failed", "refunded"];
const passengerTypes = ["adult", "child", "infant"];
const propertyTypes = ["hotel", "resort", "apartment", "hostel"];
const sources = ["seeded", "live-api"];
const userRoles = ["user", "admin"];
const wishlistItemTypes = ["flight", "hotel"];

const getBody = (req: Request): RequestBody => req.body || {};

const validateAllowedFields = (body: RequestBody, allowedFields: string[]) => {
  const isAllowed = Object.keys(body).every((field) =>
    allowedFields.includes(field)
  );

  if (!isAllowed) {
    throw new Error("Invalid fields in request.");
  }
};

const validateRequiredFields = (body: RequestBody, requiredFields: string[]) => {
  const missingField = requiredFields.find(
    (field) => body[field] === undefined || body[field] === null || body[field] === ""
  );

  if (missingField) {
    throw new Error(`${missingField} is required.`);
  }
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const validateNumberRange = (
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number
) => {
  if (!isNumber(value)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`${fieldName} must be at least ${min}.`);
  }

  if (max !== undefined && value > max) {
    throw new Error(`${fieldName} must be at most ${max}.`);
  }
};

const validateStringLength = (
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number
) => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  if (!validator.isLength(value, { min, max })) {
    const minText = min !== undefined ? min : 0;
    const maxText = max !== undefined ? max : "unlimited";
    throw new Error(`${fieldName} must be between ${minText} and ${maxText} characters.`);
  }
};

const validateEnum = (value: unknown, fieldName: string, allowedValues: string[]) => {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(", ")}.`);
  }
};

const validateMongoId = (value: unknown, fieldName: string) => {
  if (typeof value !== "string" || !validator.isMongoId(value)) {
    throw new Error(`${fieldName} must be a valid MongoDB id.`);
  }
};

const validateDateValue = (value: unknown, fieldName: string) => {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
};

const validateStringArray = (value: unknown, fieldName: string, required = false) => {
  if (value === undefined && !required) {
    return;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }
};

const validateUrlArray = (value: unknown, fieldName: string, required = false) => {
  if (value === undefined && !required) {
    return;
  }

  validateStringArray(value, fieldName, required);

  if (!Array.isArray(value)) {
    return;
  }

  const hasInvalidUrl = value.some(
    (item) => !validator.isURL(item, { protocols: ["http", "https"], require_protocol: true })
  );

  if (hasInvalidUrl) {
    throw new Error(`${fieldName} must contain valid http or https URLs.`);
  }
};

const validateAirport = (value: unknown, fieldName: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an airport object.`);
  }

  const airport = value as RequestBody;
  validateAllowedFields(airport, ["code", "city", "airport"]);
  validateRequiredFields(airport, ["code", "city", "airport"]);
  validateStringLength(airport.code, `${fieldName}.code`, 3, 3);
  validateStringLength(airport.city, `${fieldName}.city`, 1);
  validateStringLength(airport.airport, `${fieldName}.airport`, 1);
};

const validateCabinClass = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Each cabin class must be an object.");
  }

  const cabinClass = value as RequestBody;
  validateAllowedFields(cabinClass, ["class", "price", "seatsAvailable", "baggageAllowance"]);
  validateRequiredFields(cabinClass, ["class", "price", "seatsAvailable", "baggageAllowance"]);
  validateEnum(cabinClass.class, "cabinClasses.class", cabinClasses);
  validateNumberRange(cabinClass.price, "cabinClasses.price", 0);
  validateNumberRange(cabinClass.seatsAvailable, "cabinClasses.seatsAvailable", 0);
  validateStringLength(cabinClass.baggageAllowance, "cabinClasses.baggageAllowance", 1);
};

const validateLayovers = (value: unknown) => {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new Error("layovers must be an array.");
  }

  value.forEach((layover) => {
    if (!layover || typeof layover !== "object" || Array.isArray(layover)) {
      throw new Error("Each layover must be an object.");
    }

    const item = layover as RequestBody;
    validateAllowedFields(item, ["airportCode", "duration"]);

    if (item.airportCode !== undefined) {
      validateStringLength(item.airportCode, "layovers.airportCode", 3, 3);
    }

    if (item.duration !== undefined) {
      validateNumberRange(item.duration, "layovers.duration", 0);
    }
  });
};

const validateSavedTravelers = (value: unknown) => {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new Error("savedTravelers must be an array.");
  }

  if (value.length > 10) {
    throw new Error("Cannot save more than 10 travelers.");
  }

  value.forEach((traveler) => {
    if (!traveler || typeof traveler !== "object" || Array.isArray(traveler)) {
      throw new Error("Each saved traveler must be an object.");
    }

    const item = traveler as RequestBody;
    validateAllowedFields(item, ["name", "dob", "passportNo"]);
    validateRequiredFields(item, ["name", "dob"]);
    validateStringLength(item.name, "savedTravelers.name", 1);
    validateDateValue(item.dob, "savedTravelers.dob");

    if (item.passportNo !== undefined) {
      validateStringLength(item.passportNo, "savedTravelers.passportNo", 1);
    }
  });
};

const validatePassengers = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("At least one passenger required.");
  }

  value.forEach((passenger) => {
    if (!passenger || typeof passenger !== "object" || Array.isArray(passenger)) {
      throw new Error("Each passenger must be an object.");
    }

    const item = passenger as RequestBody;
    validateAllowedFields(item, ["name", "dob", "type", "seatNumber"]);
    validateRequiredFields(item, ["name", "dob", "type"]);
    validateStringLength(item.name, "passengers.name", 1);
    validateDateValue(item.dob, "passengers.dob");
    validateEnum(item.type, "passengers.type", passengerTypes);

    if (item.seatNumber !== undefined) {
      validateStringLength(item.seatNumber, "passengers.seatNumber", 1);
    }
  });
};

const validateGuests = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("guests must be an object.");
  }

  const guests = value as RequestBody;
  validateAllowedFields(guests, ["adults", "children"]);
  validateRequiredFields(guests, ["adults", "children"]);
  validateNumberRange(guests.adults, "guests.adults", 1);
  validateNumberRange(guests.children, "guests.children", 0);
};

const validateMaxOccupancy = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("maxOccupancy must be an object.");
  }

  const maxOccupancy = value as RequestBody;
  validateAllowedFields(maxOccupancy, ["adults", "children"]);
  validateRequiredFields(maxOccupancy, ["adults", "children"]);
  validateNumberRange(maxOccupancy.adults, "maxOccupancy.adults", 1);
  validateNumberRange(maxOccupancy.children, "maxOccupancy.children", 0);
};

const validateLocation = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("location must be an object.");
  }

  const location = value as RequestBody;
  validateAllowedFields(location, ["type", "coordinates"]);
  validateRequiredFields(location, ["type", "coordinates"]);

  if (location.type !== "Point") {
    throw new Error("location.type must be Point.");
  }

  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    throw new Error("location.coordinates must be [lng, lat].");
  }

  validateNumberRange(location.coordinates[0], "location.coordinates.lng", -180, 180);
  validateNumberRange(location.coordinates[1], "location.coordinates.lat", -90, 90);
};

const validateCategoryRatings = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("categoryRatings must be an object.");
  }

  const ratings = value as RequestBody;
  validateAllowedFields(ratings, ["cleanliness", "location", "service", "value"]);
  validateRequiredFields(ratings, ["cleanliness", "location", "service", "value"]);
  validateNumberRange(ratings.cleanliness, "categoryRatings.cleanliness", 1, 5);
  validateNumberRange(ratings.location, "categoryRatings.location", 1, 5);
  validateNumberRange(ratings.service, "categoryRatings.service", 1, 5);
  validateNumberRange(ratings.value, "categoryRatings.value", 1, 5);
};

const validateWishlistItems = (value: unknown) => {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new Error("items must be an array.");
  }

  if (value.length > 200) {
    throw new Error("Wishlist capped at 200 items.");
  }

  value.forEach((wishlistItem) => {
    if (!wishlistItem || typeof wishlistItem !== "object" || Array.isArray(wishlistItem)) {
      throw new Error("Each wishlist item must be an object.");
    }

    const item = wishlistItem as RequestBody;
    validateAllowedFields(item, ["itemType", "itemId", "addedAt"]);
    validateRequiredFields(item, ["itemType", "itemId"]);
    validateEnum(item.itemType, "items.itemType", wishlistItemTypes);
    validateMongoId(item.itemId, "items.itemId");

    if (item.addedAt !== undefined) {
      validateDateValue(item.addedAt, "items.addedAt");
    }
  });
};

const validateSignUpData = (req: Request) => {
  const { userName, name, email, password } = getBody(req);

  if (!userName || !validator.isLength(userName, { min: 3, max: 20 })) {
    throw new Error("UserName must be between 3 and 20 characters.");
  }

  if (!name || !validator.isLength(name, { min: 3, max: 50 })) {
    throw new Error("Name must be between 3 and 50 characters.");
  }

  if (!email || !validator.isEmail(email)) {
    throw new Error("Email is not valid.");
  }

  if (!password || !validator.isStrongPassword(password)) {
    throw new Error("Enter a strong password.");
  }

  return true;
};

const validateEditProfileData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, ["userName", "name", "avatarUrl", "savedTravelers"]);

  const { userName, name, avatarUrl, savedTravelers } = body;

  if (userName !== undefined) {
    validateStringLength(userName, "userName", 3, 20);
  }

  if (name !== undefined) {
    validateStringLength(name, "name", 3, 50);
  }

  if (avatarUrl !== undefined && !validator.isURL(avatarUrl, {
    protocols: ["http", "https"],
    require_protocol: true
  })) {
    throw new Error("Avatar URL must be a valid http or https URL.");
  }

  validateSavedTravelers(savedTravelers);

  return true;
};

const validatePasswordEdit = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, ["currentPassword", "newPassword", "confirmNewPassword"]);
  validateRequiredFields(body, ["currentPassword", "newPassword", "confirmNewPassword"]);

  const { currentPassword, newPassword, confirmNewPassword } = body;

  if (newPassword !== confirmNewPassword) {
    throw new Error("New passwords do not match.");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from existing password.");
  }

  if (!validator.isStrongPassword(newPassword)) {
    throw new Error("Enter a strong new password.");
  }

  return true;
};

const validateForgotPassword = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, ["newPassword", "confirmNewPassword"]);
  validateRequiredFields(body, ["newPassword", "confirmNewPassword"]);

  const { newPassword, confirmNewPassword } = body;

  if (newPassword !== confirmNewPassword) {
    throw new Error("New passwords do not match.");
  }

  if (!validator.isStrongPassword(newPassword)) {
    throw new Error("Enter a strong new password.");
  }

  return true;
};

const validateUserModelData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "userName",
    "name",
    "email",
    "passwordHash",
    "googleId",
    "avatarUrl",
    "role",
    "isEmailVerified",
    "savedTravelers",
    "stripeCustomerId"
  ]);
  validateRequiredFields(body, ["userName", "name", "email", "passwordHash"]);
  validateStringLength(body.userName, "userName", 3, 20);
  validateStringLength(body.name, "name", 3, 50);

  if (!validator.isEmail(body.email)) {
    throw new Error("Email is not valid.");
  }

  if (typeof body.passwordHash !== "string" || body.passwordHash.length === 0) {
    throw new Error("passwordHash is required.");
  }

  if (body.googleId !== undefined) {
    validateStringLength(body.googleId, "googleId", 1);
  }

  if (body.avatarUrl !== undefined && !validator.isURL(body.avatarUrl, {
    protocols: ["http", "https"],
    require_protocol: true
  })) {
    throw new Error("Avatar URL must be a valid http or https URL.");
  }

  validateEnum(body.role, "role", userRoles);

  if (body.isEmailVerified !== undefined && typeof body.isEmailVerified !== "boolean") {
    throw new Error("isEmailVerified must be a boolean.");
  }

  validateSavedTravelers(body.savedTravelers);

  if (body.stripeCustomerId !== undefined) {
    validateStringLength(body.stripeCustomerId, "stripeCustomerId", 1);
  }

  return true;
};

const validateFlightData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "flightNumber",
    "airline",
    "origin",
    "destination",
    "departureTime",
    "arrivalTime",
    "duration",
    "stops",
    "layovers",
    "cabinClasses",
    "source"
  ]);
  validateRequiredFields(body, [
    "flightNumber",
    "airline",
    "origin",
    "destination",
    "departureTime",
    "arrivalTime",
    "duration",
    "cabinClasses"
  ]);

  validateStringLength(body.flightNumber, "flightNumber", 1);
  validateStringLength(body.airline, "airline", 1);
  validateAirport(body.origin, "origin");
  validateAirport(body.destination, "destination");

  const departureTime = validateDateValue(body.departureTime, "departureTime");
  const arrivalTime = validateDateValue(body.arrivalTime, "arrivalTime");

  if (arrivalTime <= departureTime) {
    throw new Error("arrivalTime must be after departureTime.");
  }

  validateNumberRange(body.duration, "duration", 1);

  if (body.stops !== undefined) {
    validateNumberRange(body.stops, "stops", 0);
  }

  validateLayovers(body.layovers);

  if (!Array.isArray(body.cabinClasses) || body.cabinClasses.length === 0) {
    throw new Error("At least one cabin class required.");
  }

  body.cabinClasses.forEach(validateCabinClass);
  validateEnum(body.source, "source", sources);

  return true;
};

const validateHotelData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "name",
    "description",
    "city",
    "address",
    "location",
    "starRating",
    "guestRating",
    "reviewCount",
    "amenities",
    "photos",
    "propertyType",
    "cancellationPolicy",
    "source"
  ]);
  validateRequiredFields(body, [
    "name",
    "description",
    "city",
    "address",
    "location",
    "starRating",
    "propertyType",
    "cancellationPolicy"
  ]);

  validateStringLength(body.name, "name", 1, 150);
  validateStringLength(body.description, "description", 1, 3000);
  validateStringLength(body.city, "city", 1);
  validateStringLength(body.address, "address", 1);
  validateLocation(body.location);
  validateNumberRange(body.starRating, "starRating", 1, 5);

  if (body.guestRating !== undefined) {
    validateNumberRange(body.guestRating, "guestRating", 0, 5);
  }

  if (body.reviewCount !== undefined) {
    validateNumberRange(body.reviewCount, "reviewCount", 0);
  }

  validateStringArray(body.amenities, "amenities");
  validateUrlArray(body.photos, "photos");

  if (body.photos !== undefined && body.photos.length === 0) {
    throw new Error("At least one photo required.");
  }

  validateEnum(body.propertyType, "propertyType", propertyTypes);
  validateStringLength(body.cancellationPolicy, "cancellationPolicy", 1);
  validateEnum(body.source, "source", sources);

  return true;
};

const validateRoomData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "hotelId",
    "type",
    "maxOccupancy",
    "pricePerNight",
    "totalRooms",
    "amenities",
    "photos"
  ]);
  validateRequiredFields(body, ["hotelId", "type", "maxOccupancy", "pricePerNight", "totalRooms"]);
  validateMongoId(body.hotelId, "hotelId");
  validateStringLength(body.type, "type", 1);
  validateMaxOccupancy(body.maxOccupancy);
  validateNumberRange(body.pricePerNight, "pricePerNight", 0);
  validateNumberRange(body.totalRooms, "totalRooms", 1);
  validateStringArray(body.amenities, "amenities");
  validateUrlArray(body.photos, "photos");

  return true;
};

const validateFlightBookingData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "userId",
    "orderId",
    "flightId",
    "cabinClass",
    "passengers",
    "status",
    "bookingRef",
    "totalPrice"
  ]);
  validateRequiredFields(body, [
    "userId",
    "orderId",
    "flightId",
    "cabinClass",
    "passengers",
    "bookingRef",
    "totalPrice"
  ]);
  validateMongoId(body.userId, "userId");
  validateMongoId(body.orderId, "orderId");
  validateMongoId(body.flightId, "flightId");
  validateEnum(body.cabinClass, "cabinClass", cabinClasses);
  validatePassengers(body.passengers);
  validateEnum(body.status, "status", bookingStatuses);
  validateStringLength(body.bookingRef, "bookingRef", 1);
  validateNumberRange(body.totalPrice, "totalPrice", 0);

  return true;
};

const validateHotelBookingData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "userId",
    "orderId",
    "hotelId",
    "roomId",
    "checkIn",
    "checkOut",
    "guests",
    "rooms",
    "status",
    "bookingRef",
    "totalPrice"
  ]);
  validateRequiredFields(body, [
    "userId",
    "orderId",
    "hotelId",
    "roomId",
    "checkIn",
    "checkOut",
    "guests",
    "rooms",
    "bookingRef",
    "totalPrice"
  ]);
  validateMongoId(body.userId, "userId");
  validateMongoId(body.orderId, "orderId");
  validateMongoId(body.hotelId, "hotelId");
  validateMongoId(body.roomId, "roomId");

  const checkIn = validateDateValue(body.checkIn, "checkIn");
  const checkOut = validateDateValue(body.checkOut, "checkOut");

  if (checkOut <= checkIn) {
    throw new Error("checkOut must be after checkIn.");
  }

  validateGuests(body.guests);
  validateNumberRange(body.rooms, "rooms", 1);
  validateEnum(body.status, "status", bookingStatuses);
  validateStringLength(body.bookingRef, "bookingRef", 1);
  validateNumberRange(body.totalPrice, "totalPrice", 0);

  return true;
};

const validateOrderData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "userId",
    "type",
    "amount",
    "currency",
    "stripePaymentIntentId",
    "status"
  ]);
  validateRequiredFields(body, ["userId", "type", "amount", "currency", "stripePaymentIntentId"]);
  validateMongoId(body.userId, "userId");
  validateEnum(body.type, "type", orderTypes);
  validateNumberRange(body.amount, "amount", 0);
  validateStringLength(body.currency, "currency", 3, 3);
  validateStringLength(body.stripePaymentIntentId, "stripePaymentIntentId", 1);
  validateEnum(body.status, "status", orderStatuses);

  return true;
};

const validateReviewData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, [
    "userId",
    "hotelId",
    "bookingId",
    "rating",
    "categoryRatings",
    "text",
    "helpfulVotes"
  ]);
  validateRequiredFields(body, ["userId", "hotelId", "bookingId", "rating", "categoryRatings", "text"]);
  validateMongoId(body.userId, "userId");
  validateMongoId(body.hotelId, "hotelId");
  validateMongoId(body.bookingId, "bookingId");
  validateNumberRange(body.rating, "rating", 1, 5);
  validateCategoryRatings(body.categoryRatings);
  validateStringLength(body.text, "text", 10, 2000);

  if (body.helpfulVotes !== undefined) {
    validateNumberRange(body.helpfulVotes, "helpfulVotes", 0);
  }

  return true;
};

const validateWishlistData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, ["userId", "items"]);
  validateRequiredFields(body, ["userId"]);
  validateMongoId(body.userId, "userId");
  validateWishlistItems(body.items);

  return true;
};

const validateWishlistItemData = (req: Request) => {
  const body = getBody(req);
  validateAllowedFields(body, ["itemType", "itemId", "addedAt"]);
  validateRequiredFields(body, ["itemType", "itemId"]);
  validateEnum(body.itemType, "itemType", wishlistItemTypes);
  validateMongoId(body.itemId, "itemId");

  if (body.addedAt !== undefined) {
    validateDateValue(body.addedAt, "addedAt");
  }

  return true;
};

module.exports = {
  validateSignUpData,
  validateEditProfileData,
  validatePasswordEdit,
  validateForgotPassword,
  validateUserModelData,
  validateFlightData,
  validateHotelData,
  validateRoomData,
  validateFlightBookingData,
  validateHotelBookingData,
  validateOrderData,
  validateReviewData,
  validateWishlistData,
  validateWishlistItemData
};

