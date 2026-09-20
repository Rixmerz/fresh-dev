// DEFECT (I002): `onSave` is a function prop → "Serializing functions is not supported".
// `createdAt: Date` is FINE in Fresh 2.x (Date is serializable) → must NOT be reported.
interface BadPropsProps {
  label: string;
  createdAt: Date;
  onSave: () => void;
}

export default function BadProps({ label, createdAt, onSave }: BadPropsProps) {
  return (
    <button type="button" onClick={onSave}>
      {label} ({createdAt.toISOString()})
    </button>
  );
}
