"use client";

import { MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "./Sidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export const MobileSidebar = () => {
    const [isOpen, setIsOpen ] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <Sheet modal={false} open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button size="icon" variant="secondary" className="lg:hidden">
                    <MenuIcon className="size-4 text-neutral-500" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[264px] sm:w-[280px] bg-[#1e3a5f] border-r border-white/10">
                <Sidebar />
            </SheetContent>
        </Sheet>
    )
}