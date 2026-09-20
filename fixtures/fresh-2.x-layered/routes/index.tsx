import { define } from "../utils.ts";
import { Hero } from "../components/Hero.tsx";
import LikeButton from "../islands/LikeButton.tsx";

export default define.page(function Home() {
  return (
    <main>
      <Hero title="Welcome to the blog" />
      <LikeButton postId="home" initial={0} />
    </main>
  );
});
