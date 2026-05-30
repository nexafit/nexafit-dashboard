type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 36, className = '' }: LogoProps) {
  const logoSrc = `${import.meta.env.BASE_URL}nexa-logo.png`;

  return (
    <div className={`grid place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-2 shadow-[0_0_35px_rgba(0,230,153,0.18)] ${className}`}>
      <img src={logoSrc} alt="NexaFit" width={size} height={size} className="object-contain" />
    </div>
  );
}
