"use client"

import { useEffect, useRef } from "react"
import mermaid from "mermaid"

interface MermaidProps {
  chart: string
}

export default function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mermaid 초기화
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: "loose",
      fontFamily: "sans-serif",
      themeVariables: {
        fontSize: "16px",
      },
    })

    // 다이어그램 렌더링
    if (ref.current) {
      ref.current.removeAttribute("data-processed")
      ref.current.innerHTML = chart
      mermaid.contentLoaded()

      // SVG 크기를 100%로 조정
      const svg = ref.current.querySelector('svg')
      if (svg) {
        svg.style.width = '100%'
        svg.style.height = 'auto'
        svg.removeAttribute('height')
      }
    }
  }, [chart])

  return (
    <div className="mermaid-wrapper my-8 w-full">
      <div
        ref={ref}
        className="mermaid w-full"
      />
    </div>
  )
}
