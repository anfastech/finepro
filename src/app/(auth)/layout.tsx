"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();
  const isSignIn = pathname === "/signin";

  return (
    <main className="auth-diagonal-stripe min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 py-2 md:px-6">
        <nav className="flex justify-between items-center mb-4 md:mb-0">
          <div className="flex-1 hidden lg:block"></div>
          <div className="flex-1 flex h-28 items-baseline-last justify-center md:justify-center">
            <Image 
              src="/logo.svg" 
              height={40} 
              width={120} 
              alt="logo" 
              className="brightness-0 invert w-auto h-6 md:h-10" 
            />
          </div>
          <div className="flex-1 flex justify-end items-center gap-2 md:gap-3">
            <span className="text-white text-xs md:text-sm hidden sm:inline">
              Already have an account?
            </span>
            <Button 
              asChild 
              variant="secondary" 
              className="bg-[#1e3a5f] text-white hover:bg-[#1a2f4f] border border-white/20 rounded-md text-xs md:text-sm px-3 md:px-4 py-2 h-auto"
            >
              <Link href={isSignIn ? "/signup" : "/signin"}>
                {isSignIn ? "Sign up" : "Log In"}
              </Link>
            </Button>
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center md:pt-0 md:pb-0 min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-200px)]">
            {children}
        </div>
        <div className="flex justify-center pb-2 md:pb-4">
          <Select defaultValue="en">
            <SelectTrigger className="w-[120px] md:w-[140px] bg-[#1e3a5f] text-white border-white/20 hover:bg-[#1a2f4f] text-xs md:text-sm h-9 md:h-12">
              <Globe className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="other">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </main>
  );
};

export default AuthLayout;
