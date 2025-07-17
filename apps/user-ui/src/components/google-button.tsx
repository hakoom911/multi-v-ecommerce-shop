type Props = {};

function GoogleButton(props: Props) {
  return (
    <div className="w-full flex justify-center">
      <button
        type="button"
        className={
          "h-[46px] py-2 px-4 inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ring-offset-background select-none duration-200  border border-input hover:bg-accent hover:text-accent-foreground"
        }
      >
        <svg
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="google"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
          className="mr-2 size-4"
        >
          <path
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            fill="currentColor"
          />
        </svg>
        <span className="text-[16px] opacity-[.8] font-Poppins">
          Sign In with Google
        </span>
      </button>
    </div>
  );
}

export default GoogleButton;
