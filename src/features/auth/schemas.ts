import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email(),
    password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const sendOtpSchema = z.object({
    email: z.string().min(1, "Email is required").email(),
});

export const verifyOtpSchema = z.object({
    email: z.string().min(1, "Email is required").email(),
    userId: z.string().min(1, "User ID is required"),
    secret: z.string().min(1, "OTP is required"),
});

export const registerWithOtpSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
    userId: z.string().min(1, "User ID is required"),
    secret: z.string().min(1, "OTP is required"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const updateNameSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});