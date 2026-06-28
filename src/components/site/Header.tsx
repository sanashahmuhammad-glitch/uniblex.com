import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-uniblex-border bg-uniblex-bg/75 backdrop-blur-xl">
      <div className="container-pad flex h-20 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/brand/main-logo.png" alt="Uniblex" width={150} height={42} priority className="h-auto w-[150px]" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-uniblex-gray transition hover:text-uniblex-blue">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/admin" className="btn-secondary hidden md:inline-flex">Admin</Link>
      </div>
    </header>
  );
}
