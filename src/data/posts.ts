export type Post = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  publishedAt: string;
  readingTime: string;
  image: string;
  content: string[];
};

export const posts: Post[] = [
  {
    title: "Why Browser Games Are Growing Again",
    slug: "why-browser-games-are-growing-again",
    category: "Industry News",
    excerpt: "Browser games are returning because players want fast access, low friction, and instant entertainment.",
    publishedAt: "2026-06-27",
    readingTime: "4 min read",
    image: "/og-image.png",
    content: [
      "Browser games are becoming relevant again because modern devices and WebGL technology now allow interactive experiences to run smoothly without large downloads.",
      "For creators, this means easier distribution. A user can open a link, play instantly, and share the experience with friends without installing anything.",
      "For Uniblex, the browser-first approach creates a strong foundation for game discovery, original articles, tutorials, and community growth."
    ]
  },
  {
    title: "How 3D Artists Can Build a Strong Game Portfolio",
    slug: "how-3d-artists-can-build-a-strong-game-portfolio",
    category: "3D Art",
    excerpt: "A game portfolio should show clean presentation, optimized assets, and real production thinking.",
    publishedAt: "2026-06-26",
    readingTime: "5 min read",
    image: "/brand/gaming.png",
    content: [
      "A strong 3D game portfolio is not only about beautiful renders. It should also show topology, textures, engine-ready assets, and optimization awareness.",
      "Recruiters and clients want to see that an artist understands real game production limits. Presenting wireframes, texture sets, and in-engine screenshots helps build trust.",
      "Uniblex can use this content direction to publish helpful tutorials and attract organic traffic from artists and game developers."
    ]
  },
  {
    title: "WebGL Game Pages: SEO Checklist",
    slug: "webgl-game-pages-seo-checklist",
    category: "Game Dev",
    excerpt: "Game pages need unique content, fast loading, structured data, screenshots, and mobile-friendly design.",
    publishedAt: "2026-06-25",
    readingTime: "6 min read",
    image: "/brand/horizontal-lockup.png",
    content: [
      "A WebGL game page should include a unique title, original description, screenshots, tags, genre, controls, and technical notes where useful.",
      "The game player should load only after the user clicks play. This helps improve performance and keeps the initial page lighter.",
      "Structured data, canonical URLs, and clean slugs can help search engines understand the page better."
    ]
  }
];

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}
