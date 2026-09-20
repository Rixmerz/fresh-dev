import type { Handlers, PageProps } from "$fresh/server.ts";
import { PostBody } from "../../components/PostBody.tsx";
import CommentsBox from "../../islands/Comments.tsx";

interface Data {
  slug: string;
  title: string;
}

// 1.x page + handler: Handlers<Data> with (req, ctx) and ctx.render(data).
export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    return ctx.render({
      slug: ctx.params.slug,
      title: `Post ${ctx.params.slug}`,
    });
  },
};

export default function Post({ data }: PageProps<Data>) {
  return (
    <article>
      <h1>{data.title}</h1>
      <PostBody slug={data.slug} />
      <CommentsBox postId={data.slug} />
    </article>
  );
}
