import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MemberAvatarProps {
    name: string;
    className?: string;
    fallbackClassName?: string;
    avatarColor?: {
        bg: string;
        text: string;
    };
}

// Extended color palette with light backgrounds and darker text
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

// Generate consistent color from name (fallback for users without stored color)
const getAvatarColorFromName = (name: string) => {
    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const MemberAvatar = ({ 
    name,
    className,
    fallbackClassName,
    avatarColor
}: MemberAvatarProps) => {
    // Use stored color if available, otherwise generate from name
    const color = avatarColor || getAvatarColorFromName(name);

    return (
        <Avatar className={cn("size-5 transition border border-neutral-300 rounded-full", className)}>
            <AvatarFallback className={cn(
                `${color.bg} ${color.text} font-medium flex items-center justify-center`,
                fallbackClassName
            )}>
                {name.charAt(0).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    )

}