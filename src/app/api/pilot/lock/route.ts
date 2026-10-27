import { NextResponse } from "next/server";
import { PILOT_COOKIE_NAME } from "@/lib/pilot-gate";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Pilot session locked. Access revoked.",
  });

  res.cookies.set({
    name: PILOT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
