import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Calculator,
  Maximize,
  Gauge,
  ScanLine,
  FileSpreadsheet,
  HardDrive,
  Hourglass,
  Menu,
  X,
  ChevronRight,
  Download,
  Plus,
  Trash2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  Search,
  Code2,
  FileScan,
  Scale,
  List,
} from "lucide-react";

// --- Types & Constants ---

const FRAME_RATES: number[] = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

const RESOLUTIONS = [
  { name: "SD (NTSC)", w: 720, h: 480 },
  { name: "SD (PAL)", w: 720, h: 576 },
  { name: "HD 720p", w: 1280, h: 720 },
  { name: "HD 1080p", w: 1920, h: 1080 },
  { name: "2K DCI", w: 2048, h: 1080 },
  { name: "UHD 4K", w: 3840, h: 2160 },
  { name: "4K DCI", w: 4096, h: 2160 },
  { name: "6K", w: 6144, h: 3456 },
  { name: "8K UHD", w: 7680, h: 4320 },
];

const DATA_RATES_MBPS: Record<string, number> = {
  "ProRes 422 Proxy": 45,
  "ProRes 422 LT": 100,
  "ProRes 422": 147,
  "ProRes 422 HQ": 220,
  "ProRes 4444": 330,
  "DNxHR LB": 145,
  "DNxHR SQ": 290,
  "DNxHR HQ": 440,
  "H.264 (Web High)": 20,
  "H.265 (HEVC)": 15,
  "RAW (3:1)": 800,
  "RAW (5:1)": 500,
  "RAW (8:1)": 300,
  "RAW (12:1)": 200,
};

// --- Helper Functions ---

const framesToTC = (frames: number, fps: number): string => {
  const roundFps = Math.ceil(fps);
  const h = Math.floor(frames / (3600 * roundFps));
  const m = Math.floor((frames % (3600 * roundFps)) / (60 * roundFps));
  const s = Math.floor(((frames % (3600 * roundFps)) % (60 * roundFps)) / roundFps);
  const f = Math.floor(((frames % (3600 * roundFps)) % (60 * roundFps)) % roundFps);
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
};

const tcToFrames = (tc: string, fps: number): number => {
  if (!tc) return 0;
  const parts = tc.split(/[:;]/).map(Number);
  if (parts.length !== 4) return 0;
  const roundFps = Math.ceil(fps);
  return (
    parts[0] * 3600 * roundFps +
    parts[1] * 60 * roundFps +
    parts[2] * roundFps +
    parts[3]
  );
};

const formatNumber = (num: number, decimals = 2) =>
  num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

// --- Components ---

interface CopyButtonProps {
    text: string;
    label?: string;
    className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, label, className }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy} 
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md border shadow-sm ${
                copied 
                    ? "bg-black text-white border-black" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            } ${className}`}
            title="Copy to clipboard"
        >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {label && <span>{copied ? "Copied" : label}</span>}
        </button>
    );
};

interface ToolCardProps {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-start p-6 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md text-left w-full h-full group"
  >
    <div className="p-3 bg-gray-100 rounded-lg text-black mb-4 group-hover:bg-black group-hover:text-white transition-colors duration-300">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </button>
);

// --- 1. Timecode Calculator ---

const TimecodeCalculator = () => {
  const [fps, setFps] = useState<number>(24);
  const [mode, setMode] = useState<"sum" | "diff">("sum");
  const [inputs, setInputs] = useState<string[]>(["", ""]);
  const [result, setResult] = useState("00:00:00:00");

  useEffect(() => {
    let totalFrames = 0;
    if (mode === "sum") {
      totalFrames = inputs.reduce((acc, curr) => acc + tcToFrames(curr, fps), 0);
    } else {
      const f1 = tcToFrames(inputs[0], fps);
      const f2 = tcToFrames(inputs[1], fps);
      totalFrames = Math.abs(f1 - f2);
    }
    setResult(framesToTC(totalFrames, fps));
  }, [inputs, fps, mode]);

  const updateInput = (index: number, val: string) => {
    const newInputs = [...inputs];
    newInputs[index] = val;
    setInputs(newInputs);
  };

  const handlePaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length > 0) {
        if (mode === "sum") {
            const newInputs = [...inputs];
            newInputs[index] = lines[0];
            if (lines.length > 1) {
                newInputs.splice(index + 1, 0, ...lines.slice(1));
            }
            setInputs(newInputs);
        } else {
            const newInputs = [...inputs];
            newInputs[index] = lines[0];
            if (lines.length > 1 && index + 1 < newInputs.length) {
                newInputs[index + 1] = lines[1];
            }
            setInputs(newInputs);
        }
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Frame Rate</label>
                <div className="flex items-center gap-2">
                    <select
                        onChange={(e) => {
                            if (e.target.value) setFps(Number(e.target.value));
                        }}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 text-sm focus:ring-2 focus:ring-black outline-none"
                        value={FRAME_RATES.includes(fps) ? fps : ""}
                    >
                        <option value="">Custom FPS</option>
                        {FRAME_RATES.map((r) => (
                            <option key={r} value={r}>{r} fps</option>
                        ))}
                    </select>
                    <div className="relative flex-1">
                        <input 
                            type="number" 
                            value={fps} 
                            onChange={e => setFps(Number(e.target.value))}
                            className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:ring-2 focus:ring-black outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">FPS</span>
                    </div>
                </div>
            </div>
            <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Mode</label>
            <div className="flex bg-white rounded-lg p-1 border border-gray-300">
                <button
                onClick={() => { setMode("sum"); setInputs(["", ""]); }}
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${mode === "sum" ? "bg-black text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                >
                Add
                </button>
                <button
                onClick={() => { setMode("diff"); setInputs(["", ""]); }}
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${mode === "diff" ? "bg-black text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                >
                Subtract
                </button>
            </div>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {inputs.map((tc, idx) => (
          <div key={idx} className="flex gap-3 group relative">
            <div className="flex-none w-10 flex items-center justify-center bg-gray-100 text-gray-400 font-mono text-xs rounded-lg border border-gray-200">
                {idx + 1}
            </div>
            <input
              type="text"
              value={tc}
              onChange={(e) => updateInput(idx, e.target.value)}
              onPaste={(e) => handlePaste(e, idx)}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-xl font-mono text-center tracking-widest text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none placeholder:text-gray-200 transition-all shadow-sm"
              placeholder="00:00:00:00"
            />
            {mode === "sum" && inputs.length > 1 && (
              <button 
                onClick={() => setInputs(inputs.filter((_, i) => i !== idx))} 
                className="flex-none w-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {mode === "sum" && (
          <button
            onClick={() => setInputs([...inputs, ""])}
            className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-black rounded-lg transition-colors flex items-center justify-center gap-2 font-bold text-sm"
          >
            <Plus size={16} /> Add Line
          </button>
        )}
      </div>

      <div className="bg-black text-white p-8 rounded-2xl shadow-xl flex flex-col items-center text-center">
        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Duration</div>
        <div className="text-5xl sm:text-6xl font-mono font-bold tracking-tighter mb-6 text-white">{result}</div>
        <CopyButton text={result} label="Copy Result" className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
      </div>
    </div>
  );
};

// --- 2. Zoom Calculator ---

const ZoomCalculator = () => {
  const [srcW, setSrcW] = useState(3840);
  const [srcH, setSrcH] = useState(2160);
  const [delW, setDelW] = useState(1920);
  const [delH, setDelH] = useState(1080);

  const scale = (srcW / delW) * 100;
  const fitPercentage = Math.min((delW / srcW), (delH / srcH)) * 100;

  const avidVal = formatNumber(fitPercentage);
  const davinciVal = formatNumber(fitPercentage / 100, 3);
  const maxZoomVal = formatNumber(100 / (fitPercentage/100));

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-gray-900 font-bold flex items-center gap-2">
            <Maximize size={18} /> Source Footage
          </h3>
          <select 
            className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-black outline-none"
            onChange={(e) => {
              const res = RESOLUTIONS.find(r => r.name === e.target.value);
              if (res) { setSrcW(res.w); setSrcH(res.h); }
            }}
          >
            <option value="">Custom Resolution</option>
            {RESOLUTIONS.map(r => <option key={r.name} value={r.name}>{r.name} ({r.w}x{r.h})</option>)}
          </select>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input type="number" value={srcW} onChange={e => setSrcW(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">W</span>
            </div>
            <div className="relative flex-1">
                <input type="number" value={srcH} onChange={e => setSrcH(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">H</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-gray-900 font-bold flex items-center gap-2">
            <ScanLine size={18} /> Delivery
          </h3>
          <select 
            className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-black outline-none"
            onChange={(e) => {
              const res = RESOLUTIONS.find(r => r.name === e.target.value);
              if (res) { setDelW(res.w); setDelH(res.h); }
            }}
          >
            <option value="">Custom Resolution</option>
            {RESOLUTIONS.map(r => <option key={r.name} value={r.name}>{r.name} ({r.w}x{r.h})</option>)}
          </select>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input type="number" value={delW} onChange={e => setDelW(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">W</span>
            </div>
            <div className="relative flex-1">
                <input type="number" value={delH} onChange={e => setDelH(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">H</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-black text-white p-6 rounded-xl shadow-xl relative hover:scale-[1.01] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wide">Avid / Premiere</div>
            <CopyButton text={avidVal + "%"} className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
          </div>
          <div className="text-4xl font-mono font-bold text-white tracking-tight">{avidVal}%</div>
          <div className="text-gray-500 text-xs mt-2 font-medium">Scale to Fit</div>
        </div>
        <div className="bg-black text-white p-6 rounded-xl shadow-xl relative hover:scale-[1.01] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wide">DaVinci / Nuke</div>
            <CopyButton text={davinciVal} className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
          </div>
          <div className="text-4xl font-mono font-bold text-white tracking-tight">{davinciVal}</div>
          <div className="text-gray-500 text-xs mt-2 font-medium">Scale Factor</div>
        </div>
        <div className="bg-black text-white p-6 rounded-xl shadow-xl relative hover:scale-[1.01] transition-transform">
            <div className="flex justify-between items-start mb-4">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wide">Max Zoom</div>
                <CopyButton text={maxZoomVal + "%"} className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
            </div>
            <div className="text-4xl font-mono font-bold text-white tracking-tight">{maxZoomVal}%</div>
            <div className="text-gray-500 text-xs mt-2 font-medium">No Quality Loss</div>
        </div>
      </div>
    </div>
  );
};

// --- 3. Speed Calculator ---

const SpeedCalculator = () => {
  const [clipFps, setClipFps] = useState<number>(59.94);
  const [timelineFps, setTimelineFps] = useState<number>(23.976);

  const speedChangeVal = formatNumber((timelineFps / clipFps) * 100);
  const restoreSpeedVal = formatNumber((clipFps / timelineFps) * 100);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="grid grid-cols-2 gap-8 bg-gray-50 p-8 rounded-2xl border border-gray-200">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Clip FPS</label>
            <select
                onChange={(e) => {
                    if (e.target.value) setClipFps(Number(e.target.value));
                }}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:ring-2 focus:ring-black outline-none"
                value={FRAME_RATES.includes(clipFps) ? clipFps : ""}
            >
                <option value="">Custom</option>
                {FRAME_RATES.map((r) => (
                    <option key={r} value={r}>{r} fps</option>
                ))}
            </select>
          <input 
            type="number" 
            value={clipFps} 
            onChange={e => setClipFps(Number(e.target.value))}
            className="w-full bg-white px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-mono text-lg focus:ring-2 focus:ring-black outline-none shadow-sm" 
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Timeline FPS</label>
            <select
                onChange={(e) => {
                    if (e.target.value) setTimelineFps(Number(e.target.value));
                }}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:ring-2 focus:ring-black outline-none"
                value={FRAME_RATES.includes(timelineFps) ? timelineFps : ""}
            >
                <option value="">Custom</option>
                {FRAME_RATES.map((r) => (
                    <option key={r} value={r}>{r} fps</option>
                ))}
            </select>
          <input 
            type="number" 
            value={timelineFps} 
            onChange={e => setTimelineFps(Number(e.target.value))}
            className="w-full bg-white px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-mono text-lg focus:ring-2 focus:ring-black outline-none shadow-sm" 
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-black text-white p-8 rounded-2xl shadow-xl hover:scale-[1.01] transition-transform flex flex-col items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-white">
                <Gauge size={120} />
            </div>
            <div className="w-full flex justify-between items-center mb-6 relative z-10">
                <h4 className="text-white font-bold text-lg">Match Timeline Rate</h4>
                <CopyButton text={speedChangeVal + "%"} className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
            </div>
            <div className="text-5xl font-mono font-bold text-white mb-3 relative z-10">{speedChangeVal}%</div>
            <p className="text-gray-400 text-sm font-medium relative z-10">Use clip as Slow Motion</p>
        </div>
        <div className="bg-black text-white p-8 rounded-2xl shadow-xl hover:scale-[1.01] transition-transform flex flex-col items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-white">
                <Maximize size={120} />
          </div>
          <div className="w-full flex justify-between items-center mb-6 relative z-10">
            <h4 className="text-white font-bold text-lg">Restore Original Rate</h4>
            <CopyButton text={restoreSpeedVal + "%"} className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
          </div>
          <div className="text-5xl font-mono font-bold text-white mb-3 relative z-10">{restoreSpeedVal}%</div>
          <p className="text-gray-400 text-sm font-medium relative z-10">Speed up to realtime</p>
        </div>
      </div>
    </div>
  );
};

// --- 4. Mask Generator ---

const MaskGenerator = () => {
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [aspect, setAspect] = useState(2.35);
  const [opacity, setOpacity] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset
    ctx.clearRect(0, 0, width, height);
    canvas.width = width;
    canvas.height = height;

    // Fill Overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity / 100})`;
    ctx.fillRect(0, 0, width, height);

    // Clear Center
    const targetHeight = width / aspect;
    const y = (height - targetHeight) / 2;
    
    if (targetHeight < height) {
        // Letterbox
        ctx.clearRect(0, y, width, targetHeight);
    } else {
        // Pillarbox
        const targetWidth = height * aspect;
        const x = (width - targetWidth) / 2;
        ctx.clearRect(x, 0, targetWidth, height);
    }
  };

  useEffect(draw, [width, height, aspect, opacity]);

  const download = () => {
    const link = document.createElement('a');
    link.download = `mask_${width}x${height}_${aspect}.png`;
    link.href = canvasRef.current?.toDataURL() || "";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Resolution</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" placeholder="W" />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">W</span>
                    </div>
                    <div className="relative flex-1">
                        <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" placeholder="H" />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">H</span>
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Aspect Ratio</label>
                <div className="relative">
                    <select value={aspect} onChange={e => setAspect(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none appearance-none">
                        <option value={2.39}>2.39:1 (CinemaScope)</option>
                        <option value={2.35}>2.35:1 (Widescreen)</option>
                        <option value={1.85}>1.85:1 (Flat)</option>
                        <option value={1.7777}>16:9 (HD)</option>
                        <option value={1.3333}>4:3 (SD)</option>
                        <option value={1}>1:1 (Square)</option>
                        <option value={0.8}>4:5 (Social Vertical)</option>
                        <option value={0.5625}>9:16 (Story)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <ChevronRight className="rotate-90" size={16} />
                    </div>
                </div>
            </div>
            <div>
                 <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Overlay Opacity ({opacity}%)</label>
                 <input type="range" min="0" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            </div>
            <button onClick={download} className="w-full py-3 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 flex items-center justify-center gap-2 transition-transform active:scale-95">
                <Download size={18} /> Download PNG
            </button>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-2xl flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] shadow-inner min-h-[300px]">
             <canvas ref={canvasRef} className="max-w-full h-auto border border-gray-200 shadow-xl rounded-sm" style={{ maxHeight: '300px' }} />
        </div>
      </div>
    </div>
  );
};

// --- 5. EDL Hacker ---

const EDLHacker = () => {
  const [edlData, setEdlData] = useState<any[]>([]);
  const [rawEdlText, setRawEdlText] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [fps, setFps] = useState<number>(24);

  const detectFramerate = (text: string): number => {
      if (text.includes('FCM: DROP FRAME')) return 29.97;
      if (text.includes('FCM: NON-DROP FRAME')) return 30; // Could be 24, 25, 30. 30 is a safe bet.
      
      const tcRegex = /(\d{2}:\d{2}:\d{2}:\d{2})/g;
      const matches = text.match(tcRegex);
      if (!matches) return 24; // Default

      let maxFrame = 0;
      for (const match of matches) {
          const frame = parseInt(match.slice(-2));
          if (frame > maxFrame) maxFrame = frame;
      }

      if (maxFrame > 50) return 60;
      if (maxFrame > 40) return 50;
      if (maxFrame > 25) return 29.97;
      if (maxFrame > 24) return 25;
      return 24;
  };

  const parseEDL = (text: string, currentFps: number, filename?: string) => {
    const lines = text.split('\n');
    const clips = [];
    let currentClip: any = {};
    let globalTrack = '';

    if (filename) {
        const fileTrackMatch = filename.match(/(?:^|[\s_-])([VA]\d+)(?:\.[^.]+)?$/i);
        if (fileTrackMatch) {
            globalTrack = fileTrackMatch[1].toUpperCase();
        }
    }
    
    // CMX 3600 standard regex: Index, Reel, Type, Trans, [Optional Duration], SrcIn, SrcOut, RecIn, RecOut
    const eventRegex = /^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)(?:.*?)\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})/;
    const nameRegex = /\*\s*FROM CLIP NAME:\s*(.*)/;
    const toNameRegex = /\*\s*TO CLIP NAME:\s*(.*)/;
    const sourceFileRegex = /\*\s*SOURCE FILE:\s*(.*)/;
    const trackCommentRegex = /\*\s*(?:TARGET\s+)?TRACK:\s*([VA]\d+)/i;
    const titleRegex = /^TITLE:\s*(.*)/i;

    for (const line of lines) {
        const titleMatch = line.match(titleRegex);
        if (titleMatch && !globalTrack) {
            const titleTrackMatch = titleMatch[1].trim().match(/(?:^|[\s_-])([VA]\d+)$/i);
            if (titleTrackMatch) {
                globalTrack = titleTrackMatch[1].toUpperCase();
            }
        }

        const eventMatch = line.match(eventRegex);
        if (eventMatch) {
            if (currentClip.id) clips.push(currentClip);

            let trackVal = eventMatch[3];
            if ((trackVal === 'V' || trackVal === 'A') && globalTrack && globalTrack.startsWith(trackVal)) {
                trackVal = globalTrack;
            }

            let transVal = eventMatch[4];
            if (transVal === 'C') transVal = 'Cut (C)';
            else if (transVal === 'D') transVal = 'Dissolve (D)';
            else if (transVal.startsWith('W')) transVal = `Wipe (${transVal})`;
            else if (transVal === 'K') transVal = 'Key (K)';

            let reelVal = eventMatch[2];
            if (reelVal === 'BL' || reelVal === 'BLK') reelVal = `Black (${reelVal})`;
            else if (reelVal === 'AX') reelVal = 'Auxiliary (AX)';
            else if (reelVal === 'GEN') reelVal = 'Generator (GEN)';

            const srcInFrames = tcToFrames(eventMatch[5], currentFps);
            const srcOutFrames = tcToFrames(eventMatch[6], currentFps);
            const srcDurFrames = srcOutFrames - srcInFrames;

            currentClip = {
                id: eventMatch[1],
                reel: reelVal,
                track: trackVal,
                trans: transVal,
                srcIn: eventMatch[5],
                srcOut: eventMatch[6],
                srcDur: framesToTC(srcDurFrames, currentFps),
                recIn: eventMatch[7],
                recOut: eventMatch[8],
                name: '',
                sourceFile: ''
            };
        }
        
        // Parse comments
        if (currentClip.id) {
            const isTransition = clips.length > 0 && clips[clips.length - 1].id === currentClip.id;

            const nameMatch = line.match(nameRegex);
            if (nameMatch) {
                if (isTransition) {
                    clips[clips.length - 1].name = nameMatch[1].trim();
                    if (!clips[clips.length - 1].sourceFile) clips[clips.length - 1].sourceFile = clips[clips.length - 1].name;
                } else {
                    currentClip.name = nameMatch[1].trim();
                    if (!currentClip.sourceFile) currentClip.sourceFile = currentClip.name;
                }
            }

            const toNameMatch = line.match(toNameRegex);
            if (toNameMatch) {
                currentClip.name = toNameMatch[1].trim();
                if (!currentClip.sourceFile) currentClip.sourceFile = currentClip.name;
            }

            const sourceMatch = line.match(sourceFileRegex);
            if (sourceMatch) {
                if (isTransition) {
                    clips[clips.length - 1].sourceFile = sourceMatch[1].trim();
                } else {
                    currentClip.sourceFile = sourceMatch[1].trim();
                }
            }

            const trackMatch = line.match(trackCommentRegex);
            if (trackMatch) {
                currentClip.track = trackMatch[1].toUpperCase();
                if (isTransition) {
                    clips[clips.length - 1].track = trackMatch[1].toUpperCase();
                }
            }
        }
    }
    if (currentClip.id) clips.push(currentClip);
    setEdlData(clips);
  };
  
  useEffect(() => {
      if (rawEdlText) {
          const detectedFps = detectFramerate(rawEdlText);
          setFps(detectedFps);
          parseEDL(rawEdlText, detectedFps);
      }
  }, [rawEdlText]);

  useEffect(() => {
      if (rawEdlText) {
          parseEDL(rawEdlText, fps);
      }
  }, [fps]);

  const handleFile = (file: File) => {
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => setRawEdlText(ev.target?.result as string);
        reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
    } else if (e.type === "dragleave") {
        setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
  };

  const downloadCSV = () => {
    if (edlData.length === 0) return;
    const headers = ["Clip Number", "Track", "Reel", "Transition", "SRC IN", "SRC OUT", "Source Duration", "TL IN", "TL OUT", "Clip Name", "Source File Name"];
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + edlData.map(c => `${c.id},${c.track},${c.reel},${c.trans},${c.srcIn},${c.srcOut},${c.srcDur},${c.recIn},${c.recOut},"${c.name}","${c.sourceFile}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `edl_export_${fps}fps.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedEDL: any[] = [];
  let currentGroup: any = null;
  for (const clip of edlData) {
      if (!currentGroup || currentGroup.id !== clip.id) {
          currentGroup = { id: clip.id, track: clip.track, clips: [] };
          groupedEDL.push(currentGroup);
      }
      currentGroup.clips.push(clip);
  }

  return (
    <div className="space-y-6 w-full h-full">
      {edlData.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all min-h-[50vh] flex flex-col items-center justify-center
                ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="p-4 bg-gray-100 rounded-full mb-6">
                 <UploadCloud className="h-10 w-10 text-gray-600" />
            </div>
            <div className="text-xl font-bold mb-4 text-gray-900">Drag & Drop EDL File</div>
            <label className="cursor-pointer">
                <span className="bg-black text-white px-6 py-3 font-bold rounded-lg hover:bg-gray-800 transition inline-block">Or Browse Computer</span>
                <input type="file" accept=".edl" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            <p className="text-gray-500 text-sm mt-6">CMX 3600 Standard supported</p>
          </div>
      ) : (
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-none flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Check size={16} className="text-black" />
                        {edlData.length} Clips Extracted
                    </h3>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">FPS</label>
                        <select
                            onChange={(e) => {
                                if (e.target.value) setFps(Number(e.target.value));
                            }}
                            className="bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-900 text-xs focus:ring-2 focus:ring-black outline-none"
                            value={FRAME_RATES.includes(fps) ? fps : ""}
                        >
                            <option value="">Custom</option>
                            {FRAME_RATES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <input 
                            type="number" 
                            value={fps} 
                            onChange={e => setFps(Number(e.target.value))}
                            className="w-20 bg-white px-2 py-1 border border-gray-300 rounded-md text-gray-900 font-mono text-xs focus:ring-2 focus:ring-black outline-none"
                        />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setViewMode(viewMode === 'table' ? 'grouped' : 'table')} className="text-gray-500 hover:text-black text-sm font-medium px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2">
                        {viewMode === 'table' ? <List size={14} /> : <FileSpreadsheet size={14} />}
                        {viewMode === 'table' ? 'Grouped View' : 'Table View'}
                    </button>
                    <button onClick={() => { setEdlData([]); setRawEdlText(''); }} className="text-gray-500 hover:text-black text-sm font-medium px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                        Clear
                    </button>
                    <button onClick={downloadCSV} className="text-white bg-black hover:bg-gray-800 text-sm font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm">
                        <Download size={14} /> Download CSV
                    </button>
                  </div>
              </div>
              {viewMode === 'grouped' ? (
                  <div className="flex-1 overflow-auto max-h-[70vh] bg-gray-50 p-4 space-y-4">
                      {groupedEDL.map((group, gIdx) => (
                          <div key={gIdx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                  <span className="font-bold text-gray-800 flex items-center gap-2">
                                      <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Event</span>
                                      {group.id}
                                  </span>
                                  <span className="text-xs font-bold bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md shadow-sm">
                                      Track: {group.track}
                                  </span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                  {group.clips.map((clip: any, cIdx: number) => (
                                      <div key={cIdx} className="p-4 flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center hover:bg-gray-50 transition-colors">
                                          <div className="flex-none flex flex-wrap gap-2 w-full lg:w-auto">
                                              <div className="bg-gray-50 border border-gray-100 rounded-md p-2 flex-1 lg:w-32">
                                                  <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Source</span>
                                                  <div className="font-mono text-xs text-gray-600">{clip.srcIn}</div>
                                                  <div className="font-mono text-xs text-gray-600">{clip.srcOut}</div>
                                              </div>
                                              <div className="bg-gray-50 border border-gray-100 rounded-md p-2 flex-1 lg:w-32">
                                                  <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Src Duration</span>
                                                  <div className="font-mono text-xs text-gray-900 font-medium">{clip.srcDur}</div>
                                              </div>
                                              <div className="bg-gray-50 border border-gray-100 rounded-md p-2 flex-1 lg:w-32">
                                                  <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Timeline</span>
                                                  <div className="font-mono text-xs text-gray-900 font-medium">{clip.recIn}</div>
                                                  <div className="font-mono text-xs text-gray-900 font-medium">{clip.recOut}</div>
                                              </div>
                                          </div>
                                          <div className="flex-1 min-w-0 w-full">
                                              <div className="font-bold text-gray-900 truncate text-base">{clip.name || clip.sourceFile || 'Unnamed Clip'}</div>
                                              <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">Reel: {clip.reel}</span>
                                                  {clip.sourceFile && <span className="truncate">File: {clip.sourceFile}</span>}
                                              </div>
                                          </div>
                                          <div className="flex-none w-36 lg:text-right">
                                              <span className={`text-xs font-bold px-2.5 py-1.5 rounded-md border inline-block ${
                                                  clip.trans.includes('Dissolve') ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                  clip.trans.includes('Wipe') ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                  'bg-gray-50 text-gray-700 border-gray-200'
                                              }`}>
                                                  {clip.trans}
                                              </span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="flex-1 overflow-auto max-h-[70vh]">
                    <table className="w-full text-left text-sm text-gray-700 border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10 text-xs uppercase tracking-wider shadow-sm">
                            <tr>
                                <th className="p-4 border-b border-gray-200">Clip #</th>
                                <th className="p-4 border-b border-gray-200">Track</th>
                                <th className="p-4 border-b border-gray-200">Reel</th>
                                <th className="p-4 border-b border-gray-200">Transition</th>
                                <th className="p-4 border-b border-gray-200">SRC IN</th>
                                <th className="p-4 border-b border-gray-200">SRC OUT</th>
                                <th className="p-4 border-b border-gray-200">SRC DUR</th>
                                <th className="p-4 border-b border-gray-200">TL IN</th>
                                <th className="p-4 border-b border-gray-200">TL OUT</th>
                                <th className="p-4 border-b border-gray-200">Clip Name</th>
                                <th className="p-4 border-b border-gray-200">Source File</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs divide-y divide-gray-100">
                            {edlData.map((clip, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-gray-500">{clip.id}</td>
                                    <td className="p-4">{clip.track}</td>
                                    <td className="p-4">{clip.reel}</td>
                                    <td className="p-4 font-medium text-gray-900">{clip.trans}</td>
                                    <td className="p-4">{clip.srcIn}</td>
                                    <td className="p-4">{clip.srcOut}</td>
                                    <td className="p-4 font-bold text-gray-900">{clip.srcDur}</td>
                                    <td className="p-4">{clip.recIn}</td>
                                    <td className="p-4">{clip.recOut}</td>
                                    <td className="p-4 font-medium font-sans text-gray-900">{clip.name}</td>
                                    <td className="p-4 font-medium font-sans text-gray-500">{clip.sourceFile}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};













const JsonSyntaxHighlighter: React.FC<{ json: any }> = ({ json }) => {
    const jsonString = JSON.stringify(json, null, 2);

    const highlightedJson = jsonString.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'text-green-600'; // number
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-red-600'; // key
                } else {
                    cls = 'text-yellow-600'; // string
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-blue-600'; // boolean
            } else if (/null/.test(match)) {
                cls = 'text-gray-500'; // null
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );

    return (
        <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto text-sm">
            <code dangerouslySetInnerHTML={{ __html: highlightedJson }} />
        </pre>
    );
};

// --- 6. AVB Inspector ---

const AVBInspector = () => {
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avbData, setAvbData] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'human' | 'raw'>('human');
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (loading) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [loading]);

    const handleFile = async (file: File) => {
        if (!file || !file.name.toLowerCase().endsWith('.avb')) {
            setError("Please upload a .avb file");
            return;
        }

        setLoading(true);
        setError(null);
        setAvbData(null);
        setOriginalFile(file);
        setViewMode('human');
        setUploadProgress(0);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/avb", true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    console.log(`Upload progress: ${percentComplete}%`);
                    setUploadProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                console.log("Upload complete.");
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    setAvbData(data);
                } else {
                    const err = JSON.parse(xhr.responseText);
                    throw new Error(err.details || err.error || `HTTP error! status: ${xhr.status}`);
                }
                setLoading(false);
            };

            xhr.onerror = () => {
                console.error("Upload failed.");
                setError("Upload failed.");
                setLoading(false);
            };

            xhr.send(formData);

        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };
  
    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
          setDragActive(true);
      } else if (e.type === "dragleave") {
          setDragActive(false);
      }
    };
  
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
      }
    };

    const resetState = () => {
        setDragActive(false);
        setLoading(false);
        setError(null);
        setAvbData(null);
        setViewMode('human');
        setOriginalFile(null);
    }

    const downloadCSV = async () => {
        if (!originalFile) return;

        const formData = new FormData();
        formData.append("file", originalFile);

        try {
            const response = await fetch("/api/avb/csv", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${originalFile.name.replace(/\.[^/.]+$/, "")}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
      <div className="space-y-6 w-full h-full">
        {loading ? (
            <div className="border-2 border-dashed rounded-2xl p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                <Hourglass className="h-10 w-10 text-gray-600 animate-spin" />
                <div className="text-xl font-bold mt-4 text-gray-900">Uploading...</div>
                <div className="w-full bg-gray-200 rounded-full mt-4">
                    <div
                        className="bg-black text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                    >
                        {uploadProgress}%
                    </div>
                </div>
            </div>
        ) : error ? (
            <div className="border-2 border-dashed border-red-500 bg-red-50 rounded-2xl p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                <X className="h-10 w-10 text-red-600" />
                <div className="text-xl font-bold mt-4 text-red-900">An Error Occurred</div>
                <p className="text-red-700 text-sm mt-2 max-w-lg">{error}</p>
                <button onClick={resetState} className="mt-4 bg-red-600 text-white px-6 py-3 font-bold rounded-lg hover:bg-red-700 transition inline-block">
                    Try Again
                </button>
            </div>
        ) : avbData ? (
             <div className="space-y-8">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-none rounded-xl">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Check size={16} className="text-black" />
                    Analysis Complete
                  </h3>
                  <div className="flex gap-3">
                    <button onClick={resetState} className="text-gray-500 hover:text-black text-sm font-medium px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                        Inspect Another
                    </button>
                     <button onClick={() => setViewMode(viewMode === 'raw' ? 'human' : 'raw')} className="text-white bg-black hover:bg-gray-800 text-sm font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm">
                        {viewMode === 'human' ? (
                            <><Code2 size={14} /> Show Raw JSON</>
                        ) : (
                            <><Search size={14} /> Show Readable</>
                        )}
                    </button>
                    <button onClick={downloadCSV} className="text-white bg-black hover:bg-gray-800 text-sm font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm">
                        <Download size={14} /> Download CSV
                    </button>
                    <DownloadRawJSONButton data={avbData.raw_data} filename={`${avbData.summary?.['File Name'] || 'details'}.json`} />
                  </div>
              </div>
              
              {viewMode === 'human' ? (
                <div className="space-y-8 animate-in fade-in">
                    <SummaryTable summary={avbData.summary} />
                    <StreamsTable title="Mobs" streams={avbData.mobs} />
                </div>
              ) : (
                <div className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white overflow-x-auto animate-in fade-in">
                    <JsonSyntaxHighlighter json={avbData.raw_data} />
                </div>
              )}

            </div>
        ) : (
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all min-h-[50vh] flex flex-col items-center justify-center
                  ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="p-4 bg-gray-100 rounded-full mb-6">
                   <FileScan className="h-10 w-10 text-gray-600" />
              </div>
              <div className="text-xl font-bold mb-4 text-gray-900">Drag & Drop AVB File</div>
              <label className="cursor-pointer mb-4 inline-block">
                  <span className="bg-black text-white px-6 py-3 font-bold rounded-lg hover:bg-gray-800 transition inline-block">Or Browse Computer</span>
                  <input type="file" accept=".avb" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              
              <div className="flex flex-col gap-2 items-center">
                <p className="text-gray-500 text-sm max-w-md">
                    Upload an Avid Bin (<b>.avb</b>) file to inspect its contents.
                </p>
              </div>
            </div>
        )}
      </div>
    );
};

// --- 7. Data Rate Calculator ---

const DataRateCalculator = () => {
    const [codec, setCodec] = useState("ProRes 422 HQ");
    const [durationVal, setDurationVal] = useState(1);
    const [durationUnit, setDurationUnit] = useState<"min" | "hour">("hour");
    const [fps, setFps] = useState(24);

    const mbps = DATA_RATES_MBPS[codec] || 100;
    const adjustedMbps = mbps * (fps / 24);
    
    const totalMinutes = durationUnit === "hour" ? durationVal * 60 : durationVal;
    const totalSeconds = totalMinutes * 60;
    const totalMB = (adjustedMbps * totalSeconds) / 8;
    const totalGB = totalMB / 1024;
    
    const gbVal = formatNumber(totalGB) + " GB";
    const tbVal = formatNumber(totalGB / 1024, 2) + " TB";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Codec / Profile (Est. @ 24fps)</label>
                        <div className="relative">
                            <select value={codec} onChange={e => setCodec(e.target.value)} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:ring-2 focus:ring-black outline-none appearance-none">
                                {Object.keys(DATA_RATES_MBPS).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <ChevronRight className="rotate-90" size={16} />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Duration</label>
                            <div className="flex gap-2">
                                <input type="number" value={durationVal} onChange={e => setDurationVal(Number(e.target.value))} className="w-full bg-white px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" />
                                <select value={durationUnit} onChange={e => setDurationUnit(e.target.value as any)} className="bg-white px-2 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold text-xs focus:ring-2 focus:ring-black outline-none">
                                    <option value="min">Min</option>
                                    <option value="hour">Hr</option>
                                </select>
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">FPS</label>
                            <input type="number" value={fps} onChange={e => setFps(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-black outline-none" />
                         </div>
                    </div>
                </div>
                
                <div className="bg-black text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-20 text-gray-600">
                         <HardDrive size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Estimated Storage</div>
                        <div className="flex items-baseline justify-center gap-3 mb-2">
                            <div className="text-6xl font-mono font-bold tracking-tighter text-white">{formatNumber(totalGB)}</div>
                            <span className="text-xl font-medium text-gray-500">GB</span>
                        </div>
                        <div className="text-gray-400 text-sm mt-1 mb-8">approx {tbVal}</div>
                        
                        <div className="flex justify-center gap-3">
                            <CopyButton text={gbVal} label="Copy GB" className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
                            <CopyButton text={tbVal} label="Copy TB" className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="text-xs text-gray-400 p-4 border border-dashed border-gray-300 rounded-lg text-center">
                * Estimates based on standard bitrate targets. Actual file sizes vary by image complexity and specific camera implementation.
            </div>
        </div>
    );
};

// --- 8. Duration Guesstimator ---

const DurationGuesstimator = () => {
    const [size, setSize] = useState(1);
    const [unit, setUnit] = useState<"GB" | "TB">("TB");
    const [codec, setCodec] = useState("ProRes 422 Proxy");
    
    const mbps = DATA_RATES_MBPS[codec] || 100;
    const totalMB = unit === "TB" ? size * 1024 * 1024 : size * 1024;
    
    // MB = (Mbps * seconds) / 8
    // Seconds = (MB * 8) / Mbps
    const totalSeconds = (totalMB * 8) / mbps;
    
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    const resultText = `${hours}h ${mins}m`;
    
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
                 <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Available Storage</label>
                        <div className="flex gap-2">
                            <input type="number" value={size} onChange={e => setSize(Number(e.target.value))} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-lg focus:ring-2 focus:ring-black outline-none" />
                            <select value={unit} onChange={e => setUnit(e.target.value as any)} className="bg-white px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none">
                                <option value="GB">GB</option>
                                <option value="TB">TB</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Target Format</label>
                        <div className="relative">
                            <select value={codec} onChange={e => setCodec(e.target.value)} className="w-full bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:ring-2 focus:ring-black outline-none appearance-none">
                                {Object.keys(DATA_RATES_MBPS).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <ChevronRight className="rotate-90" size={16} />
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 <div className="bg-black text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center items-center text-center h-full">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Capacity Duration</div>
                    <div className="text-6xl font-mono font-bold text-white mb-6 tracking-tighter">
                        {resultText}
                    </div>
                    <CopyButton text={resultText} label="Copy Duration" className="!bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700" />
                    <div className="text-gray-400 font-medium text-xs mt-4 bg-gray-900 border border-gray-800 px-3 py-1 rounded-full">{codec}</div>
                 </div>
            </div>
        </div>
    );
};

// --- 9. MXF Inspector ---

const DownloadRawJSONButton: React.FC<{ data: any, filename: string }> = ({ data, filename }) => {
    const download = () => {
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button onClick={download} className="text-white bg-black hover:bg-gray-800 text-sm font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm">
            <Download size={14} /> Download Raw JSON
        </button>
    );
};

function RecursiveTable({ data, topLevel = false }: { data: any, topLevel?: boolean }): React.ReactElement {
    
    // For primitive values, just display them as strings.
    if (typeof data !== 'object' || data === null) {
        return <span className="text-gray-800 font-mono whitespace-pre-wrap break-all">{String(data)}</span>;
    }

    // For arrays, recursively render each item.
    if (Array.isArray(data)) {
        return (
            <div className="flex flex-col gap-2 pt-1">
                {data.map((item, index) => (
                    <CollapsibleSection key={index} title={`Item ${index}`} defaultOpen={false}>
                        <RecursiveTable data={item} />
                    </CollapsibleSection>
                ))}
            </div>
        )
    }

    // For objects, render key-value pairs.
    const entries = Object.entries(data);
    const containerClass = topLevel 
        ? "w-full text-xs space-y-2" 
        : "w-full text-xs space-y-2 pt-2";

    return (
        <div className={containerClass}>
            {entries.map(([key, value]) => {
                const formattedKey = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                const isNestable = typeof value === 'object' && value !== null && Object.keys(value).length > 0;

                if (isNestable) {
                    return (
                        <CollapsibleSection key={key} title={formattedKey} defaultOpen={false}>
                            <RecursiveTable data={value} />
                        </CollapsibleSection>
                    )
                }

                return (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                        <div className="md:col-span-1 font-medium text-gray-500 break-words">{formattedKey}</div>
                        <div className="md:col-span-2">
                            <RecursiveTable data={value} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const CollapsibleSection: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!children) return null;

    return (
        <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <h4 className="text-lg font-bold text-gray-800">{title}</h4>
                <ChevronRight size={20} className={`transition-transform transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-200 bg-white overflow-x-auto">
                    {children}
                </div>
            )}
        </div>
    )
};


const StreamsTable: React.FC<{ title: string, streams: any[] }> = ({ title, streams }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (!streams || streams.length === 0) return null;

    const headers = Object.keys(streams[0] || {}).filter(k => k !== 'details');

    return (
        <div className="mb-8">
            <h4 className="text-xl font-bold text-gray-900 mb-4">{title}</h4>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                 <div className="overflow-auto">
                    <table className="w-full text-left text-sm text-gray-700 border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wider">
                            <tr>
                                {headers.map(h => <th key={h} className="p-4 border-b border-gray-200">{h.replace(/_/g, ' ')}</th>)}
                                <th className="p-4 border-b border-gray-200"></th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs divide-y divide-gray-100">
                            {streams.map((stream, i) => (
                                <>
                                    <tr key={i} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}>
                                        {headers.map(h => <td key={h} className="p-4">{String(stream[h]) || 'N/A'}</td>)}
                                        <td className="p-4 text-right">
                                            <ChevronRight size={16} className={`transition-transform transform ${expandedIndex === i ? 'rotate-90' : ''}`} />
                                        </td>
                                    </tr>
                                    {expandedIndex === i && (
                                        <tr>
                                            <td colSpan={headers.length + 1} className="p-2 bg-gray-50 border-t border-gray-200">
                                                <RecursiveTable data={stream.details} />
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SummaryTable: React.FC<{ summary: any }> = ({ summary }) => {
    if (!summary) return null;

    // Filter out fields that are undefined, null, or empty strings
    const availableDetails = Object.entries(summary)
        .map(([key, value]) => ({
            // Create a human-readable label from the key
            label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            value
        }))
        .filter(item => item.value !== undefined && item.value !== null && item.value !== '');
    
    if (availableDetails.length === 0) {
        return null; // Don't render the section if there's nothing to show
    }

    return (
        <CollapsibleSection title="File Summary" defaultOpen={true}>
            <div className="w-full text-sm space-y-3">
                {availableDetails.map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-4 font-semibold text-gray-500 break-words">{label}</div>
                        <div className="col-span-8 text-gray-800 font-mono whitespace-pre-wrap break-all bg-gray-50 p-2 rounded-md">{String(value)}</div>
                    </div>
                ))}
            </div>
        </CollapsibleSection>
    );
};

const MXFInspector = () => {
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mxfData, setMxfData] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'human' | 'raw'>('human');
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (loading) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [loading]);

    const handleFile = async (file: File) => {
        if (!file || !file.name.toLowerCase().endsWith('.mxf')) {
            setError("Please upload a .mxf file");
            return;
        }

        setLoading(true);
        setError(null);
        setMxfData(null);
        setViewMode('human');
        setUploadProgress(0);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/mxf", true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    console.log(`Upload progress: ${percentComplete}%`);
                    setUploadProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                console.log("Upload complete.");
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    setMxfData(data);
                } else {
                    const err = JSON.parse(xhr.responseText);
                    throw new Error(err.details || err.error || `HTTP error! status: ${xhr.status}`);
                }
                setLoading(false);
            };

            xhr.onerror = () => {
                console.error("Upload failed.");
                setError("Upload failed.");
                setLoading(false);
            };
            
            xhr.send(formData);

        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };
  
    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
          setDragActive(true);
      } else if (e.type === "dragleave") {
          setDragActive(false);
      }
    };
  
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
      }
    };

    const resetState = () => {
        setDragActive(false);
        setLoading(false);
        setError(null);
        setMxfData(null);
        setViewMode('human');
    }

    return (
      <div className="space-y-6 w-full h-full">
        {loading ? (
            <div className="border-2 border-dashed rounded-2xl p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                <Hourglass className="h-10 w-10 text-gray-600 animate-spin" />
                <div className="text-xl font-bold mt-4 text-gray-900">Uploading...</div>
                <div className="w-full bg-gray-200 rounded-full mt-4">
                    <div
                        className="bg-black text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                    >
                        {uploadProgress}%
                    </div>
                </div>
            </div>
        ) : error ? (
            <div className="border-2 border-dashed border-red-500 bg-red-50 rounded-2xl p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                <X className="h-10 w-10 text-red-600" />
                <div className="text-xl font-bold mt-4 text-red-900">An Error Occurred</div>
                <p className="text-red-700 text-sm mt-2 max-w-lg">{error}</p>
                <button onClick={resetState} className="mt-4 bg-red-600 text-white px-6 py-3 font-bold rounded-lg hover:bg-red-700 transition inline-block">
                    Try Again
                </button>
            </div>
        ) : mxfData ? (
             <div className="space-y-8">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-none rounded-xl">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Check size={16} className="text-black" />
                    Analysis Complete
                  </h3>
                  <div className="flex gap-3">
                    <button onClick={resetState} className="text-gray-500 hover:text-black text-sm font-medium px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                        Inspect Another
                    </button>
                     <button onClick={() => setViewMode(viewMode === 'raw' ? 'human' : 'raw')} className="text-white bg-black hover:bg-gray-800 text-sm font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm">
                        {viewMode === 'human' ? (
                            <><Code2 size={14} /> Show Raw JSON</>
                        ) : (
                            <><Search size={14} /> Show Readable</>
                        )}
                    </button>
                    <DownloadRawJSONButton data={mxfData.raw_data} filename={`${mxfData.summary?.['File Name'] || 'details'}.json`} />
                  </div>
              </div>
              
              {viewMode === 'human' ? (
                <div className="space-y-8 animate-in fade-in">
                    <SummaryTable summary={mxfData.summary} />
                    <StreamsTable title="Video Streams" streams={mxfData.video_streams} />
                    <StreamsTable title="Audio Streams" streams={mxfData.audio_streams} />
                    <StreamsTable title="Other Streams" streams={mxfData.other_streams} />
                </div>
              ) : (
                <div className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white overflow-x-auto animate-in fade-in">
                    <JsonSyntaxHighlighter json={mxfData.raw_data} />
                </div>
              )}

            </div>
        ) : (
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all min-h-[50vh] flex flex-col items-center justify-center
                  ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="p-4 bg-gray-100 rounded-full mb-6">
                   <FileScan className="h-10 w-10 text-gray-600" />
              </div>
              <div className="text-xl font-bold mb-4 text-gray-900">Drag & Drop MXF File</div>
              <label className="cursor-pointer mb-4 inline-block">
                  <span className="bg-black text-white px-6 py-3 font-bold rounded-lg hover:bg-gray-800 transition inline-block">Or Browse Computer</span>
                  <input type="file" accept=".mxf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              
              <div className="flex flex-col gap-2 items-center">
                <p className="text-gray-500 text-sm max-w-md">
                    Upload an MXF file to inspect its technical metadata using <b>ffprobe</b>.
                </p>
              </div>
            </div>
        )}
      </div>
    );
}

// --- 10. ALE Converter ---

const AleConverter = () => {
    const [mode, setMode] = useState<'multi' | 'merge'>('multi');
    const [multiCsvDragActive, setMultiCsvDragActive] = useState(false);
    const [mergeCsvDragActive, setMergeCsvDragActive] = useState(false);
    const [loading, setLoading] = useState<string | null>(null); // 'multi' or 'merge'
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (loading) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [loading]);

    const handleSingleFileApiResponse = async (response: Response, successFileName: string) => {
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || err.error || `HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = successFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`${successFileName} downloaded successfully.`);
    };

    const handleMultiFileApiResponse = async (response: Response) => {
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || err.error || `HTTP error! status: ${response.status}`);
        }

        const files = await response.json();
        if (!Array.isArray(files)) {
            throw new Error("Invalid response from server. Expected an array of files.");
        }

        files.forEach(file => {
            const blob = new Blob([file.content], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
        setSuccess(`${files.length} CSV files downloaded successfully.`);
    };

    const processFiles = async (files: FileList | null, apiEndpoint: string, operation: 'multi' | 'merge', successFileName?: string) => {
        if (!files || files.length === 0) {
            setError("Please select one or more .ale files.");
            return;
        }

        setLoading(operation);
        setError(null);
        setSuccess(null);
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }

        try {
            const response = await fetch(apiEndpoint, {
                method: "POST",
                body: formData,
            });
            if (operation === 'multi') {
                await handleMultiFileApiResponse(response);
            } else if (successFileName) {
                await handleSingleFileApiResponse(response, successFileName);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleDrag = (e: React.DragEvent, setActive: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setActive(true);
        } else if (e.type === "dragleave") {
            setActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent, setActive: React.Dispatch<React.SetStateAction<boolean>>, callback: (files: FileList) => void) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            callback(e.dataTransfer.files);
        }
    };

    const uploader = (id: 'multi' | 'merge', dragActive: boolean, setDragActive: React.Dispatch<React.SetStateAction<boolean>>, onFiles: (files: FileList | null) => void, title: string, description: string) => (
        <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-500 text-base">{description}</p>
            
            {loading === id && (
                 <div className="rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-gray-50 border border-gray-200">
                    <Hourglass className="h-8 w-8 text-gray-600 animate-spin" />
                    <div className="text-lg font-bold mt-3 text-gray-900">Processing...</div>
                </div>
            )}

            {error && loading !== id && (
                 <div className="rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-red-50 border border-red-300">
                    <X className="h-8 w-8 text-red-600" />
                    <div className="text-lg font-bold mt-3 text-red-900">Error</div>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
            )}
             {success && loading !== id && (
                 <div className="rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-green-50 border border-green-300">
                    <Check className="h-8 w-8 text-green-600" />
                    <div className="text-lg font-bold mt-3 text-green-900">Success</div>
                    <p className="text-green-700 text-sm mt-1">{success}</p>
                </div>
            )}

            <div 
                onDragEnter={(e) => handleDrag(e, setDragActive)}
                onDragLeave={(e) => handleDrag(e, setDragActive)}
                onDragOver={(e) => handleDrag(e, setDragActive)}
                onDrop={(e) => handleDrop(e, setDragActive, (files) => onFiles(files))}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all flex flex-col items-center justify-center
                    ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}
                `}
            >
                <div className="p-4 bg-gray-100 rounded-full mb-6">
                    <UploadCloud className="h-10 w-10 text-gray-600" />
                </div>
                <div className="text-xl font-bold mb-4 text-gray-900">Drag & Drop .ALE Files</div>
                <label className="cursor-pointer">
                    <span className="bg-black text-white px-6 py-3 font-bold rounded-lg hover:bg-gray-800 transition inline-block">Or Browse Files</span>
                    <input type="file" accept=".ale" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
                </label>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Conversion Mode</label>
                <div className="flex bg-white rounded-lg p-1 border border-gray-300">
                    <button
                        onClick={() => { setMode("multi"); setError(null); setSuccess(null); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "multi" ? "bg-black text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Separate CSVs
                    </button>
                    <button
                        onClick={() => { setMode("merge"); setError(null); setSuccess(null); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "merge" ? "bg-black text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Merge to Single CSV
                    </button>
                </div>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {mode === 'multi' 
                    ? uploader('multi', multiCsvDragActive, setMultiCsvDragActive, (files) => processFiles(files, '/api/ale/multi_to_csvs', 'multi'), "Convert ALEs to separate CSVs", "Upload multiple ALE files and get each one converted to a separate CSV file.")
                    : uploader('merge', mergeCsvDragActive, setMergeCsvDragActive, (files) => processFiles(files, '/api/ale/merge_to_csv', 'merge', 'merged_ales.csv'), "Merge ALEs to a single CSV", "Upload multiple ALE files to combine them into a single, unified CSV file.")
                }
            </div>
        </div>
    );
};

// --- 11. DNx Comparer ---

const DNX_HD_DATA = [
    { 
        legacy: 'DNxHD 36/45', 
        modern: 'DNxHD LB', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 60/75/115/145', 
        modern: 'DNxHD SQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 90/100/120/175/185/220', 
        modern: 'DNxHD HQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 175x/185x/220x', 
        modern: 'DNxHD HQX', 
        bitDepth: '10', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 365x/440x', 
        modern: 'DNxHD 444', 
        bitDepth: '10',
        chroma: '4:4:4',
        colorSpace: 'RGB or YUV',
        alpha: 'Yes',
    },
];

const DNX_HR_DATA = [
    { 
        legacy: 'DNxHD 36/45', 
        modern: 'DNxHR LB', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 60/75/115/145', 
        modern: 'DNxHR SQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 90/100/120/175/185/220', 
        modern: 'DNxHR HQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 175x/185x/220x', 
        modern: 'DNxHR HQX', 
        bitDepth: '10', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
    },
    { 
        legacy: 'DNxHD 365x/440x', 
        modern: 'DNxHR 444', 
        bitDepth: '10/12',
        chroma: '4:4:4',
        colorSpace: 'RGB or YUV',
        alpha: 'Yes',
    },
];

const CodecTable = ({ data }: { data: typeof DNX_HD_DATA }) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wider">
                    <tr>
                        <th className="p-4 align-top">Legacy Name</th>
                        <th className="p-4 align-top">Modern Equivalent</th>
                        <th className="p-4 align-top">Bit Depth</th>
                        <th className="p-4 align-top">Chroma</th>
                        <th className="p-4 align-top">Color Space</th>
                        <th className="p-4 align-top">Alpha Channel</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((codec, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 align-top font-mono text-xs">{codec.legacy}</td>
                            <td className="p-4 align-top font-mono text-xs font-bold">{codec.modern}</td>
                            <td className="p-4 align-top">{codec.bitDepth}-bit</td>
                            <td className="p-4 align-top font-mono text-xs">{codec.chroma}</td>
                            <td className="p-4 align-top font-mono text-xs">{codec.colorSpace}</td>
                            <td className="p-4 align-top">{codec.alpha}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const DNxComparer = () => {
    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">1080 (HD) Resolution</h2>
                <p className="text-sm text-gray-600 mb-4">For HD resolutions, you can use both the older DNxHD codecs and the modern DNxHR codecs.</p>
                <CodecTable data={DNX_HD_DATA} />
            </div>

            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">2K / UHD / 4K+ Resolutions</h2>
                <p className="text-sm text-gray-600 mb-4">For resolutions higher than HD, only the DNxHR codecs are supported.</p>
                <CodecTable data={DNX_HR_DATA} />
            </div>

            <div className="text-xs text-gray-500 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <b>Note:</b> Quality labels (LB, SQ, HQ) are non-technical marketing terms from Avid. Actual visual quality depends on source material, resolution, and bitrate. Legacy bitrates are also frame-rate dependent.
            </div>
        </div>
    );
};

// --- MAIN APP ---

const TOOLS = [
  { id: "tc", title: "Timecode Calc", icon: Calculator, desc: "Add, subtract, and convert timecodes." },
  { id: "zoom", title: "Zoom Calc", icon: Maximize, desc: "Calculate scaling % for mixed resolutions." },
  { id: "speed", title: "Speed Calc", icon: Gauge, desc: "Find speed ramp % or restore footage." },
  { id: "mask", title: "Mask Gen", icon: ScanLine, desc: "Generate PNG overlays for cinema aspect ratios." },
  { id: "edl", title: "EDL Hacker", icon: FileSpreadsheet, desc: "Convert EDL to CSV for spreadsheets." },
  { id: "ale", title: "ALE Converter", icon: FileText, desc: "Convert and merge Avid Log Exchange files." },
  { id: "avb", title: "AVB Inspector", icon: FileScan, desc: "Inspect the contents of an Avid Bin (.avb) file." },
  { id: "mxf", title: "MXF Inspector", icon: FileScan, desc: "Probe technical metadata of MXF files." },
  { id: "data", title: "Data Rate", icon: HardDrive, desc: "Estimate storage needs for shoots." },
  { id: "guess", title: "Dur. Guess", icon: Hourglass, desc: "How much footage fits on this drive?" },
  { id: "dnx", title: "DNx Comparer", icon: Scale, desc: "Compare storage for Avid DNx codecs." },
];

const App = () => {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const activeTool = TOOLS.find(t => t.id === activeToolId);

  const renderTool = () => {
    switch (activeToolId) {
      case "tc": return <TimecodeCalculator />;
      case "zoom": return <ZoomCalculator />;
      case "speed": return <SpeedCalculator />;
      case "mask": return <MaskGenerator />;
      case "edl": return <EDLHacker />;
      case "ale": return <AleConverter />;
      case "avb": return <AVBInspector />;
      case "mxf": return <MXFInspector />;
      case "data": return <DataRateCalculator />;
      case "guess": return <DurationGuesstimator />;
      case "dnx": return <DNxComparer />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="font-serif font-black text-xl tracking-tight text-black uppercase cursor-pointer" onClick={() => setActiveToolId(null)}>EA Tools</div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-700 rounded-md hover:bg-gray-100">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="fixed inset-y-0 left-0 w-72 bg-gray-50 border-r border-gray-200 hidden lg:flex flex-col z-40">
            <div className="p-8">
                <div 
                    className="font-serif font-black text-4xl tracking-tighter text-black leading-none mb-2 cursor-pointer"
                    onClick={() => setActiveToolId(null)}
                >
                    EA<br/>TOOLS
                </div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Assistant Editor Utils</div>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                <button 
                    onClick={() => setActiveToolId(null)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                        activeToolId === null 
                            ? 'bg-white text-black shadow-sm ring-1 ring-gray-200' 
                            : 'text-gray-600 hover:bg-gray-200/50 hover:text-black'
                    }`}
                >
                    <Menu size={18} />
                    <span>Dashboard</span>
                </button>
                
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</div>

                {TOOLS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveToolId(t.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                            activeToolId === t.id 
                                ? 'bg-black text-white shadow-md transform scale-[1.02]' 
                                : 'text-gray-600 hover:bg-gray-200/50 hover:text-black'
                        }`}
                    >
                        <t.icon size={18} />
                        <span>{t.title}</span>
                    </button>
                ))}
            </nav>
            
            <div className="p-6 border-t border-gray-200">
                <div className="text-xs text-gray-400 text-center">
                    v1.1
                </div>
            </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
            <div className="fixed inset-0 z-40 flex lg:hidden">
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
                <aside className="relative w-72 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="font-serif font-black text-2xl tracking-tight">EA TOOLS</div>
                        <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        <button 
                            onClick={() => { setActiveToolId(null); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                                activeToolId === null ? 'bg-gray-100 text-black font-bold' : 'text-gray-600'
                            }`}
                        >
                            <Menu size={18} /> <span>Dashboard</span>
                        </button>
                        <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</div>
                        {TOOLS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setActiveToolId(t.id); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                                    activeToolId === t.id 
                                        ? 'bg-black text-white shadow-md' 
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <t.icon size={18} />
                                <span>{t.title}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
            </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:pl-72 w-full min-h-screen flex flex-col">
            {activeToolId ? (
                <div className={`
                    mx-auto p-6 lg:p-12
                    ${['edl', 'avb', 'mxf'].includes(activeToolId) ? 'w-full max-w-full' : 'max-w-5xl'}
                `}>
                    {/* Tool Header */}
                    <div className="mb-10">
                         <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                             {activeTool?.title}
                         </h1>
                         <p className="text-gray-500 mt-1 text-lg">{activeTool?.desc}</p>
                    </div>
                    {/* Tool Body */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {renderTool()}
                    </div>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto p-6 lg:p-12">
                    <div className="mb-8 mt-4 lg:mt-0 flex-none">
                        <h1 className="text-4xl lg:text-6xl font-serif font-black text-black mb-4 tracking-tighter">
                            THE<br/>TOOLS
                        </h1>
                        <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
                            A suite of offline-first utilities designed for the modern Assistant Editor. 
                            Simple, fast, and secure.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {TOOLS.map(tool => (
                             <ToolCard 
                                key={tool.id}
                                icon={tool.icon} 
                                title={tool.title} 
                                description={tool.desc} 
                                onClick={() => setActiveToolId(tool.id)} 
                            />
                        ))}
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);