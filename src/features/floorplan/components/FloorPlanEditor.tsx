import { useState, useRef, useEffect } from 'react';

type Tool = 'select' | 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'eraser' | 'measure';

interface Point { x: number; y: number }

type Element = Wall | Door | WindowElement | Room | Furniture | Dimension

interface Wall { id: number; type: 'wall'; x: number; y: number; x2: number; y2: number; thickness: number }
interface Door { id: number; type: 'door'; x: number; y: number; width: number; angle: number }
interface WindowElement { id: number; type: 'window'; x: number; y: number; width: number; rotation: number }
interface Room { id: number; type: 'room'; x: number; y: number; width: number; height: number; name: string }
interface Furniture { id: number; type: 'furniture'; x: number; y: number; width: number; height: number; name: string; rotation: number }
interface Dimension { id: number; type: 'dimension'; x1: number; y1: number; x2: number; y2: number }

const FURNITURE_ITEMS = [
  { name: 'Table (4)', w: 48, h: 30 },
  { name: 'Table (6)', w: 72, h: 36 },
  { name: 'Chair', w: 18, h: 18 },
  { name: 'Booth', w: 60, h: 36 },
  { name: 'Sofa', w: 84, h: 36 },
  { name: 'Armchair', w: 36, h: 36 },
]

export function FloorPlanEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [elements, setElements] = useState<Element[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [zoom, setZoom] = useState(20)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Point | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [measureStart, setMeasureStart] = useState<Point | null>(null)
  const [showFurniture, setShowFurniture] = useState(false)
  const [nextId, setNextId] = useState(1)

  const snap = (x: number, y: number) => ({ x: Math.round(x / 12) * 12, y: Math.round(y / 12) * 12 })

  const getMousePos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left - canvas.width / 2) / zoom, y: (e.clientY - rect.top - canvas.height / 2) / zoom }
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const cx = canvas.width / 2, cy = canvas.height / 2, gs = zoom * 12

    // Grid
    ctx.strokeStyle = '#2a2a4a'
    for (let x = cx % gs; x < canvas.width; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
    for (let y = cy % gs; y < canvas.height; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke() }

    // Elements
    for (const el of elements) {
      const sel = el.id === selectedId
      if (el.type === 'wall') {
        ctx.strokeStyle = sel ? '#3b82f6' : '#e0e0e0'
        ctx.lineWidth = el.thickness * zoom
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cx + el.x * zoom, cy + el.y * zoom)
        ctx.lineTo(cx + el.x2 * zoom, cy + el.y2 * zoom)
        ctx.stroke()
      } else if (el.type === 'door') {
        ctx.save()
        ctx.translate(cx + el.x * zoom, cy + el.y * zoom)
        ctx.rotate(el.angle * Math.PI / 180)
        ctx.fillStyle = sel ? '#3b82f6' : '#fff'
        ctx.fillRect(-15, -15, el.width, 30)
        ctx.beginPath()
        ctx.arc(-15, 0, el.width, -Math.PI/2, Math.PI/2)
        ctx.strokeStyle = sel ? '#3b82f6' : '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()
      } else if (el.type === 'window') {
        ctx.fillStyle = sel ? '#3b82f6' : '#87ceeb'
        ctx.fillRect(cx + el.x * zoom - el.width * zoom / 2, cy + el.y * zoom - 10, el.width * zoom, 20)
      } else if (el.type === 'room') {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 2
        ctx.fillRect(cx + el.x * zoom, cy + el.y * zoom, el.width * zoom, el.height * zoom)
        ctx.strokeRect(cx + el.x * zoom, cy + el.y * zoom, el.width * zoom, el.height * zoom)
        ctx.fillStyle = '#fff'
        ctx.font = '14px system-ui'
        ctx.fillText(el.name, cx + (el.x + el.width / 2) * zoom - 20, cy + (el.y + el.height / 2) * zoom + 5)
      } else if (el.type === 'furniture') {
        ctx.save()
        ctx.translate(cx + el.x * zoom, cy + el.y * zoom)
        ctx.rotate(el.rotation * Math.PI / 180)
        ctx.fillStyle = sel ? '#3b82f6' : '#a0a0a0'
        ctx.fillRect(-el.width * zoom / 2, -el.height * zoom / 2, el.width * zoom, el.height * zoom)
        ctx.fillStyle = '#666'
        ctx.font = '10px system-ui'
        ctx.textAlign = 'center'
        const name = el.type === 'furniture' ? el.name : ''
        ctx.fillText(name.split(' ')[0] || '', 0, 4)
        ctx.restore()
      } else if (el.type === 'dimension') {
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(cx + el.x1 * zoom, cy + el.y1 * zoom)
        ctx.lineTo(cx + el.x2 * zoom, cy + el.y2 * zoom)
        ctx.stroke()
        ctx.setLineDash([])
        const d = Math.sqrt(Math.pow(el.x2 - el.x1, 2) + Math.pow(el.y2 - el.y1, 2))
        ctx.fillStyle = '#fff'
        ctx.fillText(`${Math.round(d)}'`, cx + (el.x1 + el.x2) / 2 * zoom + 5, cy + (el.y1 + el.y2) / 2 * zoom - 5)
      }
    }

    // Preview
    if (isDrawing && drawStart) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(cx + drawStart.x * zoom, cy + drawStart.y * zoom)
      ctx.lineTo(cx + mousePos.x * zoom, cy + mousePos.y * zoom)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  useEffect(() => { draw() }, [elements, selectedId, zoom, isDrawing, drawStart, mousePos])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => { canvas.width = canvas.parentElement?.clientWidth || 800; canvas.height = canvas.parentElement?.clientHeight || 600; draw() }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const findElementAt = (pos: Point): Element | undefined => {
    return elements.find(el => {
      if (el.type === 'wall') {
        const d = Math.abs(((el.x2 - el.x) * pos.y - (el.y2 - el.y) * pos.x + el.y2 * el.x2 - el.x2 * el.y) / Math.sqrt(Math.pow(el.x2 - el.x, 2) + Math.pow(el.y2 - el.y, 2)))
        return d < el.thickness
      }
      if ('x' in el && 'y' in el) {
        return Math.abs(pos.x - (el as any).x) < 30 && Math.abs(pos.y - (el as any).y) < 30
      }
      return false
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const sn = snap(pos.x, pos.y)

    if (tool === 'select') {
      const clicked = findElementAt(pos)
      setSelectedId(clicked?.id ?? null)
    } else if (tool === 'wall') {
      if (!isDrawing) { setIsDrawing(true); setDrawStart(sn); }
      else { setElements([...elements, { type: 'wall', id: nextId, x: drawStart!.x, y: drawStart!.y, x2: sn.x, y2: sn.y, thickness: 6 }]); setNextId(v => v + 1); setIsDrawing(false); setDrawStart(null); }
    } else if (tool === 'door') {
      setElements([...elements, { type: 'door', id: nextId, x: sn.x, y: sn.y, width: 30, angle: 0 }]); setNextId(v => v + 1)
    } else if (tool === 'window') {
      setElements([...elements, { type: 'window', id: nextId, x: sn.x, y: sn.y, width: 40, rotation: 0 }]); setNextId(v => v + 1)
    } else if (tool === 'room') {
      if (!isDrawing) { setIsDrawing(true); setDrawStart(sn); }
      else { setElements([...elements, { type: 'room', id: nextId, x: Math.min(drawStart!.x, sn.x), y: Math.min(drawStart!.y, sn.y), width: Math.abs(sn.x - drawStart!.x), height: Math.abs(sn.y - drawStart!.y), name: `Room ${nextId}` }]); setNextId(v => v + 1); setIsDrawing(false); setDrawStart(null); }
    } else if (tool === 'measure') {
      if (!measureStart) setMeasureStart(sn)
      else { setElements([...elements, { type: 'dimension', id: nextId, x1: measureStart.x, y1: measureStart.y, x2: sn.x, y2: sn.y }]); setNextId(v => v + 1); setMeasureStart(null); }
    } else if (tool === 'eraser') {
      const clicked = findElementAt(pos)
      if (clicked) setElements(elements.filter(e => e.id !== clicked.id))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => { const p = getMousePos(e); setMousePos(snap(p.x, p.y)) }
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.max(5, Math.min(50, z - e.deltaY * 0.01))) }

  const addFurniture = (item: typeof FURNITURE_ITEMS[0]) => {
    setElements([...elements, { type: 'furniture', id: nextId, x: mousePos.x, y: mousePos.y, width: item.w, height: item.h, name: item.name, rotation: 0 }])
    setNextId(v => v + 1)
    setShowFurniture(false)
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'v') setTool('select')
      else if (e.key === 'w') setTool('wall')
      else if (e.key === 'd') setTool('door')
      else if (e.key === 'n') setTool('window')
      else if (e.key === 'r') setTool('room')
      else if (e.key === 'm') setTool('measure')
      else if (e.key === 'e') setTool('eraser')
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) setElements(elements.filter(el => el.id !== selectedId))
      else if (e.key === 'Escape') { setIsDrawing(false); setDrawStart(null); setMeasureStart(null); }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, elements])

  return (
    <div className="flex flex-col h-full bg-stone-900">
      <div className="flex items-center gap-1 p-2 bg-stone-800 border-b border-stone-700">
        {[
          { k: 'select', i: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z', t: 'Select (V)' },
          { k: 'wall', i: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18', t: 'Wall (W)' },
          { k: 'door', i: 'M4 2h16v20H4zM4 10h16', t: 'Door (D)' },
          { k: 'window', i: 'M3 3h18v18H3zM3 12h18', t: 'Window (N)' },
          { k: 'room', i: 'M3 3h18v18H3zM3 9h18M9 3v18', t: 'Room (R)' },
          { k: 'measure', i: 'M21 6H3M21 6v12M3 6v12M21 18H3', t: 'Measure (M)' },
          { k: 'eraser', i: 'M20 20H7L3 16l9-9 8 8-4 4', t: 'Eraser (E)' },
        ].map(t => (
          <button key={t.k} onClick={() => setTool(t.k as Tool)} className={`p-2 rounded-lg ${tool === t.k ? 'bg-stone-600 text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`} title={t.t}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.i} /></svg>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowFurniture(!showFurniture)} className={`p-2 rounded-lg ${showFurniture ? 'bg-stone-600 text-white' : 'text-stone-400 hover:bg-stone-700'}`} title="Furniture">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </button>
      </div>
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onWheel={handleWheel} />
        {showFurniture && (
          <div className="absolute left-2 top-2 w-48 bg-stone-800 border border-stone-700 rounded-lg p-2 max-h-64 overflow-y-auto">
            <div className="text-xs font-medium text-stone-400 mb-2">Furniture</div>
            {FURNITURE_ITEMS.map((item, i) => (
              <button key={i} onClick={() => addFurniture(item)} className="w-full text-left px-2 py-1.5 text-sm text-stone-300 hover:bg-stone-700 rounded">{item.name}</button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-4 py-2 bg-stone-800 border-t border-stone-700 text-xs text-stone-400">
        <span>Tool: <strong className="text-stone-200">{tool}</strong></span>
        <span>X: <strong className="text-stone-200">{Math.round(mousePos.x)}</strong></span>
        <span>Y: <strong className="text-stone-200">{Math.round(mousePos.y)}</strong></span>
        <span>Zoom: <strong className="text-stone-200">{Math.round(zoom)}</strong></span>
        <span>Elements: <strong className="text-stone-200">{elements.length}</strong></span>
      </div>
    </div>
  )
}