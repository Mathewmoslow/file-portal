import { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { FileNode } from '../../types';
import { FileModal } from './FileModal';
import './ThreeMindMap.css';

interface ThreeMindMapProps {
  files: FileNode[];
  currentPath: string;
  onOpenFile: (path: string) => void;
  onSelectPath: (path: string) => void;
  onFallback?: () => void;
}

const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

// Alphabetical color bands - elegant palette
const ALPHA_BANDS = [
  { range: 'A–E', letters: 'ABCDE', color: '#1B4332', lightColor: '#2D6A4F' },  // Emerald
  { range: 'F–J', letters: 'FGHIJ', color: '#1D4E5F', lightColor: '#2A7A8C' },  // Teal
  { range: 'K–O', letters: 'KLMNO', color: '#7B5E2D', lightColor: '#A67C3D' },  // Amber
  { range: 'P–T', letters: 'PQRST', color: '#6B3A5B', lightColor: '#8B4A7A' },  // Burgundy
  { range: 'U–Z', letters: 'UVWXYZ', color: '#4A4E69', lightColor: '#6B7094' }, // Slate
];

const getAlphaBand = (name: string) => {
  const firstChar = name.charAt(0).toUpperCase();
  for (let i = 0; i < ALPHA_BANDS.length; i++) {
    if (ALPHA_BANDS[i].letters.includes(firstChar)) {
      return { index: i, band: ALPHA_BANDS[i] };
    }
  }
  return { index: 4, band: ALPHA_BANDS[4] }; // Default to last band
};

export const ThreeMindMap = ({
  files,
  currentPath,
  onOpenFile,
  onSelectPath,
  onFallback,
}: ThreeMindMapProps) => {
  const [supported, setSupported] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const focusRef = useRef<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<FileNode[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setSupported(false);
      onFallback?.();
    }
  }, [onFallback]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setShowResults(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    // Search using cached preview data - much faster!
    const matches = files.filter((f) => {
      if (f.type !== 'file') return false;

      // Search in filename
      if (f.name.toLowerCase().includes(term)) return true;

      // Search in description
      if (f.description?.toLowerCase().includes(term)) return true;

      // Search in preview text
      if (f.preview?.toLowerCase().includes(term)) return true;

      // Search in category
      if (f.category?.toLowerCase().includes(term)) return true;

      return false;
    });

    setSearchResults(matches);
  }, [search, files]);

  const layout = useMemo(() => {
    const dirs = files.filter((f) => f.type === 'directory');
    const docs = files.filter((f) => f.type === 'file');

    // Sort all items alphabetically
    const allItems = [...dirs, ...docs].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    // Determine depth based on current path - closer when deeper
    const pathDepth = currentPath.split('/').filter(Boolean).length;
    const sphereRadius = 15 - pathDepth * 2;

    // Layout items in alphabetical bands around the sphere
    const sphereLayout = (items: FileNode[], radius: number) => {
      // Group items by alphabet band
      const bandGroups: FileNode[][] = [[], [], [], [], []];
      items.forEach(item => {
        const { index } = getAlphaBand(item.name);
        bandGroups[index].push(item);
      });

      const result: Array<FileNode & {
        position: [number, number, number];
        height: number;
        alphaBand: typeof ALPHA_BANDS[0];
      }> = [];

      // Position each band in a horizontal slice of the sphere
      bandGroups.forEach((group, bandIndex) => {
        if (group.length === 0) return;

        // Each band gets a latitude range (phi angle)
        // Band 0 (A-E) at top, Band 4 (U-Z) at bottom
        const bandStart = (bandIndex / 5) * Math.PI * 0.8 + Math.PI * 0.1;
        const bandEnd = ((bandIndex + 1) / 5) * Math.PI * 0.8 + Math.PI * 0.1;
        const bandCenter = (bandStart + bandEnd) / 2;

        group.forEach((item, idx) => {
          // Spread items around the longitude (theta) within their band
          const theta = (idx / group.length) * Math.PI * 2;

          // Slight variation within the band's latitude
          const phiVariation = (Math.random() - 0.5) * 0.15;
          const phi = bandCenter + phiVariation;

          // Add slight randomness for organic feel
          const seed = item.path.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
          const random = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return (x - Math.floor(x) - 0.5) * 0.3;
          };

          const r = radius + random(1) * 1.5;

          result.push({
            ...item,
            position: [
              r * Math.sin(phi) * Math.cos(theta) + random(2) * 0.5,
              r * Math.cos(phi) + random(3) * 0.5,
              r * Math.sin(phi) * Math.sin(theta) + random(4) * 0.5,
            ] as [number, number, number],
            height: Math.max(0.6, Math.log(item.size || 2) * 0.8),
            alphaBand: ALPHA_BANDS[bandIndex],
          });
        });
      });

      return result;
    };

    return sphereLayout(allItems, sphereRadius);
  }, [files, currentPath]);

  if (!supported) {
    return null;
  }

  return (
    <div className="three-wrapper">
      <div className="three-topbar">
        <div className="nav-title" onClick={() => onSelectPath('/')}>
          File Atelier · {currentPath || '/'}
        </div>
        <div className="search-container">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search files and content…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(e.target.value.length > 0);
            }}
            onFocus={() => setShowResults(search.length > 0)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
          />
          <span className="search-shortcut">⌘K</span>
          <div className={`search-results ${showResults ? 'active' : ''}`}>
            {searchResults.length > 0 && searchResults.map((item) => (
              <div
                key={item.path}
                className="search-result-item"
                onClick={() => {
                  setShowResults(false);
                  setSelectedFile(item);
                }}
              >
                <div className="result-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                </div>
                <div className="result-info">
                  <div className="result-name">{item.name}</div>
                  <div className="result-meta">
                    {item.category && <span>{item.category} · </span>}
                    {item.description ? item.description.substring(0, 60) + '...' : item.name}
                  </div>
                </div>
              </div>
            ))}
            {search && searchResults.length === 0 && (
              <div className="search-empty">No matches</div>
            )}
          </div>
        </div>
      </div>
      <Canvas
        camera={{
          position: [0, layout.length > 30 ? 35 : layout.length > 15 ? 28 : 22, layout.length > 30 ? 40 : layout.length > 15 ? 32 : 25],
          fov: 50
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#FAFAF8');
        }}
      >
        <color attach="background" args={['#FAFAF8']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 12, 8]} intensity={0.6} />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <gridHelper args={[40, 20, '#E0DDD5', '#ECEAE4']} position={[0, -0.01, 0]} />

          {/* Glass sphere with elegant depth */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[layout.length > 0 ? 15 - currentPath.split('/').filter(Boolean).length * 2 : 15, 48, 48]} />
            <meshPhysicalMaterial
              color="#F0EFE9"
              transparent={true}
              opacity={0.2}
              metalness={0.05}
              roughness={0.2}
              clearcoat={1}
              clearcoatRoughness={0.1}
              transmission={0.4}
              thickness={0.8}
              envMapIntensity={0.8}
              side={2}
            />
          </mesh>

          {/* Refined wireframe overlay - forest green accent */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[layout.length > 0 ? 15.1 - currentPath.split('/').filter(Boolean).length * 2 : 15.1, 32, 24]} />
            <meshBasicMaterial
              color="#1B4332"
              wireframe={true}
              transparent={true}
              opacity={0.15}
            />
          </mesh>

          <group>
            <mesh
              position={[0, 0, 0]}
              onClick={() => {
                onSelectPath('/');
                focusRef.current = '/';
              }}
            >
              <cylinderGeometry args={[1.2, 1.2, 0.4, 32]} />
              <meshStandardMaterial color="#1A1A1A" metalness={0.1} roughness={0.8} />
            </mesh>
            <Html position={[0, 1.2, 0]} center zIndexRange={[0, 0]}>
              <div className="three-label root">Root</div>
            </Html>
          </group>

          {layout.map((node) => {
            const isDir = node.type === 'directory';
            const ext = node.name.split('.').pop()?.toLowerCase() || '';
            const isHTML = ext === 'html' || ext === 'htm';
            const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
            const isDoc = ['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext);
            const isCode = ['js', 'ts', 'tsx', 'jsx', 'py', 'css', 'json'].includes(ext);
            const showLabel = layout.length <= 15 || hovered === node.path;
            const stemHeight = 1.8;

            // Use alphabetical band color, with directory override
            const baseColor = isDir ? '#1A1A1A' : node.alphaBand.color;
            const hoverColor = isDir ? '#333' : node.alphaBand.lightColor;

            return (
              <group
                key={node.path}
                position={node.position}
                onClick={() => {
                  if (isDir) {
                    onSelectPath(node.path);
                    focusRef.current = node.path;
                  } else {
                    const fileNode = files.find(f => f.path === node.path);
                    if (fileNode) {
                      setSelectedFile(fileNode);
                    }
                  }
                }}
                onPointerOver={() => setHovered(node.path)}
                onPointerOut={() => setHovered(null)}
              >
                {/* Different shapes for different file types */}
                <mesh rotation={isHTML ? [0, Math.PI / 4, Math.PI / 4] : isDir ? [0, Math.PI / 4, 0] : [0, 0, 0]}>
                  {isDir ? (
                    <octahedronGeometry args={[0.7, 0]} />
                  ) : isHTML ? (
                    <tetrahedronGeometry args={[0.55, 0]} />
                  ) : isImage ? (
                    <cylinderGeometry args={[0.45, 0.45, 0.3, 8]} />
                  ) : isDoc ? (
                    <boxGeometry args={[0.55, 0.65, 0.1]} />
                  ) : isCode ? (
                    <icosahedronGeometry args={[0.45, 0]} />
                  ) : (
                    <sphereGeometry args={[0.4, 8, 8]} />
                  )}
                  <meshStandardMaterial
                    color={hovered === node.path ? hoverColor : baseColor}
                    metalness={0.2}
                    roughness={0.5}
                  />
                </mesh>
                {/* Stem line extending outward from shape */}
                {showLabel && (
                  <mesh position={[0, stemHeight / 2 + 0.3, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, stemHeight, 6]} />
                    <meshBasicMaterial color={hovered === node.path ? hoverColor : '#AAA'} />
                  </mesh>
                )}
                {/* Label at end of stem - only show on hover when many files */}
                {showLabel && (
                  <Html position={[0, stemHeight + 0.8, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
                    <div
                      className={`three-label ${hovered === node.path ? 'hovered' : ''}`}
                      style={{ borderLeftColor: node.alphaBand.color, borderLeftWidth: 3 }}
                    >
                      <div className="label-name">{node.name}</div>
                    </div>
                  </Html>
                )}
              </group>
            );
          })}
        </Suspense>
        <OrbitControls enablePan enableRotate enableZoom />
      </Canvas>

      {/* Alphabet legend */}
      {layout.length > 0 && (
        <div className="alpha-legend">
          {ALPHA_BANDS.map((band) => (
            <div key={band.range} className="alpha-legend-item">
              <span className="alpha-dot" style={{ background: band.color }} />
              <span className="alpha-range">{band.range}</span>
            </div>
          ))}
        </div>
      )}

      <FileModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onOpen={(path) => {
          setSelectedFile(null);
          onOpenFile(path);
        }}
      />
    </div>
  );
};
