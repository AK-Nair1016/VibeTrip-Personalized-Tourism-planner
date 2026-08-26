import { User } from "../models/User";
import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError";

interface SignupData {
  userName: string;
  name: string;
  email: string;
  password: string;
}
interface loginData {
  email: string;
  password: string;
}

// finding user email
export const findUserByEmail = async (email: string) => {
  return User.findOne({ email }).select("+passwordHash");
};
    //finding user
export const findUserById = async(id: string)=> {
    return User.findById(id);
};
    // sanitize sensitive fields
    
const sanitizeUser = (user: any) => {
  const userObject = user.toObject();

  delete userObject.passwordHash;
  delete userObject.stripeCustomerId;

  return userObject;
};
 //signup()
export const signup = async(data: SignupData)=> {
  const {userName, name, email, password}=data;

  const existingEmail =await User.findOne({email});
  if(existingEmail){
    throw new AppError(
      "EMAIL TAKEN",
      "An account with this email already exists",
      409
    );
  }
  const passwordHash =await bcrypt.hash(password,12);
    const user = await User.create({
    userName,
    name,
    email,
    passwordHash,
  });
  return sanitizeUser(user);
}
//login
export const login = async(data: loginData)=> {
  const { email, password } = data;
  const user = await findUserByEmail(email); 

  if (!user) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      401
    );
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );


  if (!isPasswordValid) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      401
    );
  }

  return sanitizeUser(user);
};
