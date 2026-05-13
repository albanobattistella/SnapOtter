import type { SVGProps } from "react";

export function ImageEditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 17C7 12 12 7 17 7" />
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="17" cy="7" r="1.5" />
    </svg>
  );
}
