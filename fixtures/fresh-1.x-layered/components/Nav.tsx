export function Nav({ user }: { user?: string }) {
  return (
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/blog/hello-world">Blog</a>
      <a href="/pricing">Pricing</a>
      <span>{user ?? "guest"}</span>
    </nav>
  );
}
