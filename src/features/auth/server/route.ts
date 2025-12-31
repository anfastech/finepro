import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ID } from "node-appwrite";
import { deleteCookie, setCookie } from "hono/cookie";
import { createAdminClient } from "@/lib/appwrite";
import { sessionMiddleware } from "@/lib/session-middleware";

import { AUTH_COOKIE } from "../constants";
import { loginSchema, sendOtpSchema, verifyOtpSchema, registerWithOtpSchema } from "../schemas";
import { PUBLIC_APP_URL } from "@/config";

const app = new Hono()
.get(
  "/current",
  sessionMiddleware,
  async (c) => {
    const user = c.get("user");
    return c.json({ data: user });
  }
)
.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const { account } = await createAdminClient();
  const session = await account.createEmailPasswordSession(email, password);

  setCookie(c, AUTH_COOKIE, session.secret, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({ data: session });
})
.post(
    "/send-otp",
    zValidator("json", sendOtpSchema),
    async (c) => {
        const { email } = c.req.valid("json");
        
        const { account } = await createAdminClient();
        
        try {
            // Create account with temporary credentials
            const userId = ID.unique();
            const tempPassword = ID.unique(); // Temporary password, will be updated after OTP verification
            const tempName = "User"; // Placeholder name, will be updated during registration
            await account.create(userId, email, tempPassword, tempName);
            
            // Create a temporary session to use account.createVerification (requires user session)
            const tempSession = await account.createEmailPasswordSession(email, tempPassword);
            
            // Create a client with the session for account operations
            const { Client, Account } = await import("node-appwrite");
            const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = await import("@/config");
            const sessionClient = new Client()
                .setEndpoint(APPWRITE_ENDPOINT)
                .setProject(APPWRITE_PROJECT_ID)
                .setSession(tempSession.secret);
            const sessionAccount = new Account(sessionClient);
            
            // Explicitly create and send verification email/OTP
            // The URL parameter is required but not used for OTP verification (we handle it in-app)
            const verificationUrl = `${PUBLIC_APP_URL}/signup?userId=${userId}`;
            await sessionAccount.createVerification(verificationUrl);
            
            // Delete the temporary session
            await account.deleteSession(tempSession.$id);
            
            return c.json({ success: true, userId });
        } catch (error: unknown) {
            // If account already exists, try to resend verification
            const appwriteError = error as { code?: number; message?: string };
            if (appwriteError.code === 409) {
                try {
                    const { users } = await createAdminClient();
                    const userList = await users.list();
                    const user = userList.users.find(u => u.email === email);
                    
                    if (user) {
                        // Try to create a new verification (resend OTP)
                        // First, we need to reset the password temporarily to create a session
                        try {
                            const tempPassword = ID.unique();
                            await users.updatePassword(user.$id, tempPassword);
                            
                            // Create session and send verification
                            const tempSession = await account.createEmailPasswordSession(email, tempPassword);
                            
                            const { Client, Account } = await import("node-appwrite");
                            const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = await import("@/config");
                            const sessionClient = new Client()
                                .setEndpoint(APPWRITE_ENDPOINT)
                                .setProject(APPWRITE_PROJECT_ID)
                                .setSession(tempSession.secret);
                            const sessionAccount = new Account(sessionClient);
                            
                            const verificationUrl = `${PUBLIC_APP_URL}/signup?userId=${user.$id}`;
                            await sessionAccount.createVerification(verificationUrl);
                            
                            await account.deleteSession(tempSession.$id);
                        } catch {
                            // If verification already exists or fails, that's okay - user can use existing OTP
                        }
                        return c.json({ success: true, userId: user.$id });
                    }
                } catch {
                    return c.json({ error: "Failed to send OTP" }, 400);
                }
            }
            return c.json({ error: appwriteError.message || "Failed to send OTP" }, 400);
        }
    }
)
.post(
    "/verify-otp",
    zValidator("json", verifyOtpSchema),
    async (c) => {
        const { userId, secret } = c.req.valid("json");
        
        const { account, users } = await createAdminClient();
        
        try {
            // Get user to get email
            const user = await users.get(userId);
            
            // Reset password temporarily to create a session for verification
            const tempPassword = ID.unique();
            await users.updatePassword(userId, tempPassword);
            
            // Create session and verify OTP
            const tempSession = await account.createEmailPasswordSession(user.email, tempPassword);
            
            const { Client, Account } = await import("node-appwrite");
            const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = await import("@/config");
            const sessionClient = new Client()
                .setEndpoint(APPWRITE_ENDPOINT)
                .setProject(APPWRITE_PROJECT_ID)
                .setSession(tempSession.secret);
            const sessionAccount = new Account(sessionClient);
            
            // Verify the OTP using the session (userId and secret)
            await sessionAccount.updateVerification(userId, secret);
            
            // Delete the temporary session
            await account.deleteSession(tempSession.$id);
            
            return c.json({ success: true });
        } catch (error: unknown) {
            const appwriteError = error as { message?: string };
            return c.json({ error: appwriteError.message || "Invalid OTP" }, 400);
        }
    }
)
.post(
    "/register", 
    zValidator("json", registerWithOtpSchema), async (c) => {
        const { name, email, password, userId, secret } = c.req.valid("json");
      
        const { account, users } = await createAdminClient();
        
        try {
            // Get user to get email
            const user = await users.get(userId);
            
            // Reset password temporarily to create a session for verification
            const tempPassword = ID.unique();
            await users.updatePassword(userId, tempPassword);
            
            // Create session and verify OTP
            const tempSession = await account.createEmailPasswordSession(user.email, tempPassword);
            
            const { Client, Account } = await import("node-appwrite");
            const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = await import("@/config");
            const sessionClient = new Client()
                .setEndpoint(APPWRITE_ENDPOINT)
                .setProject(APPWRITE_PROJECT_ID)
                .setSession(tempSession.secret);
            const sessionAccount = new Account(sessionClient);
            
            // Verify the OTP using the session
            await sessionAccount.updateVerification(userId, secret);
            
            // Delete the temporary session
            await account.deleteSession(tempSession.$id);
            
            // Update the account with name and password
            await users.updateName(userId, name);
            await users.updatePassword(userId, password);
            
            // Create session
            const session = await account.createEmailPasswordSession(
              email,
              password
            );

            setCookie(c, AUTH_COOKIE, session.secret, {
              path: "/",
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              maxAge: 60 * 60 * 24 * 30,
            });
          
            return c.json({ success: true });
        } catch (error: unknown) {
            const appwriteError = error as { code?: number; message?: string };
            // If verification fails, return error
            if (appwriteError.code === 401 || appwriteError.message?.includes("verification")) {
                return c.json({ error: "Invalid or expired OTP" }, 400);
            }
            
            // If account update fails, try to delete and recreate
            try {
                await users.delete(userId);
            } catch {
                // Ignore deletion errors
            }
            
            return c.json({ error: appwriteError.message || "Failed to register" }, 400);
        }
    }
)
.post("/logout", sessionMiddleware, async (c) => {
  const account = c.get("account");

  deleteCookie(c, AUTH_COOKIE); 
  await account.deleteSession("current");

  return c.json({ success: true });
});
export default app;
