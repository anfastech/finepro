"use client";

import { Search } from "lucide-react";
import { DottedSeparator } from "./dotted-separator";
import { Navigation } from "./Navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Projects } from "@/components/projects";
import { Teams } from "./Teams";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export const Sidebar = () => {

  return (
    <aside className="h-full bg-[#1e3a5f] p-4 w-full flex flex-col text-white">
      <div className="mb-4 w-full">
        <WorkspaceSwitcher />
      </div>
      <div className="mb-4 w-full">
        <Separator className="my-4 bg-white/20" />
      </div>
      
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus-visible:border-white/40"
          />
        </div>
      </div>

      {/* <div className="mb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-md">
          <div className="size-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
            {avatarInitial}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">My work</span>
          </div>
        </div>
      </div> */}

      <DottedSeparator className="my-4" color="rgba(255,255,255,0.2)" />
      
      <Navigation />
      
      <DottedSeparator className="my-4" color="rgba(255,255,255,0.2)" />
      
      <Teams />
      
      <DottedSeparator className="my-4" color="rgba(255,255,255,0.2)" />
      
      <div className="flex-1 overflow-y-auto">
        <Projects />
      </div>

      <div className="hidden mt-auto pt-4">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          Invite people
        </Button>
      </div>
    </aside>
  );
};
