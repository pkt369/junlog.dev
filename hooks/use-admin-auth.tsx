"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

type AdminAuthContextType = {
    isAdmin: boolean
    setIsAdmin: (value: boolean) => void
    loading: boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // 페이지 로드 시 로그인 상태 확인
        const checkAdminStatus = async () => {
            try {
                // 로컬 스토리지에서 어드민 세션 확인
                const adminSession = localStorage.getItem("admin_session")

                if (adminSession) {
                    const session = JSON.parse(adminSession)
                    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

                    // 세션이 유효한지 확인 (24시간 이내)
                    const sessionTime = new Date(session.timestamp).getTime()
                    const currentTime = new Date().getTime()
                    const sessionValid = currentTime - sessionTime < 24 * 60 * 60 * 1000

                    if (session.email === adminEmail && sessionValid) {
                        setIsAdmin(true)
                    } else {
                        // 세션이 만료되었거나 이메일이 일치하지 않으면 세션 삭제
                        localStorage.removeItem("admin_session")
                        setIsAdmin(false)
                    }
                } else {
                    // Supabase 세션도 확인 (기존 코드 유지)
                    const {
                        data: { session },
                    } = await supabase.auth.getSession()

                    if (session) {
                        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
                        const userEmail = session.user?.email

                        if (userEmail === adminEmail) {
                            setIsAdmin(true)
                        } else {
                            setIsAdmin(false)
                        }
                    } else {
                        setIsAdmin(false)
                    }
                }
            } catch (error) {
                console.error("Admin auth check error:", error)
                setIsAdmin(false)
            } finally {
                setLoading(false)
            }
        }

        checkAdminStatus()

        // 인증 상태 변경 감지
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
                const userEmail = session.user?.email

                if (userEmail === adminEmail) {
                    setIsAdmin(true)
                } else {
                    setIsAdmin(false)
                }
            }
            setLoading(false)
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [])

    return <AdminAuthContext.Provider value={{ isAdmin, setIsAdmin, loading }}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext)
    if (context === undefined) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider")
    }
    return context
}
