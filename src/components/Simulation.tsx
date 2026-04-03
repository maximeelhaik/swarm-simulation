"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Settings2, X } from "lucide-react"
import { Vector } from "@/lib/vector"
import { Boid, BoidConfig } from "@/lib/boid"
import { SpatialGrid } from "@/lib/spatial-grid"
import { INITIAL_CONTROLS, getComputedConfig } from "@/lib/config"

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}

function Slider({ label, value, min, max, step, onChange, formatValue = (v) => v.toString() }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-cyan-300">{formatValue(value)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
      />
    </div>
  )
}

export default function Simulation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const flockRef = useRef<Boid[]>([])
  const gridRef = useRef<SpatialGrid | null>(null)
  const sizeRef = useRef({ width: 1200, height: 800 })
  const fpsFramesRef = useRef(0)
  const fpsLastRef = useRef(0)
  const hiddenRef = useRef(false)
  const resizeStateRef = useRef({ resizing: false, startX: 0, startWidth: 320 })
  const mousePredatorRef = useRef({
    pos: new Vector(0, 0),
    target: new Vector(0, 0),
    inside: false,
    radius: 15,
  })

  const [controls, setControls] = useState(INITIAL_CONTROLS)
  const configRef = useRef<BoidConfig>(getComputedConfig(controls))
  const [fps, setFps] = useState(0)
  const [agentCount, setAgentCount] = useState(INITIAL_CONTROLS.count)
  const [panelWidth, setPanelWidth] = useState(320)
  const [panelOpen, setPanelOpen] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })

  const uiMeta = useMemo(
    () => [
      { key: "count" as const, label: "Agents", min: 80, max: 2600, step: 10 },
      {
        key: "maxSpeed" as const,
        label: "Vitesse moyenne",
        min: 0.6,
        max: 8,
        step: 0.1,
        formatValue: (v: number) => v.toFixed(1),
      },
      {
        key: "topoNeighbors" as const,
        label: "Voisins topologiques",
        min: 3,
        max: 14,
        step: 1,
      },
      {
        key: "separationWeight" as const,
        label: "Séparation",
        min: 0,
        max: 4,
        step: 0.05,
        formatValue: (v: number) => v.toFixed(2),
      },
      {
        key: "alignmentWeight" as const,
        label: "Alignement",
        min: 0,
        max: 4,
        step: 0.05,
        formatValue: (v: number) => v.toFixed(2),
      },
      {
        key: "cohesionWeight" as const,
        label: "Cohésion",
        min: 0,
        max: 4,
        step: 0.05,
        formatValue: (v: number) => v.toFixed(2),
      },
      {
        key: "noiseLevel" as const,
        label: "Bruit",
        min: 0,
        max: 0.12,
        step: 0.001,
        formatValue: (v: number) => v.toFixed(3),
      },
      {
        key: "occlusionThreshold" as const,
        label: "Occlusion visuelle",
        min: 0,
        max: 0.6,
        step: 0.01,
        formatValue: (v: number) => v.toFixed(2),
      },
    ],
    []
  )

  const createFlock = useCallback((count: number) => {
    const { width, height } = sizeRef.current
    const next: Boid[] = []
    const config = configRef.current

    for (let i = 0; i < count; i++) {
      next.push(new Boid(Math.random() * width, Math.random() * height, config))
    }

    flockRef.current = next
    setAgentCount(next.length)
  }, [])

  useEffect(() => {
    configRef.current = getComputedConfig(controls)
  }, [controls])

  useEffect(() => {
    createFlock(controls.count)
  }, [controls.count, createFlock])

  useEffect(() => {
    const handleVisibility = () => {
      hiddenRef.current = document.hidden
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.5) : 1

      sizeRef.current = { width, height }

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext("2d", { alpha: false })
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!gridRef.current) {
        gridRef.current = new SpatialGrid(width, height, 52)
      } else {
        gridRef.current.resize(width, height)
      }

      if (flockRef.current.length === 0) createFlock(configRef.current.count)
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) observer.observe(containerRef.current)
    window.addEventListener("resize", updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateSize)
    }
  }, [createFlock])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateMouse = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mousePredatorRef.current.target.x = x
      mousePredatorRef.current.target.y = y
      if (!mousePredatorRef.current.inside) {
        mousePredatorRef.current.pos.x = x
        mousePredatorRef.current.pos.y = y
      }
      mousePredatorRef.current.inside = true
      setCursorPosition({ x, y })
      setCursorVisible(true)
    }

    const onLeave = () => {
      mousePredatorRef.current.inside = false
      setCursorVisible(false)
    }

    container.addEventListener("pointermove", updateMouse)
    container.addEventListener("pointerenter", updateMouse)
    container.addEventListener("pointerleave", onLeave)

    return () => {
      container.removeEventListener("pointermove", updateMouse)
      container.removeEventListener("pointerenter", updateMouse)
      container.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizeStateRef.current.resizing) return
      const maxPanelWidth = Math.min(520, sizeRef.current.width - 24)
      const nextWidth = resizeStateRef.current.startWidth + (e.clientX - resizeStateRef.current.startX)
      setPanelWidth(Math.max(260, Math.min(maxPanelWidth, nextWidth)))
    }

    const onUp = () => {
      resizeStateRef.current.resizing = false
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)

    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const render = (time: number) => {
      animationRef.current = requestAnimationFrame(render)
      if (hiddenRef.current) return

      const config = configRef.current
      const flock = flockRef.current
      const grid = gridRef.current
      const { width, height } = sizeRef.current
      const mousePredator = mousePredatorRef.current

      mousePredator.pos.lerp(mousePredator.target, 0.16)
      const activePredators = mousePredator.inside ? [{ pos: mousePredator.pos }] : []

      fpsFramesRef.current += 1
      if (time - fpsLastRef.current >= 1000) {
        setFps(fpsFramesRef.current)
        fpsFramesRef.current = 0
        fpsLastRef.current = time
      }

      ctx.fillStyle = "#030d26"
      ctx.fillRect(0, 0, width, height)

      const bgGradient = ctx.createRadialGradient(width * 0.5, height * 0.38, 40, width * 0.5, height * 0.38, Math.max(width, height) * 0.7)
      bgGradient.addColorStop(0, "rgba(18, 45, 95, 0.22)")
      bgGradient.addColorStop(0.55, "rgba(10, 22, 55, 0.10)")
      bgGradient.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      if (grid) {
        grid.clear()
        for (const boid of flock) grid.insert(boid)
      }

      if (grid) {
        for (const boid of flock) {
          const nearby = grid.getNearby(boid, config.perceptionRadius)
          boid.flock(nearby, activePredators, config)
        }
      }

      for (const boid of flock) {
        boid.update(config)
        boid.edges(width, height)
        boid.draw(ctx)
      }
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const updateControl = (key: keyof typeof INITIAL_CONTROLS, value: number) => {
    setControls((prev) => ({ ...prev, [key]: value }))
  }

  const resetSimulation = () => {
    createFlock(controls.count)
  }

  const beginResize = (e: React.PointerEvent) => {
    e.preventDefault()
    resizeStateRef.current = {
      resizing: true,
      startX: e.clientX,
      startWidth: panelWidth,
    }
  }

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden bg-[#030d26] text-white cursor-none">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,144,226,0.08),transparent_45%),linear-gradient(to_bottom,rgba(1,8,24,0.18),rgba(1,8,24,0.42))]" />

      {panelOpen ? (
        <div
          className="absolute left-4 top-4 z-20 max-h-[calc(100vh-32px)] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/72 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          style={{ width: panelWidth, maxWidth: "calc(100vw - 32px)" }}
        >
          <div className="relative h-full overflow-y-auto p-4">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3 pr-4">
              <div>
                <h1 className="text-sm font-semibold tracking-wide text-cyan-200">Hero background swarm</h1>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Réglages compacts pour un fond de hero fluide, discret et réactif à la souris.
                </p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                aria-label="Fermer les réglages"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {uiMeta.map((item) => (
                <Slider
                  key={item.key}
                  label={item.label}
                  value={controls[item.key]}
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  onChange={(value) => updateControl(item.key, value)}
                  formatValue={item.formatValue}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-slate-400">Agents</div>
                <div className="mt-1 text-lg font-semibold text-cyan-200">{agentCount}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-slate-400">FPS</div>
                <div className="mt-1 text-lg font-semibold text-cyan-200">{fps}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={resetSimulation}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-slate-100 transition hover:bg-white/10"
              >
                Réinitialiser
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
              Le cercle bleu agit comme un prédateur doux activé en permanence. Glisse la bordure droite du panneau pour le redimensionner.
            </div>
          </div>

          <div
            onPointerDown={beginResize}
            className="absolute right-0 top-0 h-full w-3 cursor-ew-resize bg-transparent"
            aria-label="Redimensionner le panneau"
            title="Glisser pour redimensionner"
          >
            <div className="absolute right-1 top-1/2 h-16 w-[2px] -translate-y-1/2 rounded-full bg-white/20" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/45 px-3 py-2 text-xs font-medium text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-slate-900/60"
          aria-label="Ouvrir les réglages"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Réglages
        </button>
      )}

      {cursorVisible && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <div
            className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/90 bg-cyan-300/10 shadow-[0_0_24px_rgba(56,189,248,0.45)]"
            style={{
              left: cursorPosition.x,
              top: cursorPosition.y,
            }}
          >
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200" />
          </div>
        </div>
      )}
    </div>
  )
}
