"use client"

import { Button } from "@/components/ui/button"
import { Twitter, Facebook, Linkedin, Link2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"

export function ShareButtons({
  title,
  slug,
}: {
  title: { ko: string; en: string }
  slug: string
}) {
  const { toast } = useToast()
  const { language } = useLanguage()
  const currentTitle = title[language]

  // Get the full URL
  const getShareUrl = () => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/blog/${slug}`
  }

  const shareUrl = getShareUrl()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: language === "ko" ? "링크가 복사되었습니다" : "Link copied to clipboard",
      duration: 2000,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">{language === "ko" ? "이 글 공유하기" : "Share this post"}</h3>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentTitle)}&url=${encodeURIComponent(shareUrl)}`,
              "_blank",
            )
          }
        >
          <Twitter className="h-4 w-4" />
          <span className="sr-only">Share on Twitter</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")
          }
        >
          <Facebook className="h-4 w-4" />
          <span className="sr-only">Share on Facebook</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank")
          }
        >
          <Linkedin className="h-4 w-4" />
          <span className="sr-only">Share on LinkedIn</span>
        </Button>
        <Button variant="outline" size="icon" onClick={handleCopyLink}>
          <Link2 className="h-4 w-4" />
          <span className="sr-only">Copy link</span>
        </Button>
      </div>
    </div>
  )
}
