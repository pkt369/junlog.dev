export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
    public: {
        Tables: {
            comments: {
                Row: {
                    id: string
                    created_at: string
                    post_slug: string
                    author_name: string
                    password_hash: string
                    content: string
                    is_private: boolean
                    email?: string | null
                    parent_id?: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    post_slug: string
                    author_name: string
                    password_hash: string
                    content: string
                    is_private?: boolean
                    email?: string | null
                    parent_id?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    post_slug?: string
                    author_name?: string
                    password_hash?: string
                    content?: string
                    is_private?: boolean
                    email?: string | null
                    parent_id?: string | null
                }
            }
            likes: {
                Row: {
                    id: string
                    created_at: string
                    post_slug: string
                    visitor_id: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    post_slug: string
                    visitor_id: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    post_slug?: string
                    visitor_id?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
