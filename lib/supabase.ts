import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { createHash } from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 해싱 함수 유지 (이전 코드에서 사용 중일 수 있음)
export function hashPassword(password: string): string {
    try {
        // 브라우저 환경에서는 crypto.subtle API 사용
        if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
            // 간단한 해싱을 위해 SHA-256 사용
            const hash = createHash("sha256").update(password).digest("hex")
            return hash
        } else {
            // Node.js 환경에서는 crypto 모듈 사용
            const hash = createHash("sha256").update(password).digest("hex")
            return hash
        }
    } catch (error) {
        console.error("Hashing error:", error)
        // 해싱에 실패한 경우 fallback으로 간단한 인코딩 사용
        return btoa(password)
    }
}

// 비밀번호 검증 함수 유지
export function verifyPassword(password: string, hash: string): boolean {
    try {
        const inputHash = hashPassword(password)
        return inputHash === hash
    } catch (error) {
        console.error("Password verification error:", error)
        return false
    }
}

// Check if admin
export function isAdmin(email: string | null): boolean {
    if (!email) return false
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    return email === adminEmail
}

export async function getCurrentUser() {
    try {
        // 로컬 스토리지에서 어드민 세션 확인
        if (typeof window !== "undefined") {
            const adminSession = localStorage.getItem("admin_session")
            if (adminSession) {
                const session = JSON.parse(adminSession)
                return { email: session.email }
            }
        }

        // 없으면 Supabase 사용자 확인
        const {
            data: { user },
        } = await supabase.auth.getUser()
        return user
    } catch (error) {
        console.error("Error getting current user:", error)
        return null
    }
}

// 로그아웃 함수
export async function signOut() {
    // 로컬 스토리지 세션 삭제
    if (typeof window !== "undefined") {
        localStorage.removeItem("admin_session")
    }

    // Supabase 로그아웃도 실행
    await supabase.auth.signOut()
}

// 디버깅 함수
export async function debugAuthState() {
    try {
        let localSession = null

        // 로컬 스토리지 세션 확인
        if (typeof window !== "undefined") {
            const adminSession = localStorage.getItem("admin_session")
            if (adminSession) {
                localSession = JSON.parse(adminSession)
            }
        }

        // Supabase 세션 확인
        const {
            data: { session },
        } = await supabase.auth.getSession()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        console.log("Local admin session:", localSession)
        console.log("Current Supabase session:", session)
        console.log("Current Supabase user:", user)
        console.log("Admin email:", process.env.NEXT_PUBLIC_ADMIN_EMAIL)

        return { localSession, session, user }
    } catch (error) {
        console.error("Debug auth state error:", error)
        return { error }
    }
}
