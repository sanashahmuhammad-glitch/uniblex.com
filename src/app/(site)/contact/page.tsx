import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Uniblex for games, articles, feedback and collaboration."
};

export default function ContactPage() {
  return (
    <main className="container-pad py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-uniblex-blue">Contact</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">Get in Touch</h1>
          <p className="mt-5 leading-8 text-uniblex-gray">
            Send feedback, collaboration notes, game questions, or website support requests. Messages are saved to the Uniblex admin dashboard when Supabase is configured.
          </p>
          <div className="mt-8 grid gap-4">
            <div className="flex gap-3 rounded-lg border border-uniblex-border bg-white/[.03] p-4">
              <Mail className="text-uniblex-blue" />
              <div>
                <h2 className="font-heading text-lg">Email</h2>
                <p className="text-sm text-uniblex-gray">hello.uniblex@gmail.com</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-uniblex-border bg-white/[.03] p-4">
              <MapPin className="text-uniblex-purple" />
              <div>
                <h2 className="font-heading text-lg">Location</h2>
                <p className="text-sm text-uniblex-gray">Lahore, Pakistan</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-uniblex-border bg-white/[.03] p-4">
              <MessageCircle className="text-uniblex-pink" />
              <div>
                <h2 className="font-heading text-lg">Topics</h2>
                <p className="text-sm text-uniblex-gray">Games, 3D art, tutorials, browser content, and platform feedback.</p>
              </div>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </main>
  );
}
