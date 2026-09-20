import { define } from "../../utils.ts";

const POSTS = ["hello-world", "second-post"];

export default define.page(function BlogIndex() {
  return (
    <ul>
      {POSTS.map((slug) => (
        <li key={slug}>
          <a href={`/blog/${slug}`}>{slug}</a>
        </li>
      ))}
    </ul>
  );
});
