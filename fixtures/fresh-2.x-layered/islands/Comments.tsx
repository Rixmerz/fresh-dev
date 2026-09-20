import { useSignal } from "@preact/signals";
import { Avatar } from "../components/Avatar.tsx";
import { formatDate } from "../lib/format.ts";

interface Comment {
  author: string;
  body: string;
  at: string;
}

// Two islands in one file: every exported function is an island.
// Named export → island "Comments".
export function Comments({ items }: { items: Comment[] }) {
  return (
    <ul class="comments">
      {items.map((c) => (
        <li key={c.at}>
          <Avatar name={c.author} /> {c.body} <time>{formatDate(c.at)}</time>
        </li>
      ))}
    </ul>
  );
}

// Default export → island named after the file ("Comments"), not "CommentsBox".
export default function CommentsBox({ postId }: { postId: string }) {
  const draft = useSignal("");
  return (
    <section class="comments-box">
      <Comments items={[]} />
      <input
        value={draft.value}
        onInput={(e) =>
          draft.value = (e.currentTarget as HTMLInputElement).value}
      />
      <button type="button" onClick={() => console.log(postId, draft.value)}>
        Post
      </button>
    </section>
  );
}
