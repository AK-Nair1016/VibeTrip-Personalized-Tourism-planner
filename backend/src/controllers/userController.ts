import type { Request, Response } from "express";

import {
   getCurrentUser,
    updateUserProfile,
    getWishlist as getWishlistService,
    addToWishlist as addToWishlistService,
    removeFromWishlist as removeFromWishlistService,
  } from "../services/userService";

import { catchAsync } from "../utils/catchAsync";

export const getUserProfile = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.authUser?.userId;

    if (!userId) {
      throw new Error("Authenticated user ID is missing");
    }

    const user = await getCurrentUser(userId);

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        user
      }
    });
  }
);
export const updateProfile = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.authUser?.userId;

    if (!userId) {
      throw new Error("Authenticated user ID is missing");
    }

    const { userName, name, avatarUrl } = req.body;

    const user = await updateUserProfile(userId, {
      userName,
      name,
      avatarUrl,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user,
      },
    });
  }
);

export const getWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const hotels = await getWishlistService(userId);

  res.status(200).json({
    success: true,
    message: "Wishlist fetched",
    data: hotels,
  });
});

export const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const { hotelId } = req.body;

  const hotels = await addToWishlistService(userId, hotelId);

  res.status(200).json({
    success: true,
    message: "Hotel saved to your wishlist",
    data: hotels,
  });
});

export const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const hotelId = req.params.hotelId as string;

  const hotels = await removeFromWishlistService(userId, hotelId);

  res.status(200).json({
    success: true,
    message: "Hotel removed from your wishlist",
    data: hotels,
  });
});
