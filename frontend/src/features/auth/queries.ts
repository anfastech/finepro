// only wanna use in server action 
// "use server"; 

import { createSessionClient } from "@/lib/appwrite";

// protect 
export const getCurrent = async () => {
  try {
    const { account } = await createSessionClient();

    return await account.get();
  } catch {
    return null;
    // redirect('/something')
  }
};
