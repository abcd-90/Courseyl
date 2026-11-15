import { redirect } from "next/navigation";
import { getFullSettings } from "@/lib/settings";

export default async function PlansRedirectPage() {
  const settings = await getFullSettings();
  const isPricingVisible =
    settings?.structure?.navLinks?.find(
      (l) => l.id === "pricing" || l.href.includes("pricing")
    )?.visible !== false;

  if (!isPricingVisible) {
    redirect("/dashboard");
  }
  redirect("/pricing");
}

