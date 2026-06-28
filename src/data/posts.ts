export type Post = {
  title: string;
  slug: string;
  category: "Game Dev" | "3D Art" | "Tutorials" | "Industry News";
  excerpt: string;
  publishedAt: string;
  readingTime: string;
  image: string;
  content: string[];
};

const sharedImages = ["/og-image.png", "/brand/gaming.png", "/brand/gaming-icon.png", "/brand/horizontal-lockup.png", "/icon-512.png"];

export const posts: Post[] = [
  {
    title: "Why Browser Games Are Growing Again",
    slug: "why-browser-games-are-growing-again",
    category: "Industry News",
    excerpt: "Modern browser games are winning attention because they remove downloads, reduce friction, and let players try an idea instantly.",
    publishedAt: "2026-06-27",
    readingTime: "7 min read",
    image: sharedImages[0],
    content: [
      "Browser games are becoming relevant again because the web platform is no longer limited to simple static pages. WebGL, WebAssembly, modern JavaScript engines, gamepad support, pointer lock, and better mobile browsers have made it possible to run interactive experiences with impressive visual quality. The biggest advantage is still access. A player can open a link, understand the idea, and begin playing without a store page, installer, or device-specific download.",
      "For independent creators, that frictionless access changes how a game can be tested and shared. A prototype can be placed in front of a client, friend, publisher, or community within seconds. The same page can include development notes, screenshots, controls, credits, and update history. That makes the game page both a playable demo and a content asset.",
      "Uniblex is built around this shift. The platform combines WebGL showcases with original writing so every game has context around design, art, production, and player experience. That combination is more useful than a simple iframe page because it helps search engines understand the topic and helps visitors learn something even before they press play."
    ]
  },
  {
    title: "How 3D Artists Can Build a Strong Game Portfolio",
    slug: "how-3d-artists-can-build-a-strong-game-portfolio",
    category: "3D Art",
    excerpt: "A game art portfolio should show production thinking, not only polished renders.",
    publishedAt: "2026-06-26",
    readingTime: "8 min read",
    image: sharedImages[1],
    content: [
      "A strong game portfolio is not only a gallery of beautiful final images. Clients and studios want to know whether an artist understands how assets survive real production. That means topology, UV layout, texture budgets, scale, naming, file organization, and in-engine presentation all matter. A clean render can attract attention, but production evidence builds trust.",
      "For each hero asset, include one final shot, one wireframe or clay view, one texture breakdown, and one engine screenshot. Keep descriptions short but useful. Explain the target platform, triangle budget, texture sizes, tools used, and any technical decisions that protected performance. This gives reviewers the information they need without forcing them to guess.",
      "Uniblex can publish portfolio breakdowns as educational articles because they are useful for artists and friendly to organic search. A post about a single prop, vehicle, environment piece, or shader can become long-form content when it explains the problem, constraints, workflow, and lessons learned."
    ]
  },
  {
    title: "WebGL Game Pages: SEO Checklist",
    slug: "webgl-game-pages-seo-checklist",
    category: "Game Dev",
    excerpt: "A game page needs unique copy, schema, screenshots, fast loading, and a player that does not punish Core Web Vitals.",
    publishedAt: "2026-06-25",
    readingTime: "9 min read",
    image: sharedImages[3],
    content: [
      "A WebGL game page should never be only an embedded player. Search engines and visitors both need context. Start with a unique H1, a useful description, genre, tags, controls, screenshots, and an explanation of the gameplay loop. Add a clear play button and load the iframe only after the user chooses to start. This improves performance and avoids wasting bandwidth for visitors who are still reading.",
      "Structured data matters because it gives search engines a clearer description of the page. GameApplication schema can include the title, genre, operating system, description, and application category. BlogPosting schema should be used for articles that discuss the game. Canonical URLs help avoid duplicate content when tracking links or alternate paths are used.",
      "Performance is part of SEO. Compress images, use the Next.js Image component, avoid blocking third-party scripts, and keep the game bundle out of the initial page load. If the game build is large, host it on reliable storage and document the expected wait time so the experience feels intentional instead of broken."
    ]
  },
  {
    title: "A Practical Pipeline for WebGL Build Uploads",
    slug: "practical-pipeline-for-webgl-build-uploads",
    category: "Tutorials",
    excerpt: "A simple upload pipeline keeps browser games organized, fast, and easier to maintain after launch.",
    publishedAt: "2026-06-24",
    readingTime: "7 min read",
    image: sharedImages[2],
    content: [
      "A reliable WebGL upload workflow starts before the build is exported. Name the project, version, and build folder clearly. Keep a release note that lists the engine version, compression settings, known issues, target devices, and the date of upload. This small habit prevents confusion when a game receives multiple updates.",
      "The build should be compressed and hosted in storage designed for static assets. Supabase Storage, Cloudinary, and S3-compatible providers can all work depending on the project's needs. The public game page should store metadata separately from the actual build files, including title, slug, description, cover image, tags, genre, status, and iframe URL.",
      "Before publishing, test on desktop Chrome, desktop Firefox, Android Chrome, and Safari if possible. Check that the loading screen appears, the game receives keyboard or pointer input, the player can exit fullscreen, and the page still scrolls normally after the iframe loses focus."
    ]
  },
  {
    title: "Designing Game Controls for Browser Players",
    slug: "designing-game-controls-for-browser-players",
    category: "Game Dev",
    excerpt: "Browser game controls should be obvious, forgiving, and documented directly on the game page.",
    publishedAt: "2026-06-23",
    readingTime: "6 min read",
    image: sharedImages[0],
    content: [
      "Controls are part of the first impression. A browser player may not know whether a game expects keyboard, mouse, touch, or gamepad input. The page should explain the primary controls before the iframe loads and repeat them near the player. This reduces frustration and helps users decide whether the game fits their device.",
      "Keyboard layouts should support both arrow keys and WASD when possible. Mouse games should avoid hidden pointer lock surprises by asking for input after the player clicks play. Touch support should be explicit instead of assumed. If the game is not comfortable on phones, say so clearly and provide the best recommended device.",
      "Good control documentation is also content. A short section explaining movement, actions, pause, restart, and accessibility notes makes the page more complete and useful. It supports players and adds original text that helps the page avoid thin-content problems."
    ]
  },
  {
    title: "Making 3D Game Assets Load Faster on the Web",
    slug: "making-3d-game-assets-load-faster-on-the-web",
    category: "3D Art",
    excerpt: "Fast web games depend on asset discipline: texture sizes, mesh budgets, compression, and smart loading.",
    publishedAt: "2026-06-22",
    readingTime: "8 min read",
    image: sharedImages[4],
    content: [
      "The fastest WebGL game is usually the one with the most disciplined asset pipeline. Large uncompressed textures, unnecessary mesh density, long audio files, and duplicate materials can make a browser experience feel heavy before gameplay even starts. The goal is not to make everything tiny. The goal is to spend detail where the player will notice it.",
      "Start with texture budgets. Use smaller maps for props that are seen at distance, combine materials where sensible, and compress assets in formats supported by the target engine. Meshes should be checked for hidden faces, excessive bevels, and accidental high-density exports. These small fixes add up quickly in a web build.",
      "A good Uniblex game page can document the optimization choices behind a project. That turns technical production work into educational content for other artists and helps visitors understand why the game loads quickly."
    ]
  },
  {
    title: "How to Write Game Descriptions That Help Players",
    slug: "how-to-write-game-descriptions-that-help-players",
    category: "Tutorials",
    excerpt: "Useful game descriptions explain the fantasy, the loop, the controls, and why someone should try one more run.",
    publishedAt: "2026-06-21",
    readingTime: "6 min read",
    image: sharedImages[1],
    content: [
      "A game description should do more than describe a genre. Players need to know what they will do, what makes the game interesting, and how quickly they can understand it. A strong description introduces the player fantasy, explains the main loop, and gives enough detail to set expectations without spoiling every moment.",
      "Avoid generic phrases such as fun gameplay, amazing graphics, or addictive action unless they are supported by specifics. Instead, mention the type of decisions the player makes, the session length, the progression system, and the main challenge. This helps the page feel original and trustworthy.",
      "For search visibility, the description should naturally include the game type, platform, and key features. For users, it should remain readable and direct. The best result is a paragraph that sounds human and still gives search engines enough topic signals."
    ]
  },
  {
    title: "The Minimum Content Stack Before AdSense Submission",
    slug: "minimum-content-stack-before-adsense-submission",
    category: "Industry News",
    excerpt: "Before applying for AdSense, a site should look complete, useful, original, and easy to navigate.",
    publishedAt: "2026-06-20",
    readingTime: "9 min read",
    image: sharedImages[3],
    content: [
      "AdSense approval is never guaranteed, but a website has a better foundation when it looks complete and useful. That means real navigation, original articles, privacy policy, terms of service, about page, contact page, fast performance, and no obvious placeholder content. Thin pages and empty sections make the site look unfinished.",
      "A practical goal is to publish at least fifteen to twenty original content pages before submission. For Uniblex, those pages can include game detail pages, tutorials, production breakdowns, 3D art articles, and browser gaming guides. Each page should have a clear purpose and enough detail to help a real visitor.",
      "Ad placements should be planned but not overwhelming. Use header, sidebar, in-content, and below-player zones carefully. The experience should remain readable on mobile because many approval and quality signals depend on how the site behaves for everyday visitors."
    ]
  },
  {
    title: "Core Web Vitals for Game Showcase Websites",
    slug: "core-web-vitals-for-game-showcase-websites",
    category: "Game Dev",
    excerpt: "Game pages can be heavy, so performance needs to be designed into images, scripts, iframes, and layout stability.",
    publishedAt: "2026-06-19",
    readingTime: "8 min read",
    image: sharedImages[0],
    content: [
      "Core Web Vitals are especially important for game showcase websites because games often bring large files, animated media, third-party scripts, and embedded players. The public page should load quickly even when the game itself is large. This is why the player should be lazy loaded after a click instead of included in the initial render.",
      "Largest Contentful Paint can be improved with optimized hero images, restrained fonts, and predictable layout dimensions. Cumulative Layout Shift can be reduced by reserving stable space for images, ads, players, and cards. Interaction responsiveness benefits from avoiding expensive client-side work during the first load.",
      "A polished game website should feel fast before the game starts. If visitors can read the description, inspect screenshots, and press play without layout jumps, the platform feels more premium and more trustworthy."
    ]
  },
  {
    title: "Planning Blog Categories for a Game Dev Platform",
    slug: "planning-blog-categories-for-game-dev-platform",
    category: "Tutorials",
    excerpt: "Clear categories make a content platform easier to scan, easier to manage, and easier to grow.",
    publishedAt: "2026-06-18",
    readingTime: "6 min read",
    image: sharedImages[2],
    content: [
      "Categories should describe how readers think, not how the database happens to be organized. For Uniblex, the useful starting set is Game Dev, 3D Art, Tutorials, and Industry News. Each category has a clear audience and can support multiple long-form topics without becoming too broad.",
      "Game Dev can cover design notes, WebGL performance, controls, and publishing. 3D Art can cover asset creation, optimization, presentation, and breakdowns. Tutorials can show practical workflows step by step. Industry News can discuss browser gaming trends and creator opportunities.",
      "A category system also helps the admin workflow. Mohsin can draft an article, assign a category, add a featured image, set reading time, and publish when the page has enough value. This keeps the site organized as content grows."
    ]
  },
  {
    title: "What Every Game Detail Page Should Include",
    slug: "what-every-game-detail-page-should-include",
    category: "Game Dev",
    excerpt: "A complete game page includes more than a play button. It should answer the player's practical questions.",
    publishedAt: "2026-06-17",
    readingTime: "7 min read",
    image: sharedImages[4],
    content: [
      "A strong game detail page answers four questions quickly: what is this game, how do I play, why should I care, and what device works best. The title and description introduce the idea. The controls section removes confusion. The highlights section explains what makes the game worth trying.",
      "Technical notes are useful when the project is browser-based. Mention if the game is best played on desktop, whether fullscreen is supported, and whether the first load may take a moment. This turns possible friction into clear communication.",
      "The page should also support growth. Tags, genre, related articles, screenshots, structured data, and ad zones all help the page fit into the wider platform. A game page becomes a durable content asset instead of a temporary demo link."
    ]
  },
  {
    title: "Creating Original Tutorial Content from Your Own Workflow",
    slug: "creating-original-tutorial-content-from-your-own-workflow",
    category: "Tutorials",
    excerpt: "The easiest original tutorials come from documenting real decisions while building games and assets.",
    publishedAt: "2026-06-16",
    readingTime: "7 min read",
    image: sharedImages[1],
    content: [
      "Original tutorial content does not require inventing a huge course every week. The best starting point is your own workflow. When you solve a problem while modeling, texturing, exporting, optimizing, or publishing a game, write down the steps and explain why each decision mattered.",
      "A useful tutorial usually has a clear problem, tools used, steps taken, mistakes avoided, and a final checklist. Screenshots make the page stronger, but the written explanation is what helps visitors understand the reasoning. This format also works well for SEO because each article targets a specific question.",
      "For Uniblex, workflow-based tutorials can connect directly to game pages. A game can link to the article that explains its art style, player controls, optimization process, or WebGL publishing setup. That internal linking makes the platform feel connected and professional."
    ]
  },
  {
    title: "Safe Ad Placement for Browser Game Pages",
    slug: "safe-ad-placement-for-browser-game-pages",
    category: "Industry News",
    excerpt: "Ads should support monetization without blocking play, confusing users, or damaging mobile readability.",
    publishedAt: "2026-06-15",
    readingTime: "6 min read",
    image: sharedImages[3],
    content: [
      "Ad placement on a browser game site needs restraint. A header leaderboard can work well above content, a rectangle can support longer pages, and a below-player zone can appear after the game frame. In-content placements should be spaced naturally between paragraphs rather than interrupting the first few lines.",
      "The game player itself should remain the priority. Avoid overlays that block controls, accidental clicks near important buttons, or ad units that push the player down suddenly. Stable dimensions matter because layout shifts feel unprofessional and can hurt quality metrics.",
      "Admin-controlled ad zones are helpful because monetization can be adjusted without redeploying the site. During review or early launch, zones can be inactive or represented by clean placeholders. After approval, real provider code can be enabled carefully."
    ]
  },
  {
    title: "A Launch Checklist for Uniblex Content Pages",
    slug: "launch-checklist-for-uniblex-content-pages",
    category: "Tutorials",
    excerpt: "Before publishing a page, check its title, slug, image, content depth, links, schema, and mobile layout.",
    publishedAt: "2026-06-14",
    readingTime: "8 min read",
    image: sharedImages[0],
    content: [
      "Every Uniblex content page should pass a simple launch checklist. The title should be clear, the slug should be readable, and the excerpt should explain the value of the page. The featured image should load correctly and match the subject. The body should contain original writing, not filler text.",
      "Technical checks are just as important. Confirm the meta title and description, Open Graph image, canonical URL, structured data, and sitemap entry. Test the page on mobile width to make sure buttons, cards, ad zones, and text do not overlap. If the page includes a game player, confirm it loads only after the play action.",
      "A checklist makes publishing faster because it removes guesswork. It also protects the quality of the platform as more articles and games are added through the admin dashboard."
    ]
  },
  {
    title: "How Mohsin Shah Can Position Uniblex as a Creator Platform",
    slug: "mohsin-shah-uniblex-creator-platform-positioning",
    category: "Industry News",
    excerpt: "Uniblex can grow by connecting Mohsin Shah's 3D and game development experience with useful browser-first content.",
    publishedAt: "2026-06-13",
    readingTime: "7 min read",
    image: sharedImages[2],
    content: [
      "Uniblex has a strong positioning advantage because it is not only a game listing site. It can represent Mohsin Shah's practical experience as a Senior 3D Modeler and Game Developer from Lahore, Pakistan. That background gives the platform a real creator voice.",
      "The content strategy should connect playable experiments with production knowledge. A game page can show the experience, while articles explain the modeling, optimization, design, or publishing work behind it. This gives visitors more reasons to stay and gives search engines more useful context.",
      "Over time, Uniblex can become a home for browser games, development notes, tutorials, and portfolio-quality breakdowns. The first version should focus on quality, speed, clear navigation, and original content. Community features can come later when the foundation is steady."
    ]
  }
];

export const categories = ["Game Dev", "3D Art", "Tutorials", "Industry News"] as const;

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getRelatedPosts(post: Post, limit = 3) {
  return posts
    .filter((candidate) => candidate.slug !== post.slug && candidate.category === post.category)
    .slice(0, limit);
}
