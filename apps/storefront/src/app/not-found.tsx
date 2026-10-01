import { redirect } from "next/navigation";

/** Paths outside any locale: the middleware picks the visitor's locale from "/". */
export default function GlobalNotFound() {
  redirect("/");
}
