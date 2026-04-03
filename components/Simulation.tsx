"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Vector } from "../lib/vector"
import { Boid, BoidConfig } from "../lib/boid"
import { SpatialGrid } from "../lib/spatial-grid"
import { INITIAL_CONTROLS, getComputedConfig } from "../lib/config"

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
    <div className="space-y-1">
      <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
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
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
      />
    </div>
  )
}

export default function Simulation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const flockRef = useRef<Boid[]>([])
  const gridRef = useRef<SpatialGrid | null>(null)
  const sizeRef = useRef({ width: 1200, height: 800 })
  const fpsFramesRef = useRef(0)
  const fpsLastRef = useRef(0)
  const resizeStateRef = useRef({ resizing: false, startX: 0, startWidth: 360 })
  const mousePredatorRef = useRef({ pos: new Vector(0, 0), inside: false, radius: 14 })
  const attackModeRef = useRef(false)
  
  const [controls, setControls] = useState(INITIAL_CONTROLS)
  const configRef = useRef<BoidConfig>(getComputedConfig(controls))
  const [fps, setFps] = useState(0)
  const [agentCount, setAgentCount] = useState(INITIAL_CONTROLS.count)
  const [attackMode, setAttackMode] = useState(false)
  const [panelWidth, setPanelWidth] = useState(360)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const uiMeta = useMemo(
    () => [
      { key: "count" as const, label: "Nombre d'agents", min: 10, max: 5000, step: 10 },
      {
        key: "maxSpeed" as const,
        label: "Vitesse moyenne",
        min: 0.4,
        max: 12,
        step: 0.1,
        formatValue: (v: number) => v.toFixed(1),
      },
      {
        key: "topoNeighbors" as const,
        label: "Voisins topologiques",
        min: 3,
        max: 16,
        step: 1,
      },
      {
        key: "separationWeight" as const,
        label: "Séparation (évitement)",
        min: 0,
        max: 5,
        step: 0.1,
        formatValue: (v: number) => v.toFixed(1),
      },
      {
        key: "alignmentWeight" as const,
        label: "Alignement",
        min: 0,
        max: 5,
        step: 0.1,
        formatValue: (v: number) => v.toFixed(1),
      },
      {
        key: "cohesionWeight" as const,
        label: "Cohésion (attraction)",
        min: 0,
        max: 5,
        step: 0.1,
        formatValue: (v: number) => v.toFixed(1),
      },
      {
        key: "noiseLevel" as const,
        label: "Bruit (température / désordre)",
        min: 0,
        max: 1,
        step: 0.005,
        formatValue: (v: number) => v.toFixed(3),
      },
      {
        key: "occlusionThreshold" as const,
        label: "Occlusion visuelle (angle)",
        min: 0,
        max: 1,
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
    attackModeRef.current = attackMode
    if (!attackMode) {
      mousePredatorRef.current.inside = false
    }
  }, [attackMode])

  useEffect(() => {
    createFlock(controls.count)
  }, [controls.count, createFlock])

  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

      sizeRef.current = { width, height }

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = \`\${width}px\`
      canvas.style.height = \`\${height}px\`

      const ctx = canvas.getContext("2d", { alpha: false })
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      if (!gridRef.current) {
        gridRef.current = new SpatialGrid(width, height, 50)
      } else {
        gridRef.current.resize(width, height)
      }

      if (flockRef.current.length === 0) {
        createFlock(controls.count)
      }
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) observer.observe(containerRef.current)
    window.addEventListener("resize", updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateSize)
    }
  }, [createFlock, controls.count])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateMouse = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mousePredatorRef.current.pos.x = e.clientX - rect.left
      mousePredatorRef.current.pos.y = e.clientY - rect.top
      mousePredatorRef.current.inside = attackModeRef.current
    }

    const onLeave = () => {
      mousePredatorRef.current.inside = false
    }

    canvas.addEventListener("pointermove", updateMouse)
    canvas.addEventListener("pointerenter", updateMouse)
    canvas.addEventListener("pointerleave", onLeave)

    return () => {
      canvas.removeEventListener("pointermove", updateMouse)
      canvas.removeEventListener("pointerenter", updateMouse)
      canvas.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizeStateRef.current.resizing) return
      const maxPanelWidth = Math.min(640, sizeRef.current.width - 24)
      const nextWidth = resizeStateRef.current.startWidth + (e.clientX - resizeStateRef.current.startX)
      setPanelWidth(Math.max(280, Math.min(maxPanelWidth, nextWidth)))
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
      const config = configRef.current
      const flock = flockRef.current
      const grid = gridRef.current
      const { width, height } = sizeRef.current
      const mousePredator = mousePredatorRef.current
      const activePredators = attackModeRef.current && mousePredator.inside ? [mousePredator] : []

      fpsFramesRef.current += 1
      if (time - fpsLastRef.current >= 1000) {
        setFps(fpsFramesRef.current)
        fpsFramesRef.current = 0
        fpsLastRef.current = time
      }

      ctx.fillStyle = "#0b1021"
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

      if (attackModeRef.current && mousePredator.inside) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(mousePredator.pos.x, mousePredator.pos.y, mousePredator.radius, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(245, 87, 108, 0.92)"
        ctx.shadowColor = "rgba(245, 87, 108, 0.9)"
        ctx.shadowBlur = 28
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = "rgba(255,255,255,0.85)"
        ctx.stroke()
        ctx.restore()
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const updateControl = (key: keyof typeof INITIAL_CONTROLS, value: number) => {
    setControls((prev) => ({ ...prev, [key]: value }))
  }

  const toggleAttackMode = () => {
    setAttackMode((prev) => !prev)
  }

  const resetSimulation = () => {
    mousePredatorRef.current.inside = false
    createFlock(configRef.current.count)
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
    <div
      ref={containerRef}
      className={\`relative h-screen w-full overflow-hidden bg-[#0b1021] text-white \${attackMode ? "cursor-none" : "cursor-default"}\`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {panelCollapsed ? (
        <button
          onClick={() => setPanelCollapsed(false)}
          className="absolute left-3 top-3 z-20 rounded-2xl border border-slate-700/70 bg-slate-950/85 px-4 py-3 text-sm font-medium text-slate-100 shadow-2xl backdrop-blur-xl transition hover:bg-slate-900"
        >
          Ouvrir les réglages
        </button>
      ) : (
        <div
          ref={panelRef}
          className="absolute left-3 top-3 z-10 max-h-[calc(100vh-24px)] overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/80 shadow-2xl backdrop-blur-xl"
          style={{ width: panelWidth, maxWidth: "calc(100vw - 24px)" }}
        >
          <div className="relative h-full overflow-y-auto p-4">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-800 pb-3 pr-4">
              <div>
                <h1 className="text-lg font-semibold text-cyan-300">Simulation d'essaim</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Modèle avec voisinage topologique, occlusion et prédateur piloté à la souris.
                </p>
              </div>
              <button
                onClick={() => setPanelCollapsed(true)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Réduire
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

            <div className="mt-5 grid grid-cols-1 gap-2">
              <button
                onClick={toggleAttackMode}
                className={\`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.99] \${
                  attackMode
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                    : "bg-gradient-to-r from-rose-500 to-fuchsia-500"
                }\`}
              >
                {attackMode ? "Désactiver le mode prédateur" : "Activer le mode prédateur (souris)"}
              </button>
              <button
                onClick={resetSimulation}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Réinitialiser l'essaim
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="text-slate-400">Agents actifs</div>
                <div className="mt-1 text-xl font-semibold text-cyan-300">{agentCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="text-slate-400">FPS</div>
                <div className="mt-1 text-xl font-semibold text-cyan-300">{fps}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-400">
              Le panneau peut être élargi ou rétréci en glissant sa bordure droite. En mode prédateur, la souris devient une boule rouge qui perturbe
              l'essaim en temps réel.
            </div>
          </div>

          <div
            onPointerDown={beginResize}
            className="absolute right-0 top-0 h-full w-3 cursor-ew-resize bg-transparent"
            aria-label="Redimensionner le panneau"
            title="Glisser pour redimensionner"
          >
            <div className="absolute right-1 top-1/2 h-16 w-[2px] -translate-y-1/2 rounded-full bg-slate-600/70" />
          </div>
        </div>
      )}
    </div>
  )
}
