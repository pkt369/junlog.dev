"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase"
import { LogOut, MessageSquare, ThumbsUp, Eye } from "lucide-react"

export default function AdminDashboard() {
    const { isAdmin, loading } = useAdminAuth()
    const router = useRouter()
    const { toast } = useToast()
    const { language } = useLanguage()

    useEffect(() => {
        // 로딩이 끝나고 어드민이 아니면 로그인 페이지로 리다이렉트
        if (!loading && !isAdmin) {
            router.push("/admin/login")
        }
    }, [isAdmin, loading, router])

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            toast({
                title: language === "ko" ? "로그아웃 성공" : "Logout successful",
                description: language === "ko" ? "관리자 계정에서 로그아웃되었습니다" : "Logged out from admin account",
            })
            router.push("/")
        } catch (error: any) {
            toast({
                title: language === "ko" ? "로그아웃 실패" : "Logout failed",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    // 로딩 중이거나 어드민이 아니면 아무것도 표시하지 않음
    if (loading || !isAdmin) {
        return null
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{language === "ko" ? "관리자 대시보드" : "Admin Dashboard"}</h1>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {language === "ko" ? "로그아웃" : "Logout"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <MessageSquare className="mr-2 h-5 w-5 text-blue-500" />
                            {language === "ko" ? "댓글 관리" : "Comments Management"}
                        </CardTitle>
                        <CardDescription>{language === "ko" ? "모든 댓글을 관리합니다" : "Manage all comments"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => router.push("/admin/comments")}>
                            {language === "ko" ? "댓글 관리하기" : "Manage Comments"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <ThumbsUp className="mr-2 h-5 w-5 text-green-500" />
                            {language === "ko" ? "좋아요 통계" : "Likes Statistics"}
                        </CardTitle>
                        <CardDescription>
                            {language === "ko" ? "게시물 좋아요 통계를 확인합니다" : "View post likes statistics"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => router.push("/admin/likes")}>
                            {language === "ko" ? "통계 보기" : "View Statistics"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Eye className="mr-2 h-5 w-5 text-purple-500" />
                            {language === "ko" ? "비공개 댓글" : "Private Comments"}
                        </CardTitle>
                        <CardDescription>
                            {language === "ko" ? "비공개 댓글을 확인합니다" : "View private comments"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => router.push("/admin/private-comments")}>
                            {language === "ko" ? "비공개 댓글 보기" : "View Private Comments"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
