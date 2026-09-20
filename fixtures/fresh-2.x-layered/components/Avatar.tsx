// Used by islands/Comments.tsx → ends up in the client bundle (classification: client).
export function Avatar({ name }: { name: string }) {
  return <span class="avatar">{name.charAt(0).toUpperCase()}</span>;
}
