import { Request, Response } from "express";
import {signup as signupService, login as loginService} from "../services/authService";
import { catchAsync } from "../utils/catchAsync";

export const signup = catchAsync(async (req: Request, res: Response) =>
{
    const {userName, name, email, password}=req.body;

    const user = await signupService({
        userName,
        name,
        email,
        password,
    });
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
            user,
        },
    });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await loginService({
    email,
    password,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user,
    },
  });
});