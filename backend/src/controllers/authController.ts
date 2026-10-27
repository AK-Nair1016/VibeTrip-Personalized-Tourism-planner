import { Request, Response } from "express";

import {
  signup as signupService,
  login as loginService,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService,
  googleLogin as googleAuthService,
  verifyEmail as verifyEmailService,
  refreshAccessToken
} from "../services/authService";

import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { refreshCookieOptions } from "../utils/cookies";

export const refresh =catchAsync(
  async(req:Request,res:Response)=>{
    const refreshToken= req.cookies.refreshToken;

    if(!refreshToken){
      throw new AppError(
        "MISSING_REFRESH_TOKEN",
        "Refresh token is required",
        401
      );
    }
    const accessToken = refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message:"Access token refreshed successfully",
      data:{
        accessToken,
      },
    });
  }
);
export const signup = catchAsync(
  async (req: Request, res: Response) => {
    const { userName, name, email, password } = req.body;

    const {
      user,
      accessToken,
      refreshToken
    } = await signupService({
      userName,
      name,
      email,
      password
    });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        accessToken
      }
    });
  }
);

export const login = catchAsync(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const {
      user,
      accessToken,
      refreshToken
    } = await loginService({
      email,
      password
    });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        accessToken
      }
    });
  }
);

export const googleLogin = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new AppError(
        "GOOGLE_AUTH_FAILED",
        "Google authentication failed",
        401
      );
    }

    const { refreshToken } = await googleAuthService(user);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    // This is a browser redirect, so there is no JSON to send and no token may go in the URL
    // (URLs end up in history and logs). The frontend page lands here, then calls
    // POST /auth/refresh: the cookie we just set makes that return the access token.
    res.redirect(`${env.CLIENT_URL}/auth/callback`);
  }
);

export const logout = catchAsync(
  async (req: Request, res: Response) => {
    // Needs the same options the cookie was set with, or a browser in production keeps it
    res.clearCookie("refreshToken", refreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
);

export const forgotPassword =catchAsync(
  async(req: Request, res:Response)=>{
    const{email}=req.body;
    await forgotPasswordService(email);
    res.status(200).json({
      success:true,
      message:
      "If an account exists with that email, a password reset link has been sent. ",
    })
  }
);
export const resetPassword = catchAsync(
  async (req: Request, res: Response) => {
    const  token  = req.params.token;
    if (typeof token !== "string") {
      throw new AppError(
        "INVALID_RESET_TOKEN",
        "Invalid password reset token",
        400
      );
    }
    const { password } = req.body;

    if (!token) {
      throw new AppError(
        "MISSING_RESET_TOKEN",
        "Password reset token is required",
        400
      );
    }

    await resetPasswordService(token, password);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  }
);

export const verifyEmail =catchAsync(
  async(req: Request, res:Response)=> {
    const token =req.params.token;

    if(typeof token !=="string" || !token){
      throw new AppError(
        "INVALID_VERIFICATION_TOKEN",
        "Email verification token is required",
        400
      );
    }
    await verifyEmailService(token);
    res.status(200).json({
      success: true,
      message:"Email verified successfully",
    });
  }
);