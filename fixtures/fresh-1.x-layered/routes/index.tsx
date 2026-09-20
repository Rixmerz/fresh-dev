import LikeButton from "../islands/LikeButton.tsx";
import Clock from "../islands/widgets/Clock.tsx";

export default function Home() {
  return (
    <main>
      <h1>Welcome to the blog</h1>
      <Clock tz="UTC" />
      <LikeButton postId="home" initial={0} />
    </main>
  );
}
