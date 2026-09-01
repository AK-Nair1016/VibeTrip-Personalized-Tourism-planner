        //any type is temporary refactor later
export const validateSignup = (body: any): string | null => { 
  const { userName, name, email, password } = body;

  if (!userName) {
    return "Username is required";
  }

  if (!name) {
    return "Name is required";
  }

  if (!email) {
    return "Email is required";
  }

  if (!password) {
    return "Password is required";
  }

  if (userName.length < 3 || userName.length > 20) {
    return "Username must be between 3 and 20 characters";
  }

  if (name.length < 3 || name.length > 50) {
    return "Name must be between 3 and 50 characters";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
};

export const validateLogin = (body: any): string | null => {
  const { email, password } = body;

  if (!email) {
    return "Email is required";
  }

  if (!password) {
    return "Password is required";
  }

  return null;
};

export const validateForgetPassword =(body:any): string| null =>{
  const {email}= body;
  if(!email){
    return "Email is required"
  }
  return null;
}
// TODO: Replace `any` with a proper request body type.

export const validateResetPassword = (body: any): string | null => {
  const { password } = body;

  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
};