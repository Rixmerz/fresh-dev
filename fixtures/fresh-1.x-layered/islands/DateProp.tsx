// DEFECT (I002, 1.x only): Fresh 1.x cannot serialize `Date` island props
// (docs: pass an ISO string instead). `title: string` is fine.
interface DatePropProps {
  publishedAt: Date;
  title: string;
}

export default function DateProp({ publishedAt, title }: DatePropProps) {
  return <time dateTime={publishedAt.toISOString()}>{title}</time>;
}
