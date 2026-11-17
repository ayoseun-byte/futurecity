import React from "react";

export default function ExternalLinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      {...props}
    >
      <path
        d="M9.5 6.5V9.5C9.5 9.76522 9.39464 10.0196 9.20711 10.2071C9.01957 10.3946 8.76522 10.5 8.5 10.5H2.5C2.23478 10.5 1.98043 10.3946 1.79289 10.2071C1.60536 10.0196 1.5 9.76522 1.5 9.5V3.5C1.5 3.23478 1.60536 2.98043 1.79289 2.79289C1.98043 2.60536 2.23478 2.5 2.5 2.5H5.5V3.5H2.5V9.5H8.5V6.5H9.5ZM6.5 1.5V2.5H8.793L4.8965 6.3965L5.6035 7.1035L9.5 3.207V5.5H10.5V1.5H6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
