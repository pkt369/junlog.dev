"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, hashPassword, verifyPassword } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { formatDistanceToNow } from "date-fns"
import { ko, enUS } from "date-fns/locale"
import { Lock, Trash, Edit, User, MessageSquare, CornerDownRight, Shield } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/hooks/use-admin-auth"
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
import { v4 as uuidv4 } from "uuid"
import { Badge } from "@/components/ui/badge"

interface Comment {
    id: string
    created_at: string
    post_slug: string
    author_name: string
    password_hash: string
    content: string
    is_private: boolean
    email?: string | null
    parent_id?: string | null
    is_admin?: boolean
}

interface CommentListProps {
    postSlug: string
}

export default function CommentList({ postSlug }: CommentListProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState("")
    const [authorName, setAuthorName] = useState("")
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState("")
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
    const [confirmPassword, setConfirmPassword] = useState("")
    const [visitorId, setVisitorId] = useState<string>("")
    const [replyToId, setReplyToId] = useState<string | null>(null)
    const [replyAuthor, setReplyAuthor] = useState<string>("")
    const { toast } = useToast()
    const { language } = useLanguage()
    const { isAdmin } = useAdminAuth()
    const closeEditDialogRef = useRef<HTMLButtonElement>(null)
    const closeDeleteDialogRef = useRef<HTMLButtonElement>(null)

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

    // 댓글 로드
    useEffect(() => {
        fetchComments()

        // 실시간 업데이트 구독
        const commentsSubscription = supabase
            .channel("comments-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "comments",
                    filter: `post_slug=eq.${postSlug}`,
                },
                () => {
                    fetchComments()
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(commentsSubscription)
        }
    }, [postSlug, isAdmin])

    // 댓글 가져오기
    const fetchComments = async () => {
        // 모든 댓글을 가져옵니다 (비공개 댓글 포함)
        const { data, error } = await supabase
            .from("comments")
            .select("*")
            .eq("post_slug", postSlug)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Error fetching comments:", error)
            return
        }

        setComments(data || [])
    }

    // 댓글 작성
    const handleSubmitComment = async () => {
        if (!newComment.trim() || (!isAdmin && (!authorName.trim() || !password.trim()))) {
            toast({
                title: language === "ko" ? "입력 오류" : "Input Error",
                description:
                    language === "ko"
                        ? "이름, 비밀번호, 댓글 내용을 모두 입력해주세요"
                        : "Please enter your name, password, and comment",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            // 비밀번호 해싱 (어드민은 비밀번호 필요 없음)
            const hashedPassword = isAdmin ? "admin-no-password" : hashPassword(password)

            const { error } = await supabase.from("comments").insert({
                post_slug: postSlug,
                author_name: authorName,
                password_hash: hashedPassword,
                content: newComment,
                is_private: isPrivate,
                email: email || null,
                parent_id: replyToId,
                is_admin: isAdmin, // 어드민 여부 저장
            })

            if (error) throw error

            // 어드민이 아닌 경우에만 로컬 스토리지에 정보 저장
            if (!isAdmin) {
                localStorage.setItem("commenterName", authorName)
                localStorage.setItem("commenterPassword", password)
                if (email) localStorage.setItem("commenterEmail", email)
            }

            setNewComment("")
            setIsPrivate(false)
            setReplyToId(null)
            setReplyAuthor("")
            await fetchComments()

            toast({
                title: language === "ko" ? "댓글이 작성되었습니다" : "Comment posted",
                description: language === "ko" ? "소중한 의견 감사합니다" : "Thank you for your comment",
            })
        } catch (error: any) {
            toast({
                title: language === "ko" ? "오류 발생" : "Error occurred",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // 댓글 삭제 확인
    const handleDeleteConfirm = async () => {
        if (!deleteCommentId) return

        const commentToDelete = comments.find((c) => c.id === deleteCommentId)
        if (!commentToDelete) return

        try {
            // 어드민이면 비밀번호 확인 없이 삭제 가능
            if (!isAdmin) {
                // 비밀번호 검증
                const isPasswordCorrect = verifyPassword(confirmPassword, commentToDelete.password_hash)

                if (!isPasswordCorrect) {
                    toast({
                        title: language === "ko" ? "비밀번호 오류" : "Password Error",
                        description: language === "ko" ? "비밀번호가 일치하지 않습니다" : "Incorrect password",
                        variant: "destructive",
                    })
                    return
                }
            }

            // 먼저 이 댓글의 모든 답글을 삭제
            const { error: repliesError } = await supabase.from("comments").delete().eq("parent_id", deleteCommentId)

            if (repliesError) throw repliesError

            // 그 다음 댓글 자체를 삭제
            const { error } = await supabase.from("comments").delete().eq("id", deleteCommentId)

            if (error) throw error

            setDeleteCommentId(null)
            setConfirmPassword("")
            await fetchComments()

            // 모달 닫기
            if (closeDeleteDialogRef.current) {
                closeDeleteDialogRef.current.click()
            }

            toast({
                title: language === "ko" ? "댓글이 삭제되었습니다" : "Comment deleted",
            })
        } catch (error: any) {
            toast({
                title: language === "ko" ? "삭제 실패" : "Delete failed",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    // 댓글 수정 시작
    const handleStartEdit = (comment: Comment) => {
        setEditingCommentId(comment.id)
        setEditContent(comment.content)
        setConfirmPassword("")
    }

    // 댓글 수정 저장
    const handleSaveEdit = async () => {
        if (!editingCommentId || !editContent.trim()) return

        const commentToEdit = comments.find((c) => c.id === editingCommentId)
        if (!commentToEdit) return

        try {
            // 어드민이면 비밀번호 확인 없이 수정 가능
            if (!isAdmin && !commentToEdit.is_admin) {
                // 비밀번호 검증
                const isPasswordCorrect = verifyPassword(confirmPassword, commentToEdit.password_hash)

                if (!isPasswordCorrect) {
                    toast({
                        title: language === "ko" ? "비밀번호 오류" : "Password Error",
                        description: language === "ko" ? "비밀번호가 일치하지 않습니다" : "Incorrect password",
                        variant: "destructive",
                    })
                    return
                }
            }

            const { error } = await supabase.from("comments").update({ content: editContent }).eq("id", editingCommentId)

            if (error) throw error

            setEditingCommentId(null)
            setEditContent("")
            setConfirmPassword("")
            await fetchComments()

            // 모달 닫기
            if (closeEditDialogRef.current) {
                closeEditDialogRef.current.click()
            }

            toast({
                title: language === "ko" ? "댓글이 수정되었습니다" : "Comment updated",
            })
        } catch (error: any) {
            toast({
                title: language === "ko" ? "수정 실패" : "Update failed",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    // 답글 작성 시작
    const handleReplyStart = (comment: Comment) => {
        setReplyToId(comment.id)
        setReplyAuthor(comment.author_name)
        // 답글 작성 폼으로 스크롤
        setTimeout(() => {
            document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth" })
        }, 100)
    }

    // 답글 작성 취소
    const handleReplyCancel = () => {
        setReplyToId(null)
        setReplyAuthor("")
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

    // 댓글 트리 구성
    const buildCommentTree = () => {
        // 최상위 댓글 (부모가 없는 댓글)
        const rootComments = comments.filter((comment) => !comment.parent_id)

        // 답글 (부모가 있는 댓글)
        const replies = comments.filter((comment) => comment.parent_id)

        // 최상위 댓글 목록 생성
        return rootComments.map((rootComment) => {
            // 이 댓글에 대한 답글 찾기
            const commentReplies = replies.filter((reply) => reply.parent_id === rootComment.id)
            return {
                ...rootComment,
                replies: commentReplies,
            }
        })
    }

    // 컴포넌트 마운트 시 로컬 스토리지에서 이름과 이메일 가져오기
    useEffect(() => {
        // 어드민인 경우 이름을 "관리자"로 자동 설정
        if (isAdmin) {
            setAuthorName(language === "ko" ? "관리자" : "Admin")
        } else {
            // 어드민이 아닌 경우에만 로컬 스토리지에서 정보 가져오기
            const storedName = localStorage.getItem("commenterName")
            const storedEmail = localStorage.getItem("commenterEmail")
            const storedPassword = localStorage.getItem("commenterPassword")

            if (storedName) setAuthorName(storedName)
            if (storedEmail) setEmail(storedEmail)
            if (storedPassword) setPassword(storedPassword)
        }
    }, [isAdmin, language])

    // 댓글 트리 구성
    const commentTree = buildCommentTree()

    return (
        <TooltipProvider>
            <div className="mt-10 space-y-8">
                <h2 className="text-2xl font-bold">
                    {language === "ko" ? "댓글" : "Comments"} ({comments.length})
                </h2>

                {/* 댓글 작성 폼 */}
                <div id="comment-form" className="space-y-4 p-4 border rounded-lg">
                    {replyToId && (
                        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md mb-4">
                            <div className="flex items-center gap-2">
                                <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                                <span>{language === "ko" ? `${replyAuthor}님에게 답글 작성 중` : `Replying to ${replyAuthor}`}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleReplyCancel}>
                                {language === "ko" ? "취소" : "Cancel"}
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="author-name">{language === "ko" ? "이름" : "Name"} *</Label>
                                <Input
                                    id="author-name"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    placeholder={language === "ko" ? "홍길동" : "John Doe"}
                                />
                            </div>
                        )}
                        {!isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="password">{language === "ko" ? "비밀번호" : "Password"} *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={language === "ko" ? "댓글 수정/삭제 시 필요합니다" : "Required for edit/delete"}
                                />
                            </div>
                        )}
                    </div>

                    {!isAdmin && (
                        <div className="space-y-2">
                            <Label htmlFor="email">{language === "ko" ? "이메일 (선택사항)" : "Email (optional)"}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@example.com"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="comment">{language === "ko" ? "댓글" : "Comment"} *</Label>
                        <Textarea
                            id="comment"
                            placeholder={
                                replyToId
                                    ? language === "ko"
                                        ? `${replyAuthor}님에게 답글을 작성해주세요...`
                                        : `Write a reply to ${replyAuthor}...`
                                    : language === "ko"
                                        ? "댓글을 작성해주세요..."
                                        : "Write a comment..."
                            }
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Switch id="private-mode" checked={isPrivate} onCheckedChange={setIsPrivate} />
                            <Label htmlFor="private-mode" className="flex items-center gap-1 cursor-pointer">
                                <Lock className="h-3.5 w-3.5" />
                                {language === "ko" ? "비공개 댓글" : "Private comment"}
                            </Label>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground text-sm"></span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        {language === "ko"
                                            ? "비공개 댓글은 블로그 관리자만 볼 수 있습니다."
                                            : "Private comments can only be seen by the blog admin."}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <Button
                            onClick={handleSubmitComment}
                            disabled={isLoading || !newComment.trim() || (!isAdmin && (!authorName.trim() || !password.trim()))}
                        >
                            {replyToId
                                ? language === "ko"
                                    ? "답글 작성"
                                    : "Post Reply"
                                : language === "ko"
                                    ? "댓글 작성"
                                    : "Post Comment"}
                        </Button>
                    </div>
                </div>

                {/* 댓글 목록 */}
                <div className="space-y-6">
                    {comments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            {language === "ko"
                                ? "아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!"
                                : "No comments yet. Be the first to comment!"}
                        </p>
                    ) : (
                        commentTree.map((comment) => (
                            <div key={comment.id}>
                                {/* 원본 댓글 */}
                                <div className={`p-4 rounded-lg border ${comment.is_private ? "bg-muted/30" : ""}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                {comment.is_admin ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{comment.author_name}</span>
                                                    {comment.is_admin && (
                                                        <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                                                            {language === "ko" ? "관리자" : "Admin"}
                                                        </Badge>
                                                    )}
                                                    {comment.is_private && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{language === "ko" ? "비공개 댓글입니다" : "Private comment"}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
                                            </div>
                                        </div>

                                        {/* 수정/삭제/답글 버튼 */}
                                        <div className="flex space-x-2">
                                            {/* 비공개 댓글은 어드민만 수정 가능 */}
                                            {(!comment.is_private || isAdmin) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleStartEdit(comment)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{language === "ko" ? "댓글 수정" : "Edit Comment"}</DialogTitle>
                                                            <DialogDescription>
                                                                {!isAdmin &&
                                                                    !comment.is_admin &&
                                                                    (language === "ko"
                                                                        ? "댓글을 수정하려면 작성 시 입력한 비밀번호를 입력하세요."
                                                                        : "Enter the password you used when posting to edit this comment.")}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            {!isAdmin && !comment.is_admin && (
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="edit-password">{language === "ko" ? "비밀번호" : "Password"}</Label>
                                                                    <Input
                                                                        id="edit-password"
                                                                        type="password"
                                                                        value={confirmPassword}
                                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="space-y-2">
                                                                <Label htmlFor="edit-content">{language === "ko" ? "댓글 내용" : "Comment"}</Label>
                                                                <Textarea
                                                                    id="edit-content"
                                                                    value={editContent}
                                                                    onChange={(e) => setEditContent(e.target.value)}
                                                                    className="min-h-[100px]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    ref={closeEditDialogRef}
                                                                    onClick={() => {
                                                                        setEditingCommentId(null)
                                                                        setEditContent("")
                                                                        setConfirmPassword("")
                                                                    }}
                                                                >
                                                                    {language === "ko" ? "취소" : "Cancel"}
                                                                </Button>
                                                            </DialogClose>
                                                            <Button
                                                                onClick={handleSaveEdit}
                                                                disabled={(!isAdmin && !comment.is_admin && !confirmPassword) || !editContent.trim()}
                                                            >
                                                                {language === "ko" ? "저장" : "Save"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}

                                            {/* 비공개 댓글은 어드민만 삭제 가능 */}
                                            {(!comment.is_private || isAdmin) && (
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
                                                        {!isAdmin && !comment.is_admin && (
                                                            <div className="space-y-2 py-4">
                                                                <Label htmlFor="delete-password">{language === "ko" ? "비밀번호" : "Password"}</Label>
                                                                <Input
                                                                    id="delete-password"
                                                                    type="password"
                                                                    value={confirmPassword}
                                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                                    placeholder={
                                                                        language === "ko" ? "댓글 작성 시 입력한 비밀번호" : "Password used when posting"
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    ref={closeDeleteDialogRef}
                                                                    onClick={() => {
                                                                        setDeleteCommentId(null)
                                                                        setConfirmPassword("")
                                                                    }}
                                                                >
                                                                    {language === "ko" ? "취소" : "Cancel"}
                                                                </Button>
                                                            </DialogClose>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleDeleteConfirm}
                                                                disabled={!isAdmin && !comment.is_admin && !confirmPassword}
                                                            >
                                                                {language === "ko" ? "삭제" : "Delete"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}

                                            {/* 답글 버튼 */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleReplyStart(comment)}
                                                title={language === "ko" ? "답글 작성" : "Reply"}
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 댓글 내용 */}
                                    <div className="mt-3 whitespace-pre-wrap">
                                        {comment.is_private && !isAdmin
                                            ? language === "ko"
                                                ? "비공개 댓글입니다."
                                                : "This is a private comment."
                                            : comment.content}
                                    </div>
                                </div>

                                {/* 답글 목록 */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="ml-8 mt-2 space-y-3">
                                        {comment.replies.map((reply) => (
                                            <div
                                                key={reply.id}
                                                className={`p-4 rounded-lg border ${reply.is_private ? "bg-muted/30" : ""} border-l-4 border-l-primary/30`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                            {reply.is_admin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                                        </div>

                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{reply.author_name}</span>
                                                                {reply.is_admin && (
                                                                    <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                                                                        {language === "ko" ? "관리자" : "Admin"}
                                                                    </Badge>
                                                                )}
                                                                {reply.is_private && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{language === "ko" ? "비공개 댓글입니다" : "Private comment"}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</p>
                                                        </div>
                                                    </div>

                                                    {/* 수정/삭제 버튼 */}
                                                    <div className="flex space-x-2">
                                                        {/* 비공개 댓글은 어드민만 수정 가능 */}
                                                        {(!reply.is_private || isAdmin) && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => handleStartEdit(reply)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>{language === "ko" ? "답글 수정" : "Edit Reply"}</DialogTitle>
                                                                        <DialogDescription>
                                                                            {!isAdmin &&
                                                                                !reply.is_admin &&
                                                                                (language === "ko"
                                                                                    ? "답글을 수정하려면 작성 시 입력한 비밀번호를 입력하세요."
                                                                                    : "Enter the password you used when posting to edit this reply.")}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4 py-4">
                                                                        {!isAdmin && !reply.is_admin && (
                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="edit-password">
                                                                                    {language === "ko" ? "비밀번호" : "Password"}
                                                                                </Label>
                                                                                <Input
                                                                                    id="edit-password"
                                                                                    type="password"
                                                                                    value={confirmPassword}
                                                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="edit-content">{language === "ko" ? "답글 내용" : "Reply"}</Label>
                                                                            <Textarea
                                                                                id="edit-content"
                                                                                value={editContent}
                                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                                className="min-h-[100px]"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <DialogClose asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                ref={closeEditDialogRef}
                                                                                onClick={() => {
                                                                                    setEditingCommentId(null)
                                                                                    setEditContent("")
                                                                                    setConfirmPassword("")
                                                                                }}
                                                                            >
                                                                                {language === "ko" ? "취소" : "Cancel"}
                                                                            </Button>
                                                                        </DialogClose>
                                                                        <Button
                                                                            onClick={handleSaveEdit}
                                                                            disabled={
                                                                                (!isAdmin && !reply.is_admin && !confirmPassword) || !editContent.trim()
                                                                            }
                                                                        >
                                                                            {language === "ko" ? "저장" : "Save"}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}

                                                        {/* 비공개 댓글은 어드민만 삭제 가능 */}
                                                        {(!reply.is_private || isAdmin) && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                                        onClick={() => setDeleteCommentId(reply.id)}
                                                                    >
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>{language === "ko" ? "답글 삭제" : "Delete Reply"}</DialogTitle>
                                                                        <DialogDescription>
                                                                            {language === "ko"
                                                                                ? "정말로 이 답글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                                                                                : "Are you sure you want to delete this reply? This action cannot be undone."}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    {!isAdmin && !reply.is_admin && (
                                                                        <div className="space-y-2 py-4">
                                                                            <Label htmlFor="delete-password">
                                                                                {language === "ko" ? "비밀번호" : "Password"}
                                                                            </Label>
                                                                            <Input
                                                                                id="delete-password"
                                                                                type="password"
                                                                                value={confirmPassword}
                                                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                                                placeholder={
                                                                                    language === "ko"
                                                                                        ? "답글 작성 시 입력한 비밀번호"
                                                                                        : "Password used when posting"
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <DialogFooter>
                                                                        <DialogClose asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                ref={closeDeleteDialogRef}
                                                                                onClick={() => {
                                                                                    setDeleteCommentId(null)
                                                                                    setConfirmPassword("")
                                                                                }}
                                                                            >
                                                                                {language === "ko" ? "취소" : "Cancel"}
                                                                            </Button>
                                                                        </DialogClose>
                                                                        <Button
                                                                            variant="destructive"
                                                                            onClick={handleDeleteConfirm}
                                                                            disabled={!isAdmin && !reply.is_admin && !confirmPassword}
                                                                        >
                                                                            {language === "ko" ? "삭제" : "Delete"}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 답글 내용 */}
                                                <div className="mt-3 whitespace-pre-wrap">
                                                    {reply.is_private && !isAdmin
                                                        ? language === "ko"
                                                            ? "비공개 답글입니다."
                                                            : "This is a private reply."
                                                        : reply.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}
