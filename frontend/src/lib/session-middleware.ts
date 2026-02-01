import "server-only";

import { createClient } from '@supabase/supabase-js'
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/config";

type AdditionalContext = {
    Variables: {
        user: any;
    }
}

export const sessionMiddleware = createMiddleware<AdditionalContext>(
    async (c, next) => {
        const token = getCookie(c, "sb-access-token") || getCookie(c, "sb-refresh-token");
        
        if (!token) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        // Create Supabase client with token
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                detectSessionInUrl: false
            },
            global: {
                headers: {
                    cookie: c.req.header("cookie")
                }
            }
        });

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        c.set("user", user);

        await next();
    },  
)