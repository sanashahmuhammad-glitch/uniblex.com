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

type PostSource = Omit<Post, "readingTime">;

const sharedImages = ["/og-image.png", "/brand/gaming.png", "/brand/gaming-icon.png", "/brand/horizontal-lockup.png", "/icon-512.png"];

const publishedPosts: PostSource[] = [
  {
    title: "WebGL Game Pages: A Practical SEO Checklist",
    slug: "webgl-game-pages-seo-checklist",
    category: "Game Dev",
    excerpt: "Build a useful game page around the playable experience with accurate copy, stable media, canonical metadata, and a player that loads on demand.",
    publishedAt: "2026-06-25",
    image: sharedImages[3],
    content: [
      "A useful WebGL game page begins by answering the questions a player has before pressing Play. State what the game is, what the player does, which inputs it expects, and whether it works best on desktop or mobile. The title and description should describe the actual published build rather than a future plan. A page with a working player and specific guidance gives people a reason to stay even while a large game is loading.",
      "Keep the playable build out of the initial page load. On Uniblex, the poster, game information, and controls render first, while the iframe starts only after the player chooses to play. This protects the rest of the page from a heavy WebGL download and avoids spending bandwidth on a visitor who only wants to read. Reserve a fixed aspect ratio for the player so that starting the game does not push nearby content around.",
      "Write metadata for the individual game instead of copying the directory description. The page title, meta description, Open Graph fields, and canonical URL should all point to the same game. A canonical URL should omit temporary query parameters. If a game is removed or has never been published, its old destination should return a real not-found response and should not remain in the sitemap or navigation.",
      "Structured data can describe the page in a machine-readable form, but it must match what visitors can see. A GameApplication record can include the published title, genre, description, image, browser platform, and publisher. Do not add ratings, prices, release dates, or capabilities that the public page cannot substantiate. Structured data is supporting context, not a substitute for useful visible content.",
      "Media quality affects both trust and load behavior. Use a real cover or thumbnail from the game, give it meaningful alternative text, and make sure every public media URL returns successfully. Keep screenshot dimensions consistent and avoid generic images that imply gameplay not found in the build. If a remote asset moves, update the page before search engines and players repeatedly request a broken file.",
      "Internal links should help a visitor move through the site. Link a game back to the game directory, show related games only when they are genuinely playable, and link to relevant guides when the guide adds practical help. Avoid empty categories and cards that lead to Coming Soon pages while claiming the game is published. A small accurate library is more useful than a large invented catalogue.",
      "Finish with a real-browser check. Load the page at desktop and phone widths, start the game, test keyboard or touch input, exit fullscreen, and confirm the surrounding page remains usable. Review the browser console and network panel for blocked frames, missing media, repeated requests, and unexpected third-party scripts. The final page should remain informative and navigable even when the game host is slow or temporarily unavailable."
    ]
  },
  {
    title: "A Practical Pipeline for WebGL Build Uploads",
    slug: "practical-pipeline-for-webgl-build-uploads",
    category: "Tutorials",
    excerpt: "Treat a browser build as a versioned release: validate its archive, upload assets safely, review the exact revision, and publish only after playback checks pass.",
    publishedAt: "2026-06-24",
    image: sharedImages[2],
    content: [
      "A reliable WebGL release starts with an exact build artifact. Record the engine, version, entry point, compression format, expected orientation, and supported controls before uploading. Keep the exported folder intact and avoid renaming files after the loader has been generated, because the HTML and loader scripts usually refer to precise relative paths. A release note should identify the revision being reviewed so feedback cannot be confused with a newer local build.",
      "Validate the archive before sending it to storage. Reject absolute paths, parent-directory traversal, executables, nested archives, duplicate paths, and unexpected entry points. A browser game normally needs an index document plus its scripts, styles, data, and WebAssembly files. Validation should also cap file counts and total expanded size so a malformed archive cannot consume unlimited memory, storage, or review time.",
      "Large build files should travel directly to object storage through short-lived, scoped upload authorization. The application server can authorize the operation and record metadata without proxying every byte. Each upload should be tied to the authenticated developer, game, build revision, expected path, content type, and checksum. Finalization must verify the recorded files rather than trusting a browser message that says the upload succeeded.",
      "Keep listing data separate from build bytes. A game record can hold the title, slug, description, controls, media links, review status, and the published build reference. The build record should identify the immutable revision and its entry point. This separation makes it possible to correct public copy without silently replacing a reviewed build, and to review a new build without changing the live player first.",
      "Security review should inspect text-based files for risky external scripts, unexpected network destinations, redirects, and attempts to escape the host frame. Automated scanning can identify suspicious patterns, but it cannot certify a game as safe. A reviewer still needs to launch the exact revision in the intended sandbox, inspect network activity, test navigation, and confirm that the declared external hosts match the build.",
      "Publishing should be a separate authorized action after review. The public page should resolve only the approved published revision, while drafts and rejected revisions remain private. If the database query fails, the listing should fail closed instead of substituting fictional published games. A rollback should point the public record to the previous known-good revision without deleting the newer upload or its review history.",
      "After publication, test the public URL from a clean browser session. Confirm the poster loads, the play action creates the expected iframe, WebGL assets return with correct content types and encodings, fullscreen can be exited, and the page recovers if the iframe is closed or navigation changes. Repeating these checks on a phone-sized viewport catches layout and input problems that archive validation cannot see."
    ]
  },
  {
    title: "Designing Game Controls for Browser Players",
    slug: "designing-game-controls-for-browser-players",
    category: "Game Dev",
    excerpt: "Make input requirements clear before launch, acquire focus only after a player action, and provide safe ways to pause, exit, and recover.",
    publishedAt: "2026-06-23",
    image: sharedImages[0],
    content: [
      "A browser player arrives with less context than someone launching an installed game. The page should identify the main input method before the build loads: keyboard and mouse, touch, or gamepad. List movement and primary actions in plain language near the player. If the game is practical only in landscape or on desktop, say that directly instead of allowing the player to discover the limitation after a long download.",
      "Acquire keyboard focus after an explicit Play action. An embedded game should not capture keys while a visitor is reading, tabbing through navigation, or filling a form elsewhere on the page. When the iframe finishes loading, focus can move to it, but the surrounding interface must still offer an obvious way to leave fullscreen or return to the page. Pointer lock and fullscreen should always follow a user gesture.",
      "Support familiar alternatives where the game design allows them. Arrow keys and WASD cover more keyboard preferences, while visible touch controls are more reliable than assuming keyboard input on a phone. Buttons need enough spacing to avoid accidental presses, and important actions should not sit under browser gestures or unsafe screen edges. A rotate prompt is useful when landscape materially improves the play area.",
      "The host page should remain stable when input state changes. Starting, pausing, muting, entering fullscreen, exiting fullscreen, and closing an overlay should not leave an invisible layer intercepting clicks. If an external iframe fails to load, show a clear unavailable state and restore page scrolling. If the player navigates away during a pending operation, abort it and avoid sending a late result into a destroyed frame.",
      "Audio deserves the same care as keyboard focus. Do not begin sound before a player action, and make the game's mute or volume controls discoverable. A host-level preference can explain whether sound is expected, but it cannot reliably mute an unrelated cross-origin game unless the game supports a trusted message contract. Documentation should distinguish a saved preference from actual audio control.",
      "Treat messages from an iframe as untrusted input. Check the exact source window, allowed origin, protocol version, request shape, and active session before acting. A game should never be able to award itself a reward, open arbitrary navigation, or claim that a host-controlled operation completed. Reject duplicate and malformed messages without exposing private host data in error responses.",
      "Test controls as a complete journey. Navigate to the page by keyboard, start the player, confirm the game receives input, toggle help, enter and exit fullscreen, resize the viewport, and return focus to the host. On mobile, test portrait and landscape behavior and verify no control forces horizontal scrolling. These checks reveal browser integration problems even when the game itself works correctly."
    ]
  },
  {
    title: "Making 3D Game Assets Load Faster on the Web",
    slug: "making-3d-game-assets-load-faster-on-the-web",
    category: "3D Art",
    excerpt: "Reduce browser-game load cost by budgeting textures, meshes, materials, audio, and the first playable scene before export.",
    publishedAt: "2026-06-22",
    image: sharedImages[4],
    content: [
      "Web delivery makes every asset decision visible. A large texture, duplicate material, dense hidden mesh, or untrimmed audio file increases the bytes a player must fetch before the game can start. Optimization works best when the team sets budgets before export rather than trying to repair a finished build. Separate the first playable scene from later content so the initial download contains only what the player needs to begin.",
      "Review textures by their actual screen use. A background prop rarely needs the same resolution as a vehicle or character shown close to the camera. Remove unused alpha channels, choose a suitable compression format, and reuse atlases where that reduces materials without creating waste. Normal, mask, and light maps should earn their memory cost through a visible contribution to the final scene.",
      "Inspect meshes for hidden faces, duplicated vertices, accidental subdivision, and modifiers that were exported at a higher level than intended. Use level-of-detail meshes for objects whose screen size changes substantially. Combine static geometry only when it helps batching without harming culling. The goal is a predictable scene cost, not the smallest possible triangle count at the expense of silhouettes and gameplay readability.",
      "Materials and shaders can expand into many variants. Keep the browser target in mind when selecting lighting, transparency, reflections, shadows, and post-processing. Transparent overdraw and full-screen effects can be expensive on mobile GPUs even when the download size looks reasonable. Bake lighting where it suits the art direction, limit real-time lights, and provide quality settings when one configuration cannot serve every device.",
      "Audio and animation also belong in the budget. Trim silence, compress long music tracks appropriately, remove unused clips, and avoid shipping source-quality audio when the browser only needs the final mix. Check animation curves for unnecessary keys and confirm that duplicate clips are not embedded in several assets. These changes can reduce both transfer size and memory pressure.",
      "Compression on storage does not replace asset optimization. Brotli or gzip can reduce transfer size for WebAssembly and data files, but the browser still needs to download, decode, and allocate the resulting content. Serve the encoding that the build expects, with correct response headers and content types. A mismatch can look like a game bug even though the files exist.",
      "Measure the exported build rather than judging only the editor project. Record file sizes by category, load the public build on a normal connection, and watch when the first interactive frame appears. Check memory and frame stability on a representative mobile device. Repeat the same measurements after a change so an optimization is supported by the build output rather than by assumptions."
    ]
  },
  {
    title: "Core Web Vitals for Game Showcase Websites",
    slug: "core-web-vitals-for-game-showcase-websites",
    category: "Game Dev",
    excerpt: "Keep the public page responsive before the game starts by reserving space, deferring heavy embeds, and limiting early client work.",
    publishedAt: "2026-06-19",
    image: sharedImages[0],
    content: [
      "A showcase page and its game build have different performance jobs. The page should present the title, cover, description, controls, and Play action quickly. The game may be much larger, so loading it with the first document can delay everything the visitor needs to decide whether to play. An on-demand iframe keeps the initial page useful while preserving a direct path into the game.",
      "Largest Contentful Paint often depends on the main heading or hero image. Use a real, correctly sized image, avoid downloading several competing hero assets, and do not make the first view wait for the game bundle. Web fonts should use a loading strategy that keeps text visible. A decorative background should not be the only way the page communicates its subject.",
      "Layout stability comes from reserving dimensions. Give covers, screenshots, video, and the game player an aspect ratio before their files arrive. Avoid inserting empty advertising boxes that later change size, especially when no advertising provider is active. Status messages and loading indicators should fit inside the reserved player instead of moving the rest of the article.",
      "Interaction responsiveness depends on how much JavaScript runs when the user acts. Keep the Play handler small, avoid parsing large metadata on the main thread, and let the game's own loading screen report progress after the iframe starts. Search, filters, and mobile navigation should remain responsive even if a remote thumbnail or analytics endpoint is slow.",
      "Third-party scripts deserve a specific purpose and a consent decision. Each script adds network work and can execute on the main thread. Load analytics only when the host consent state permits it, and keep advertising scripts absent until an approved provider is deliberately integrated. Ownership verification can use a static meta tag without loading an advertising library.",
      "A stable page also needs failure behavior. Broken posters should fall back to a verified asset, remote games should show an unavailable message instead of a blank rectangle, and a database error should not reveal stale fictional inventory. Clear failure states protect the user experience and make monitoring easier because the page does not pretend an incomplete action succeeded.",
      "Validate with both lab and real-browser evidence. Check a production build, inspect network waterfalls, resize through common breakpoints, and interact with the page while the game is loading. Review the console for blocked resources and the server logs for repeated failures. Performance work is complete only when the public deployment behaves as expected, not when a source-level checklist is finished."
    ]
  },
  {
    title: "How to Write Game Descriptions That Help Players",
    slug: "how-to-write-game-descriptions-that-help-players",
    category: "Tutorials",
    excerpt: "Describe the actual player goal, actions, controls, device needs, and session shape without unsupported marketing claims.",
    publishedAt: "2026-06-21",
    image: sharedImages[1],
    content: [
      "A useful game description explains what the player will do. Start with the central action and goal: drive through a course, solve a sequence, survive a wave, or explore an environment. Add the decisions or obstacles that shape the session. This is more informative than calling the game exciting, premium, addictive, or realistic without showing what those words mean.",
      "Write from the published build. If a feature is planned but not playable, leave it out of the public description or identify it clearly as future work outside the listing. Do not copy a concept document into a game page after the implementation has changed. The controls, screenshots, tags, genre, and description should all describe the same revision a player opens.",
      "Set expectations about input and device support. Mention when keyboard controls are required, when touch controls are available, and when landscape orientation is recommended. If the first load is large, a concise note can prepare the player without promising an exact time that varies by connection and device. Accessibility information should be concrete, such as remappable controls or readable subtitles, only when the build provides it.",
      "Use specific nouns and verbs. 'Drive a car through a 3D course using keyboard controls' tells the reader more than 'experience amazing racing action.' Specific language also makes duplicate descriptions less likely because it reflects the individual game. Keep the first sentence understandable without tags or screenshots, then use later sentences for the loop, challenge, progression, and session style.",
      "Avoid claims that need evidence you do not have. Ratings, player counts, awards, popularity labels, and performance promises should come from a reliable source. A new game does not need invented social proof. A clear playable page, accurate media, and honest controls are enough to help a visitor decide. If counters are shown, label them accurately and protect them from trivial manipulation.",
      "Keep the description readable on small screens. Use a short summary near the title and a fuller explanation below the player when more detail is useful. Repeating the same promotional sentence in several sections adds length without value. Related guides can cover controls, optimization, or development in depth while the game description stays focused on playing.",
      "Before publishing, compare every sentence with the live build. Start the game, follow the stated objective, use each listed control, and check the recommended device behavior. Remove anything that cannot be verified. This final review prevents the common mismatch where a page looks complete but sends the player to a different or unfinished experience."
    ]
  },
  {
    title: "Mobile-First Checks for Browser Game Libraries",
    slug: "mobile-first-checks-for-browser-game-libraries",
    category: "Game Dev",
    excerpt: "Audit game discovery, player controls, media, navigation, and overflow at phone width before calling a browser-game library responsive.",
    publishedAt: "2026-06-10",
    image: sharedImages[2],
    content: [
      "A responsive game library needs more than cards that stack. Start at the page header and follow the same route a player takes: open navigation, choose the game directory, scan cards, open a detail page, read the controls, and start the player. Every action should remain reachable without zooming, horizontal scrolling, or relying on a desktop hover state.",
      "Use stable media ratios so thumbnails do not resize as they load. A one-column card layout is often clearer at narrow widths, with two columns only when titles and metadata still have room. Truncate only secondary labels; a game title should remain understandable. Make the complete card or a clear button tappable, and keep tap targets separated enough to avoid opening the wrong game.",
      "Navigation should expose the same important destinations as desktop. A menu button needs an accessible label, visible focus, and a predictable open state. The page should close or retain the menu intentionally after navigation. Test with keyboard navigation as well as touch because responsive markup can accidentally hide focusable links off-screen.",
      "The game player needs a fixed responsive frame and a deliberate orientation path. A landscape game can show a rotate suggestion on portrait phones, but it should not force orientation or trap the user. Fullscreen must have an exit path, and leaving fullscreen should restore the page position and controls. If the game does not support touch, state that before downloading the build.",
      "Watch for overflow from code blocks, long URLs, tags, tables, and developer documentation. Let code areas scroll within their own container while the page itself remains within the viewport. Wrap metadata chips and action buttons, and avoid fixed widths larger than the screen. A 375-pixel viewport is a useful baseline check, but also resize slightly above and below it to find breakpoint gaps.",
      "Remote content can fail differently on mobile networks. A broken cover should not leave an unreadable text overlay, and a delayed iframe should keep its loading state inside the player. Navigation, consent controls, and the rest of the page must remain usable while the game host responds. Avoid automatic redirects, popups, or downloads from the embedded frame.",
      "Finish by reviewing the rendered production site rather than only the local component. Test the homepage, directory, both live game pages, blog, policies, and developer documentation. Check portrait and landscape, inspect console and network errors, and verify all internal links. A page that technically renders but exposes empty placeholders, development copy, or dead destinations is not ready for a mobile visitor."
    ]
  }
];

function readingTime(content: string[]) {
  const words = content.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export const posts: Post[] = publishedPosts.map((post) => ({
  ...post,
  readingTime: readingTime(post.content)
}));

export const categories = Array.from(new Set(posts.map((post) => post.category)));

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getRelatedPosts(post: Post, limit = 3) {
  return posts
    .filter((candidate) => candidate.slug !== post.slug && candidate.category === post.category)
    .slice(0, limit);
}
