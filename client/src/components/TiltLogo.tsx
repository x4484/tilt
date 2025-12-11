interface TiltLogoProps {
  className?: string;
}

export function TiltLogo({ className = "" }: TiltLogoProps) {
  return (
    <div className={`font-mono font-bold text-primary ${className}`} style={{ textShadow: "0 0 10px hsl(120 100% 50% / 0.8), 0 0 20px hsl(120 100% 50% / 0.5)" }}>
      <pre className="text-xs sm:text-sm leading-tight">
{`+---+
|T|I|L|T|
+---+`}
      </pre>
    </div>
  );
}

export function TiltLogoSimple({ className = "" }: TiltLogoProps) {
  return (
    <span 
      className={`font-mono font-bold tracking-wider ${className}`}
      style={{ textShadow: "0 0 10px hsl(120 100% 50% / 0.8), 0 0 20px hsl(120 100% 50% / 0.5)" }}
    >
      $TILT
    </span>
  );
}
