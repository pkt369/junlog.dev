"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { LogIn } from "lucide-react"
import bcrypt from "bcryptjs";

// default export로 변경 (이전 코드와 호환성 유지)
export default function AdminLogin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const { language } = useLanguage()
    const router = useRouter()
    const { setIsAdmin } = useAdminAuth()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !password) {
            toast({
                title: language === "ko" ? "입력 오류" : "Input Error",
                description: language === "ko" ? "이메일과 비밀번호를 입력해주세요" : "Please enter email and password",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            // 환경 변수에 설정된 어드민 이메일과 비교
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

            // 어드민 이메일이 맞는지 확인
            if (email !== adminEmail) {
                throw new Error(language === "ko" ? "관리자 계정이 아닙니다" : "Not an admin account")
            }
            const { data, error } = await supabase
                .from("admin_users")
                .select("*")
                .eq("email", email)
                .single();
            
            if (error) {
                console.error("SQL Auth error:", error)
                throw new Error(language === "ko" ? `인증 오류: ${error.message}` : `Authentication error: ${error.message}`)
            }

            const isMatch = await bcrypt.compare(password, data.password_hash);
            if (!isMatch) {
                throw new Error(language === "ko" ? "비밀번호가 일치하지 않습니다" : "Password does not match");
            }

            if (!data || data.length === 0) {
                throw new Error(
                    language === "ko" ? "이메일 또는 비밀번호가 올바르지 않습니다" : "Email or password is incorrect",
                )
            }

            // 로그인 성공 후 어드민 상태 설정
            setIsAdmin(true)

            // 세션 저장 (로컬 스토리지 사용)
            localStorage.setItem(
                "admin_session",
                JSON.stringify({
                    email: email,
                    isAdmin: true,
                    timestamp: new Date().toISOString(),
                }),
            )

            toast({
                title: language === "ko" ? "로그인 성공" : "Login successful",
                description: language === "ko" ? "관리자로 로그인되었습니다" : "Logged in as administrator",
            })

            // 로그인 후 리다이렉트
            router.push("/admin/dashboard")
        } catch (error: any) {
            console.error("Login error:", error)
            toast({
                title: language === "ko" ? "로그인 실패" : "Login failed",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[70vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{language === "ko" ? "관리자 로그인" : "Admin Login"}</CardTitle>
                    <CardDescription>
                        {language === "ko"
                            ? "관리자 계정으로 로그인하여 블로그를 관리하세요"
                            : "Login with your admin account to manage the blog"}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{language === "ko" ? "이메일" : "Email"}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{language === "ko" ? "비밀번호" : "Password"}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <span>{language === "ko" ? "로그인 중..." : "Logging in..."}</span>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    <span>{language === "ko" ? "로그인" : "Login"}</span>
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
