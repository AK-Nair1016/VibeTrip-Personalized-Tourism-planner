import type { Request, Response } from "express";
import {
  searchHotels as searchHotelsService,
  getHotel as getHotelService,
  getHotelRooms as getHotelRoomsService,
  type HotelSearchQuery,
  type RoomsQuery,
} from "../services/hotelService";
import { listHotelReviews as listHotelReviewsService } from "../services/reviewService";
import { catchAsync } from "../utils/catchAsync";

export const searchHotels = catchAsync(async (req: Request, res: Response) => {
  // Parsing and defaults live in the service. The validator already checked the query,
  // so we tell TypeScript its real shape.
  const result = await searchHotelsService(req.query as unknown as HotelSearchQuery);

  res.status(200).json({
    success: true,
    message: "Hotels fetched",
    data: result,
  });
});

export const getHotelById = catchAsync(async (req: Request, res: Response) => {
  // Express 5 types a param as string | string[]. The validator already proved it is a string.
  const id = req.params.id as string;

  const hotel = await getHotelService(id);

  res.status(200).json({
    success: true,
    message: "Hotel fetched",
    data: hotel,
  });
});

export const getHotelRooms = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const rooms = await getHotelRoomsService(id, req.query as unknown as RoomsQuery);

  res.status(200).json({
    success: true,
    message: "Rooms fetched",
    data: rooms,
  });
});

export const getHotelReviews = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const reviews = await listHotelReviewsService(id);

  res.status(200).json({
    success: true,
    message: "Reviews fetched",
    data: reviews,
  });
});
