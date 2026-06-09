import { buildStaticMetadata } from "@/lib/seo"
import ProjectsPageClient from "./ProjectsPageClient"

export const metadata = buildStaticMetadata({
  title: "Projects",
  description: "Projects by Sejun Park, including web services, mobile apps, and developer tools.",
  path: "/projects",
})

export default function ProjectsPage() {
  return <ProjectsPageClient />
}
