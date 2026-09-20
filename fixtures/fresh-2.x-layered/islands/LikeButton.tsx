import { useSignal } from "@preact/signals";

interface LikeButtonProps {
  postId: string;
  initial: number;
}

// Island name (2.x): default export → named after the file → "LikeButton".
export default function LikeButton({ postId, initial }: LikeButtonProps) {
  const likes = useSignal(initial);
  return (
    <button type="button" data-post={postId} onClick={() => likes.value++}>
      Like {likes.value}
    </button>
  );
}
