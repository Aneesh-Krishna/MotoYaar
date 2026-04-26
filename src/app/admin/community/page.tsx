import { getAdminSession } from "@/lib/adminSession";
import { adminService } from "@/services/adminService";
import { notFound } from "next/navigation";
import { AdminCommunityClient } from "./AdminCommunityClient";

export default async function AdminCommunityPage() {
  const session = await getAdminSession();
  if (!session.admin) notFound();

  const allPosts = await adminService.getAllPosts();

  return <AdminCommunityClient initialPosts={allPosts} />;
}
