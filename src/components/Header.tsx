import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { name: "Energy Drinks", href: "/#cans" },
  { name: "Events", href: "/#events" },
  { name: "Stories", href: "/#stories" },
  { name: "Athletes", href: "/#athletes" },
  { name: "Red Bull TV", href: "/#tv" },
];

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-hairline bg-carbon/30 backdrop-blur-sm px-4 text-white md:px-10">
      <Link href="/" aria-label="Home">
        <Image src="/images/redbulllogo.svg" alt="Red Bull" width={170} height={27} priority />
      </Link>
      <nav className="micro hidden gap-7 md:flex">
        {LINKS.map((l) => (
          <Link key={l.name} href={l.href} className="hover:text-sun">
            {l.name}
          </Link>
        ))}
      </nav>
      <details className="relative md:hidden">
        <summary className="cursor-pointer list-none micro border border-white/70 px-3 py-1.5">Menu</summary>
        <nav className="absolute right-0 mt-2 grid w-48 gap-3 micro border border-hairline bg-carbon p-4">
          {LINKS.map((l) => (
            <Link key={l.name} href={l.href}>
              {l.name}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  );
}
