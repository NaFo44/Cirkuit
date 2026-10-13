import type { SVGProps } from "react";

export function MemoryIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M0 11h4v2H0zM4 4h2v16H4zM6 5h12v2H6zM6 17h12v2H6zM18 7h2v10h-2zM20 11h4v2h-4zM10 0h2v5h-2z" />
        </svg>
    );
}
