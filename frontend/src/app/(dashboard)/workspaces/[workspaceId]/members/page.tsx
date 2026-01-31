
import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries"; 
import { MembersList } from "@/features/workspaces/components/members-list";

const WorkspaceMembersPage = async () => {
    const user = await getCurrent();

    if (!user) {
        redirect("/signin");
    }

    return (
        <div className="w-full lg:max-w-xl">
            <MembersList />
        </div>
    );
};  

export default WorkspaceMembersPage;