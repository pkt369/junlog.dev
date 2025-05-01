"use client"

import { getPostData } from "@/lib/posts"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ShareButtons } from "@/components/share-buttons"

export default async function BlogPostPageClient({ params }: { params: { slug: string } }) {
  const { slug } = params
  const post = await getPostData(slug)

  return (
    <article className="container mx-auto py-12 max-w-3xl">
      <Link href="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" />
        <LanguageAwareText ko="모든 글 보기" en="Back to all posts" />
      </Link>

      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap gap-2">
          <Badge className="mb-2">{<LanguageAwareContent content={post.category} />}</Badge>
          {post.tags &&
            post.tags.map((tag) => (
              <Link key={tag} href={`/blog/tag/${tag}`}>
                <Badge variant="outline">{tag}</Badge>
              </Link>
            ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          <LanguageAwareContent content={post.title} />
        </h1>
        <p className="text-muted-foreground">{formatDate(post.date)}</p>
      </div>

      <div className="prose dark:prose-invert max-w-none mb-8">
        <LanguageAwareHTML content={post.content} />
      </div>

      <div className="border-t pt-6 mt-8">
        <ShareButtons title={post.title} slug={post.slug} />
      </div>

      <div className="mt-8">
        <div id="disqus_thread"></div>
        <DisqusComments slug={post.slug} title={post.title} />
      </div>
    </article>
  )
}

function LanguageAwareText({ ko, en }: { ko: string; en: string }) {
  const { language } = useLanguage()
  return <>{language === "ko" ? ko : en}</>
}

function LanguageAwareContent({ content }: { content: { ko: string; en: string } }) {
  const { language } = useLanguage()
  return <>{content[language]}</>
}

function LanguageAwareHTML({ content }: { content: { ko: string; en: string } }) {
  const { language } = useLanguage()
  return <div dangerouslySetInnerHTML={{ __html: content[language] }} />
}

function DisqusComments({ slug, title }: { slug: string; title: { ko: string; en: string } }) {
  const { language } = useLanguage()

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          var disqus_config = function () {
            this.page.url = window.location.href;
            this.page.identifier = '${slug}';
            this.page.title = '${title[language]}';
          };
          (function() {
            var d = document, s = d.createElement('script');
            s.src = 'https://YOUR_DISQUS_SHORTNAME.disqus.com/embed.js';
            s.setAttribute('data-timestamp', +new Date());
            (d.head || d.body).appendChild(s);
          })();
        `,
      }}
    />
  )
}
