import type { Request, Response } from "express";

import {
   getCurrentUser,
    updateUserProfile
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