"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useForm } from "react-hook-form";

import { signUpWithGoogle, signUpWithGithub } from "@/lib/oauth";
import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { sendOtpSchema, verifyOtpSchema, registerWithOtpSchema } from "../schemas";
import { useRegister } from "../api/use-register";
import { useSendOtp } from "../api/use-send-otp";
import { useVerifyOtp } from "../api/use-verify-otp";
import Link from "next/link";

type Step = "email" | "otp" | "details";

export const SignUpCard = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");

  const { mutate: sendOtp, isPending: isSendingOtp } = useSendOtp();
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useVerifyOtp();
  const { mutate: register, isPending: isRegistering } = useRegister();

  const emailForm = useForm<z.infer<typeof sendOtpSchema>>({
    resolver: zodResolver(sendOtpSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpForm = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: "",
      userId: "",
      secret: "",
    },
  });

  const detailsForm = useForm<z.infer<typeof registerWithOtpSchema>>({
    resolver: zodResolver(registerWithOtpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      userId: "",
      secret: "",
    },
  });

  const onEmailSubmit = (values: z.infer<typeof sendOtpSchema>) => {
    // Ensure email is valid before sending
    if (!values.email || !values.email.trim()) {
      emailForm.setError("email", { message: "Email is required" });
      return;
    }
    
    sendOtp(
      { json: values },
      {
        onSuccess: (data) => {
          if ('userId' in data) {
            setEmail(values.email);
            setStep("otp");
            otpForm.setValue("email", values.email);
            otpForm.setValue("userId", data.userId);
          }
        },
        onError: (error) => {
          // Error is already handled by useSendOtp hook with toast
          // But we can add additional handling here if needed
          console.error("Failed to send OTP:", error);
        },
      }
    );
  };

  const onOtpSubmit = (values: z.infer<typeof verifyOtpSchema>) => {
    verifyOtp(
      { json: values },
      {
        onSuccess: () => {
          setStep("details");
          detailsForm.setValue("email", values.email);
          detailsForm.setValue("userId", values.userId);
          detailsForm.setValue("secret", values.secret);
        },
      }
    );
  };

  const onDetailsSubmit = (values: z.infer<typeof registerWithOtpSchema>) => {
    register({ json: values });
  };

  const isPending = isSendingOtp || isVerifyingOtp || isRegistering;

  return (
    <Card className="w-full max-w-[487px] bg-white rounded-lg shadow-lg border-none mx-auto">
      <CardHeader className="block items-center justify-center text-center p-6 md:p-7 pb-2">
        <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">
          {step === "email" && "Try Productify for free"}
          {step === "otp" && "Verify your email"}
          {step === "details" && "Complete your profile"}
        </CardTitle>
        {step === "email" && (
          <CardDescription className="text-gray-500 text-xs md:text-sm mt-1">
            No credit card required
          </CardDescription>
        )}
        {step === "otp" && (
          <CardDescription className="text-gray-500 text-xs md:text-sm mt-1">
            {`We've sent a verification code to ${email}`}
          </CardDescription>
        )}
        {step === "details" && (
          <CardDescription className="text-gray-500 text-xs md:text-sm mt-1">
            Enter your details to complete registration
          </CardDescription>
        )}
      </CardHeader>
      {step === "email" && (
        <>
          <CardContent className="px-6 md:px-7 pt-2 pb-6 md:pb-7 flex flex-col gap-y-3">
            <Button
              onClick={() => signUpWithGoogle()}
              disabled={isPending}
              variant="secondary"
              size="lg"
              className="w-full border border-gray/20 shadow-none rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm md:text-base"
            >
              <FcGoogle className="mr-2 size-5" />
              Sign up with Google
            </Button>
            <Button
              onClick={() => signUpWithGithub()}
              disabled={isPending}
              variant="secondary"
              size="lg"
              className="w-full border border-gray/20 shadow-none rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm md:text-base"
            >
              <FaGithub className="mr-2 size-5" />
              Sign up with Github
            </Button>
          </CardContent>
          <div className="px-6 md:px-7 flex items-center gap-2 md:gap-3">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">or Sign up with Email</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
          <CardContent className="p-6 md:p-7">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  name="email"
                  control={emailForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Email"
                          className="border border-gray/20 shadow-none rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  disabled={isPending} 
                  size="lg" 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm md:text-base"
                >
                  {isPending ? "Sending..." : "Sign up for free"}
                </Button>
                <CardDescription className="text-center text-xs md:text-sm text-gray-500 mt-2">
                  By signing up, you agree to our{" "}
                  <Link href="/terms" className="text-blue-700 hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-700 hover:underline">
                    Terms of Service
                  </Link>
                </CardDescription>
              </form>
            </Form>
          </CardContent>
        </>
      )}
      {step !== "email" && (
        <>
          <div className="px-6 md:px-7 mb-2">
            <DottedSeparator />
          </div>
          <CardContent className="p-6 md:p-7">
            {step === "otp" && (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
              <FormField
                name="secret"
                control={otpForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter verification code"
                        maxLength={6}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("email");
                    emailForm.reset();
                  }}
                  disabled={isPending}
                  size="lg"
                  className="flex-1 text-sm md:text-base"
                >
                  Back
                </Button>
                <Button disabled={isPending} size="lg" className="flex-1 text-sm md:text-base">
                  {isPending ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "details" && (
          <Form {...detailsForm}>
            <form onSubmit={detailsForm.handleSubmit(onDetailsSubmit)} className="space-y-4">
              <FormField
                name="name"
                control={detailsForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                control={detailsForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="confirmPassword"
                control={detailsForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Confirm password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("otp");
                    otpForm.setValue("secret", "");
                  }}
                  disabled={isPending}
                  size="lg"
                  className="flex-1 text-sm md:text-base"
                >
                  Back
                </Button>
                <Button disabled={isPending} size="lg" className="flex-1 text-sm md:text-base">
                  {isPending ? "Registering..." : "Register"}
                </Button>
              </div>
            </form>
          </Form>
            )}
            
          </CardContent>
        </>
      )}
    </Card>
  );
};
