import { AVATARS } from "./constants";

type Props = {
  selected: string;
  onSelect: (avatar: string) => void;
};

export function AvatarGrid({ selected, onSelect }: Props) {
  return (
    <div className="avatar-grid">
      {AVATARS.map((av) => (
        <button
          key={av}
          type="button"
          className={`avatar-opt${selected === av ? " selected" : ""}`}
          onClick={() => onSelect(av)}
        >
          {av}
        </button>
      ))}
    </div>
  );
}
