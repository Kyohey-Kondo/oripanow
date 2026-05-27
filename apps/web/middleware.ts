import { NextRequest, NextResponse } from 'next/server';

const BLOCKED_PATHS = ['/admin', '/dashboard', '/manager', '/admin-internal'];

function checkLocalAuth(request: NextRequest): boolean {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const sep = decoded.indexOf(':');
  if (sep === -1) return false;
  return (
    decoded.slice(0, sep) === process.env.ADMIN_USER &&
    decoded.slice(sep + 1) === process.env.ADMIN_PASS &&
    (process.env.ADMIN_USER?.length ?? 0) > 0
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block well-known admin paths (bot/scanner protection)
  if (BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return new NextResponse(null, { status: 404 });
  }

  const hash = process.env.ADMIN_PATH_HASH;

  // Production: CloudFront Function validates Basic Auth and sets x-admin-validated.
  // Lambda is behind OAC so this header can only originate from CloudFront.
  // Strip the first path segment (the hash, already validated by CloudFront) to get the subpath.
  if (request.headers.get('x-admin-validated') === 'true') {
    const segments = pathname.split('/').filter(Boolean); // ['83de833b', 'giveaway'] or ['83de833b']
    const subpath = '/' + segments.slice(1).join('/');    // '/giveaway' or '/'
    return NextResponse.rewrite(new URL(`/admin-internal${subpath}`, request.url));
  }

  // Local dev: no CloudFront Function, validate directly with hash path + Basic Auth.
  if (hash && (pathname === `/${hash}` || pathname.startsWith(`/${hash}/`))) {
    if (!checkLocalAuth(request)) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }
    const subpath = pathname.slice(`/${hash}`.length) || '/';
    return NextResponse.rewrite(new URL(`/admin-internal${subpath}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
