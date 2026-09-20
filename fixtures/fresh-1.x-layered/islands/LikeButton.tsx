import { useSignal } from "@preact/signals";

interface LikeButtonProps {
  postId: string;
  initial: number;
}

// 1.x island id: likebutton_default (name "LikeButton", export "default").
export default function LikeButton({ postId, initial }: LikeButtonProps) {
  const likes = useSignal(initial);
  return (
    <button type="button" data-post={postId} onClick={() => likes.value++}>
      Like {likes.value}
    </button>
  );
}
