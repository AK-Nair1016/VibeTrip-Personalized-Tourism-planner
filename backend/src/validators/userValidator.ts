type UpdateProfileBody = { userName?: unknown; name?: unknown; avatarUrl?: unknown };

export const validateUpdateProfile =(body: unknown):string |null=>{
  // Express 5 leaves req.body undefined when the client sends no JSON
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const {userName, name, avatarUrl }=body as UpdateProfileBody;
  if (userName !== undefined) {
    if (typeof userName !== "string") {
      return "Username must be a string";
    }

    if (userName.length < 3 || userName.length > 20) {
      return "Username must be between 3 and 20 characters";
    }
  }

  if (name !== undefined) {
    if (typeof name !== "string") {
      return "Name must be a string";
    }

    if (name.length < 3 || name.length > 50) {
      return "Name must be between 3 and 50 characters";
    }
  }

  if (avatarUrl !== undefined) {
    if (typeof avatarUrl !== "string") {
      return "Avatar URL must be a string";
    }

    if (!/^https?:\/\//.test(avatarUrl)) {
      return "Avatar URL must be a valid URL";
    }
  }

  if (
    userName === undefined &&
    name === undefined &&
    avatarUrl === undefined
  ) {
    return "At least one field is required to update profile";
  }

  return null;
};  
