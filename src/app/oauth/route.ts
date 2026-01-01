// src/app/oauth/route.js

import { AUTH_COOKIE } from "@/features/auth/constants";
import { createAdminClient } from "@/lib/appwrite";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Query, ID } from "node-appwrite";
import { DATABASE_ID, MEMBERS_ID } from "@/config";

// Helper function to generate avatar color from name
const getAvatarColor = (name: string) => {
    const avatarColors = [
        { bg: "bg-blue-100", text: "text-blue-700" },
        { bg: "bg-green-100", text: "text-green-700" },
        { bg: "bg-purple-100", text: "text-purple-700" },
        { bg: "bg-pink-100", text: "text-pink-700" },
        { bg: "bg-orange-100", text: "text-orange-700" },
        { bg: "bg-indigo-100", text: "text-indigo-700" },
        { bg: "bg-teal-100", text: "text-teal-700" },
        { bg: "bg-red-100", text: "text-red-700" },
        { bg: "bg-yellow-100", text: "text-yellow-700" },
        { bg: "bg-cyan-100", text: "text-cyan-700" },
        { bg: "bg-amber-100", text: "text-amber-700" },
        { bg: "bg-emerald-100", text: "text-emerald-700" },
        { bg: "bg-violet-100", text: "text-violet-700" },
        { bg: "bg-rose-100", text: "text-rose-700" },
        { bg: "bg-sky-100", text: "text-sky-700" },
        { bg: "bg-lime-100", text: "text-lime-700" },
    ];
    
    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const { account, users, databases } = await createAdminClient();
  
  // Get the newly created OAuth user to check for duplicate email
  let oauthUser;
  try {
    oauthUser = await users.get(userId);
  } catch {
    return new NextResponse("Failed to get user", { status: 500 });
  }

  // Check if another user with the same email already exists
  if (oauthUser.email) {
    try {
      const allUsers = await users.list();
      const existingUser = allUsers.users.find(
        (u) => u.email && u.email.toLowerCase().trim() === oauthUser.email.toLowerCase().trim() && u.$id !== userId
      );

      if (existingUser) {
        // User with this email already exists - log them into existing account
        // Delete the newly created OAuth account
        try {
          await users.delete(userId);
        } catch (deleteError) {
          console.error("Failed to delete duplicate OAuth user:", deleteError);
        }
        
        // Check if existing user needs onboarding
        const hasName = existingUser.name && existingUser.name.trim() !== "";
        const members = await databases.listDocuments(
          DATABASE_ID,
          MEMBERS_ID,
          [Query.equal("userId", existingUser.$id)]
        );
        const hasWorkspace = members.documents.length > 0;
        const needsOnboarding = !hasName || !hasWorkspace;
        
        // Create a session for the existing user using temporary password approach
        // This is similar to how OTP verification works in the auth route
        try {
          // Check if existing user has a password set
          // If they do, we can't easily create a session without knowing the password
          // If they don't (OAuth-only user), we can set a temp password and create a session
          
          // Try to create a session by setting a temporary password
          // This works for OAuth users who don't have passwords set
          const tempPassword = ID.unique();
          await users.updatePassword(existingUser.$id, tempPassword);
          
          // Create email/password session with temp password
          const existingSession = await account.createEmailPasswordSession(existingUser.email, tempPassword);
          
          (await cookies()).set(AUTH_COOKIE, existingSession.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
          });
          
          // Redirect based on onboarding status
          const redirectUrl = needsOnboarding 
            ? `${request.nextUrl.origin}/onboarding`
            : `${request.nextUrl.origin}/`;
          
          return NextResponse.redirect(redirectUrl);
        } catch (sessionError: unknown) {
          // If we can't create a session (e.g., user has password set), redirect to signin
          console.error("Failed to create session for existing user:", sessionError);
          const signinUrl = new URL(`${request.nextUrl.origin}/signin`);
          signinUrl.searchParams.set("error", "account_exists");
          signinUrl.searchParams.set("email", oauthUser.email);
          return NextResponse.redirect(signinUrl.toString());
        }
      }
    } catch (error) {
      // If we can't check for duplicates, continue with normal flow
      console.error("Error checking for duplicate users:", error);
    }
  }

  const session = await account.createSession(userId, secret);

  // Get user to check onboarding status
  let needsOnboarding = false;
  try {
    const user = await users.get(userId);
    
    // Check if user needs onboarding:
    // 1. Check if user has a password (OAuth users won't have one initially)
    //    We can't directly check if password exists, but we can check if user has name
    // 2. Check if user has a name
    // 3. Check if user has at least one workspace
    
    const hasName = user.name && user.name.trim() !== "";
    
    // Check if user has workspaces
    const members = await databases.listDocuments(
      DATABASE_ID,
      MEMBERS_ID,
      [Query.equal("userId", userId)]
    );
    const hasWorkspace = members.documents.length > 0;
    
    // OAuth users typically won't have passwords set initially
    // We'll check this on the client side by attempting to set password
    // For now, if user doesn't have name or workspace, they need onboarding
    needsOnboarding = !hasName || !hasWorkspace;
    
    // If user has a name but no avatar color stored, generate and store it
    if (user.name && !user.prefs?.avatarColor) {
      const avatarColor = getAvatarColor(user.name);
      await users.updatePrefs(userId, {
        avatarColor: {
          bg: avatarColor.bg,
          text: avatarColor.text,
        }
      });
    }
  } catch {
    // If we can't get user info, assume onboarding is needed for safety
    needsOnboarding = true;
  }

  (await cookies()).set(AUTH_COOKIE, session.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });

  // Redirect to onboarding if setup is incomplete, otherwise to dashboard
  const redirectUrl = needsOnboarding 
    ? `${request.nextUrl.origin}/onboarding`
    : `${request.nextUrl.origin}/`;

  return NextResponse.redirect(redirectUrl);
}
