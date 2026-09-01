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

import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const refresh =catchAsync(
  async(req:Request,res:Response)=>{
    const refreshToken= req.cookies.refreshToken;

    if(!refreshToken){
      throw new AppError(
        "MISSING REFRESH TOKEN",
        " Refresh token is required",
        401
      );
    }
    const accessToken = refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message:"Access token refresher successfully",
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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, //TODO: change it while on deployment
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, //TODO: change it while on deployment
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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

    const {
      user: sanitizedUser,
      accessToken,
      refreshToken
    } = await googleAuthService(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        user: sanitizedUser,
        accessToken
      }
    });
  }
);

export const logout = catchAsync(
  async (req: Request, res: Response) => {
    res.clearCookie("refreshToken");
    //TODO: check which block is suitable for my approach of cookie
    // res.clearCookie("refreshToken", {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "strict",
    // });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
);

//forgot password
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