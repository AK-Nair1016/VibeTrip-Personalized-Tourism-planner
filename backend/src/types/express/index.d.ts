import type { TokenPayload } from "../../utils/jwt";
import type { UserDocument } from "../../services/authService";

declare global {
  namespace Express {
    interface Request {
      authUser?: TokenPayload;
    }

    // Passport puts the logged-in Google user on req.user; this tells TypeScript what it is
    interface User extends UserDocument {}
  }
}

export {};