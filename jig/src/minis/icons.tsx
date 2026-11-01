import { Icon } from "../homes/atoms";

export const PinIcon = ({ filled }: { filled?: boolean }) => <Icon name="pin" size={12} weight={filled ? "fill" : "regular"} />;
