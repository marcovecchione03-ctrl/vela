import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export default async function PlatformRootPage() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/auth/login");
  }
}
