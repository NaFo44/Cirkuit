import type { SVGProps } from "react";

export function NotGateIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M2 11h4v2H2zM6 5h2v14H6zM8 7h2v2H8zM10 9h2v2h-2zM12 11h2v2h-2zM10 13h2v2h-2zM8 15h2v2H8zM14 8h4v2h-4zM14 10h2v4h-2zM18 10h2v4h-2zM14 14h4v2h-4zM20 11h4v2h-4z" />
        </svg>
    );
}
