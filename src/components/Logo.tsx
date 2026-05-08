import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <div className={cn("flex items-center", className)}>
      {/* Bright mode logo - defaults to /public/logo.png */}
      <img src="/drkolo_logo1-removebg-preview (1).png" alt="Dr Koło" className="h-full w-auto dark:hidden" />
      
      {/* Dark mode logo - defaults to /public/inverted-image.png */}
      <img src="/inverted-image.png" alt="Dr Koło" className="h-full w-auto hidden dark:block" />
    </div>
  );
};