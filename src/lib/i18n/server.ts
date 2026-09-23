import { cookies } from "next/headers";
import { isLocale, type Locale } from "./translate";
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("dala-locale")?.value;
  return isLocale(value) ? value : "ru";
}
