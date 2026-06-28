import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Uniblex, a WebGL games and game development content platform by Mohsin Shah."
};

export default function AboutPage() {
  return (
    <main className="container-pad py-14">
      <section className="card p-8 md:p-12">
        <p className="text-uniblex-blue">About Uniblex</p>
        <h1 className="mt-3 font-heading text-5xl">Built for Gamers. Inspired by Creators.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-uniblex-gray">
          Uniblex is a game showcase and content platform focused on WebGL browser games, game development articles, 3D art tutorials and creator-driven learning. The platform is built by Mohsin Shah, a Senior 3D Modeler and Game Developer from Lahore, Pakistan.
        </p>
      </section>
    </main>
  );
}
