import { Head } from "$fresh/runtime.ts";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <h1>404 - Page not found</h1>
      <a href="/">Go back home</a>
    </>
  );
}
