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
    const allItems = [...dirs, ...docs];

    // Fibonacci sphere layout - evenly distributed points on sphere surface
    const sphereLayout = (items: FileNode[], radius: number) => {
      const goldenRatio = (1 + Math.sqrt(5)) / 2;

      return items.map((item, idx) => {
        // Fibonacci spiral distribution
        const i = idx + 0.5;
        const phi = Math.acos(1 - 2 * i / items.length);
        const theta = 2 * Math.PI * i / goldenRatio;

        // Add slight randomness based on file path for variety
        const seed = item.path.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const random = (offset: number) => {
          const x = Math.sin(seed + offset) * 10000;
          return (x - Math.floor(x) - 0.5) * 0.2; // Small variation
        };

        const r = radius + random(1) * 2;

        return {
          ...item,
          position: [
            r * Math.sin(phi) * Math.cos(theta) + random(2),
            r * Math.cos(phi) + random(3),
            r * Math.sin(phi) * Math.sin(theta) + random(4),
          ] as [number, number, number],
          height: Math.max(0.6, Math.log(item.size || 2) * 0.8),
        };
      });
    };

    // Determine depth based on current path - closer when deeper
    const pathDepth = currentPath.split('/').filter(Boolean).length;
    const sphereRadius = 15 - pathDepth * 2;

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
        camera={{ position: [0, 8, 18], fov: 42 }}
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
            <Html position={[0, 1.2, 0]} center>
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
                {/* Different shapes for different file types - LARGER */}
                <mesh rotation={isHTML ? [0, Math.PI / 4, Math.PI / 4] : isDir ? [0, Math.PI / 4, 0] : [0, 0, 0]}>
                  {isDir ? (
                    <octahedronGeometry args={[0.6, 0]} />
                  ) : isHTML ? (
                    <tetrahedronGeometry args={[0.5, 0]} />
                  ) : isImage ? (
                    <cylinderGeometry args={[0.4, 0.4, 0.25, 8]} />
                  ) : isDoc ? (
                    <boxGeometry args={[0.5, 0.6, 0.08]} />
                  ) : isCode ? (
                    <icosahedronGeometry args={[0.4, 0]} />
                  ) : (
                    <sphereGeometry args={[0.35, 8, 8]} />
                  )}
                  <meshStandardMaterial
                    color={
                      hovered === node.path ? '#2D6A4F' :
                      isDir ? '#1A1A1A' :
                      isHTML ? '#1B4332' :
                      isImage ? '#6B5B7A' :
                      isDoc ? '#8B7355' :
                      isCode ? '#2D6A4F' :
                      '#5A5652'
                    }
                    metalness={0.15}
                    roughness={0.6}
                  />
                </mesh>
                {/* Always show labels */}
                <Html position={[0, 0.7, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
                  <div className={`three-label ${hovered === node.path ? 'hovered' : ''}`}>
                    <div className="label-name">{node.name}</div>
                  </div>
                </Html>
              </group>
            );
          })}
        </Suspense>
        <OrbitControls enablePan enableRotate enableZoom />
      </Canvas>

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
