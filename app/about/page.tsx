import { TranslatedText } from "@/components/translated-text"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Github, Twitter, Linkedin, Mail } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
        <Avatar className="h-32 w-32 md:h-48 md:w-48">
          <AvatarImage src="/placeholder.svg?height=192&width=192" alt="Profile" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              <TranslatedText id="about.name" />
            </h1>
            <p className="text-muted-foreground">
              <TranslatedText id="about.title" />
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="https://github.com/pkt369" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
            {/* <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link> */}
            <Link href="https://www.linkedin.com/in/sejun" target="_blank" rel="noopener noreferrer">
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
            <Link href="mailto:pkt0758@gmaill.com">
              <Mail className="h-5 w-5" />
              <span className="sr-only">Email</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-12 space-y-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">
            <TranslatedText id="about.bio.title" />
          </h2>
          <div className="space-y-4">
            <p>
              <TranslatedText id="about.bio.p1" />
            </p>
            <p>
              <TranslatedText id="about.bio.p2" />
            </p>
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">
            <TranslatedText id="about.skills.title" />
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div key={skill} className="rounded-md bg-secondary px-3 py-1 text-sm">
                {skill}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

const skills = ["React", "Next.js", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind CSS", "Node.js", "Git"]
