export type IconProps = {
  name: string;
  className?: string;
};

export const Icon = ({ name, className = "" }: IconProps) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);
