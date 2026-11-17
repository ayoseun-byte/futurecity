import React from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
}

const spinner = (
  <svg
    className={styles.spinner}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <circle
      className={styles.spinnerCircle}
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className={styles.spinnerPath}
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    ></path>
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    loading = false,
    icon,
    children,
    className = "",
    disabled,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  const buttonClasses = [styles.button, styles[`variant-${variant}`], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...rest}
    >
      <span className={styles.content}>
        {loading ? (
          <span aria-hidden>{spinner}</span>
        ) : icon ? (
          <span aria-hidden>{icon}</span>
        ) : null}
        {children}
      </span>
    </button>
  );
});

export default Button;
