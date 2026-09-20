'use client';

import type { AnchorHTMLAttributes } from 'react';
import { trackEvent } from '@/lib/gtag';

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  eventParams?: Record<string, string>;
};

export function TrackedLink({ eventName, eventParams, ...rest }: TrackedLinkProps) {
  return <a {...rest} onClick={() => trackEvent(eventName, eventParams)} />;
}
