// Used by islands/Comments.tsx → ends up in the client bundle.
export function Avatar({ name }: { name: string }) {
  return <span class="avatar">{name.charAt(0).toUpperCase()}</span>;
}
