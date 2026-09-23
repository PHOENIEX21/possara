import possaraMark from "../assets/possara-mark.svg";

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return <img src={possaraMark} alt="" className={`${className} object-contain`} aria-hidden="true" />;
}