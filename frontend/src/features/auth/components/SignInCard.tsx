"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { loginSchema } from "../schemas";
import { useLogin } from "../api/use-login";

export const SignInCard = () => {
  const { mutate, isPending } = useLogin();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const email = searchParams.get("email");
    
    if (error === "account_exists" && email) {
      toast.error(
        `An account with ${email} already exists. Please sign in with your existing account.`,
        { duration: 5000 }
      );
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate({email: values.email, password: values.password});
  };

  return (
    <Card className="w-full max-w-[487px] bg-white rounded-lg shadow-lg border-none mx-auto">
      <CardHeader className="flex flex-col items-center justify-center text-center p-6 md:p-7 pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">Welcome back!</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-7 pt-4 flex flex-col gap-y-4">
<a
          href="/auth/oauth?provider=google"
          className="w-full"
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full border border-gray/20 shadow-none rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm md:text-base"
          >
            <FcGoogle className="mr-2 size-5" />
            Sign in with Google
          </Button>
        </a>
        <a
          href="/auth/oauth?provider=github"
          className="w-full"
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full border border-gray/20 shadow-none rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm md:text-base"
          >
            <FaGithub className="mr-2 size-5" />
            Sign in with Github
          </Button>
        </a>
      </CardContent>
      <div className="px-6 md:px-7 flex items-center gap-2 md:gap-3">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">or Sign in with Email</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>
      <CardContent className="p-6 md:p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="email"
              control={form.control}
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
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Password"
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
              Sign in
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
