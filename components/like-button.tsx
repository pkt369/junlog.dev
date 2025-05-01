"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { v4 as uuidv4 } from "uuid"

interface LikeButtonProps {
    postSlug: string
}

export default function LikeButton({ postSlug }: LikeButtonProps) {
    const [likeCount, setLikeCount] = useState(0)
    const [hasLiked, setHasLiked] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [visitorId, setVisitorId] = useState<string>("")
    const { toast } = useToast()
    const { language } = useLanguage()

    // 방문자 ID 생성 또는 가져오기
    useEffect(() => {
        const storedVisitorId = localStorage.getItem("visitorId")
        if (storedVisitorId) {
            setVisitorId(storedVisitorId)
        } else {
            const newVisitorId = uuidv4()
            localStorage.setItem("visitorId", newVisitorId)
            setVisitorId(newVisitorId)
        }
    }, [])

    // 좋아요 상태 로드
    useEffect(() => {
        if (visitorId) {
            fetchLikes()
            checkUserLike()
        }

        // 실시간 업데이트 구독
        const likesSubscription = supabase
            .channel("likes-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "likes",
                    filter: `post_slug=eq.${postSlug}`,
                },
                () => {
                    fetchLikes()
                    if (visitorId) {
                        checkUserLike()
                    }
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(likesSubscription)
        }
    }, [postSlug, visitorId])

    // 좋아요 수 가져오기
    const fetchLikes = async () => {
        const { count, error } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: false })
            .eq("post_slug", postSlug)

        if (error) {
            console.error("Error fetching likes:", error)
            return
        }

        setLikeCount(count || 0)
    }

    // 사용자가 좋아요 했는지 확인
    const checkUserLike = async () => {
        if (!visitorId) return

        const { data, error } = await supabase
            .from("likes")
            .select("*")
            .eq("post_slug", postSlug)
            .eq("visitor_id", visitorId)
            .maybeSingle()

        if (error) {
            console.error("Error checking user like:", error)
            return
        }

        setHasLiked(!!data)
    }

    // 좋아요 토글
    const toggleLike = async () => {
        if (!visitorId) return

        setIsLoading(true)

        if (hasLiked) {
            // 좋아요 취소
            const { error } = await supabase.from("likes").delete().eq("post_slug", postSlug).eq("visitor_id", visitorId)

            if (error) {
                toast({
                    title: language === "ko" ? "오류 발생" : "Error occurred",
                    description: error.message,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            setHasLiked(false)
            setLikeCount((prev) => Math.max(0, prev - 1))
        } else {
            // 좋아요 추가
            const { error } = await supabase.from("likes").insert({
                post_slug: postSlug,
                visitor_id: visitorId,
            })

            if (error) {
                toast({
                    title: language === "ko" ? "오류 발생" : "Error occurred",
                    description: error.message,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            setHasLiked(true)
            setLikeCount((prev) => prev + 1)
        }

        setIsLoading(false)
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                variant={hasLiked ? "default" : "outline"}
                size="sm"
                className={`flex items-center gap-1 ${hasLiked ? "bg-pink-500 hover:bg-pink-600 text-white border-pink-500" : "hover:text-pink-500 hover:border-pink-500"}`}
                onClick={toggleLike}
                disabled={isLoading}
            >
                <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
                <span>{language === "ko" ? "좋아요" : "Like"}</span>
            </Button>
            <span className="text-sm font-medium">{likeCount}</span>
        </div>
    )
}
