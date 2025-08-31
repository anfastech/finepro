import Image from "next/image";

import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface WorkspaceAvatarProps {
    image?: string;
    name: string;
    className?: string;
}


export const WorkspaceAvatar = ({ 
    image,
    name,
    className 
}: WorkspaceAvatarProps) => {
    if (image) {
        return (
            <div className={cn(
                "relative size-8 rounded-md overflow-hidden", 
                className
            )}>
                <Image src={image} alt={name} fill className="object-cover"/>
            </div>
        );
    }

    return (
        <Avatar className={cn("size-10 rounded-md", className)}>
            <AvatarFallback className="text-white bg-blue-600 font-semibold text-lg uppercase rounded-md">
                {name.charAt(0).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    )

}