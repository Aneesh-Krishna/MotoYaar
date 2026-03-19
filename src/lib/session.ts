import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Memoized getServerSession — within a single request, this is called once
 * regardless of how many layouts/pages invoke it.
 */
export const getSession = cache(() => getServerSession(authOptions));
