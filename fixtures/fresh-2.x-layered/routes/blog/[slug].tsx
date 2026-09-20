import { page } from "fresh";
import { define } from "../../utils.ts";
import { PostBody } from "../../components/PostBody.tsx";
import CommentsBox from "../../islands/Comments.tsx";

// page + handler (GET) — handler passes { slug } to the page via page().
export const handler = define.handlers({
  GET(ctx) {
    return page({ slug: ctx.params.slug });
  },
});

export default define.page<typeof handler>(function Post({ data }) {
  return (
    <article>
      <h1>{data.slug}</h1>
      <PostBody slug={data.slug} />
      <CommentsBox postId={data.slug} />
    </article>
  );
});
