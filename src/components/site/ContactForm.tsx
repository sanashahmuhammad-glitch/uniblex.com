"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setStatus("loading");
    setMessage("");

    if (!supabase) {
      setStatus("error");
      setMessage("Contact storage is not configured yet. Please email hello.uniblex@gmail.com.");
      return;
    }

    const { error } = await supabase.from("contacts").insert({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
      metadata: { source: "website-contact-page" }
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    form.reset();
    setStatus("success");
    setMessage("Message sent. Mohsin will receive it in the Uniblex admin contacts table.");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.07] via-uniblex-card/75 to-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] backdrop-blur md:p-6">
      <label className="grid gap-2 text-sm font-bold">
        Name
        <input name="name" className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 outline-none transition focus:border-uniblex-blue" placeholder="Your name" required />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Email
        <input name="email" type="email" className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 outline-none transition focus:border-uniblex-blue" placeholder="Email address" required />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Subject
        <input name="subject" className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 outline-none transition focus:border-uniblex-blue" placeholder="Feedback, collaboration, support" />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Message
        <textarea name="message" rows={6} className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 outline-none transition focus:border-uniblex-blue" placeholder="Write your message" required />
      </label>
      {message ? (
        <p className={`rounded-lg border p-3 text-sm ${status === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
          {message}
        </p>
      ) : null}
      <button type="submit" className="btn-primary" disabled={status === "loading"}>
        <Send size={18} /> {status === "loading" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
