// DEFECT (I008): touches `document` during render with no IS_BROWSER / useEffect
// guard. Islands are also rendered on the server, where `document` is undefined.
export default function NoGuard({ title }: { title: string }) {
  document.title = title;
  return <span>{title}</span>;
}
