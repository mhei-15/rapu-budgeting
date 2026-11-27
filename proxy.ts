import { NextResponse, type NextRequest } from "next/server";

/**
 * Temporary protection until real sign-in arrives: the whole app asks for APP_PASSWORD
 * (any username). Without it, anyone who found the URL could spend your Claude credit.
 */
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse("APP_PASSWORD is not set on the server.", { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given === password) return NextResponse.next();
  }
  return new NextResponse("Kirjaudu sisään", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Rapu", charset="UTF-8"' },
  });
}

export const config = {
  // Icons and the manifest stay public so the app can be added to the home screen.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)"],
};
