import { CreditCard } from "lucide-react";

type Props = {
  label: string;
  size: "leaderboard" | "rectangle" | "in-content" | "game-bottom";
};

export function AdZone({ label, size }: Props) {
  const classes = {
    leaderboard: "min-h-[90px] max-w-[820px]",
    rectangle: "min-h-[250px] max-w-[300px]",
    "in-content": "min-h-[120px] w-full",
    "game-bottom": "min-h-[120px] w-full"
  };

  return (
    <div className={`mx-auto flex ${classes[size]} items-center justify-center gap-3 rounded-lg border border-dashed border-uniblex-border bg-uniblex-card/35 p-4 text-center text-xs uppercase tracking-[.22em] text-uniblex-gray backdrop-blur`}>
      <CreditCard size={20} className="opacity-70" />
      {label} Ad Zone
    </div>
  );
}
