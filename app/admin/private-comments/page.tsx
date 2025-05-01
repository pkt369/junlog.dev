"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"
import { ko, enUS } from "date-fns/locale"
import { ArrowLeft, Trash, MessageSquare, User } from "lucide-react"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"

interface Comment {
    id: string
    created_at: string
    post_slug: string
    author_name: string
    content: string
    is_private: boolean
    email?: string | null
}

export default function PrivateCommentsPage() {
    const { isAdmin, loading } = useAdminAuth()
    const router = useRouter()
    const { toast } = useToast()
    const { language } = useLanguage()
    const [comments, setComments] = useState<Comment[]>([])
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 로딩이 끝나고 어드민이 아니면 로그인 페이지로 리다이렉트
        if (!loading && !isAdmin) {
            router.push("/admin/login")
        } else if (!loading && isAdmin) {
            fetchPrivateComments()
        }
    }, [isAdmin, loading, router])

    const fetchPrivateComments = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from("comments")
                .select("*")
                .eq("is_private", true)
                .order("created_at", { ascending: false })

            if (error) throw error

            setComments(data || [])
        } catch (error: any) {
            toast({
                title: language === "ko" ? "댓글 로드 실패" : "Failed to load comments",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteComment = async () => {
        if (!deleteCommentId) return

        try {
            const { error } = await supabase.from("comments").delete().eq("id", deleteCommentId)

            if (error) throw error

            setComments(comments.filter((comment) => comment.id !== deleteCommentId))
            setDeleteCommentId(null)

            toast({
                title: language === "ko" ? "댓글 삭제 성공" : "Comment deleted successfully",
            })
        } catch (error: any) {
            toast({
                title: language === "ko" ? "댓글 삭제 실패" : "Failed to delete comment",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: true,
                locale: language === "ko" ? ko : enUS,
            })
        } catch (e) {
            return dateString
        }
    }

    // 로딩 중이거나 어드민이 아니면 아무것도 표시하지 않음
    if (loading || !isAdmin) {
        return null
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex items-center mb-8">
                <Link href="/admin/dashboard" className="mr-4">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">{language === "ko" ? "비공개 댓글 관리" : "Private Comments Management"}</h1>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <p>{language === "ko" ? "댓글을 불러오는 중..." : "Loading comments..."}</p>
                </div>
            ) : comments.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">
                            {language === "ko" ? "비공개 댓글이 없습니다" : "No private comments found"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {comments.map((comment) => (
                        <Card key={comment.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{comment.author_name}</CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(comment.created_at)} • {comment.post_slug}
                                            </p>
                                        </div>
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => setDeleteCommentId(comment.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{language === "ko" ? "댓글 삭제" : "Delete Comment"}</DialogTitle>
                                                <DialogDescription>
                                                    {language === "ko"
                                                        ? "정말로 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                                                        : "Are you sure you want to delete this comment? This action cannot be undone."}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">{language === "ko" ? "취소" : "Cancel"}</Button>
                                                </DialogClose>
                                                <Button variant="destructive" onClick={handleDeleteComment}>
                                                    {language === "ko" ? "삭제" : "Delete"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{comment.content}</p>
                                <div className="mt-4">
                                    <Link href={`/blog/${comment.post_slug}`}>
                                        <Button variant="outline" size="sm">
                                            {language === "ko" ? "게시물로 이동" : "Go to Post"}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
