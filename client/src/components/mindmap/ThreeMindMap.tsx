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
    const polar = (items: FileNode[], radius: number) =>
      items.map((item, idx) => {
        const angle = (idx / Math.max(items.length, 1)) * Math.PI * 2;
        return {
          ...item,
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle * 0.4),
            Math.sin(angle) * radius,
          ] as [number, number, number],
          height: Math.max(0.6, Math.log(item.size || 2)),
        };
      });
    return {
      roots: polar(dirs, 8),
      leaves: polar(docs, 14),
    };
  }, [files]);

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
        camera={{ position: [0, 8, 16], fov: 45 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f6f2ea');
        }}
      >
        <color attach="background" args={['#f6f2ea']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <gridHelper args={[40, 20, '#d9d2c5', '#e7e0d2']} position={[0, -0.01, 0]} />
          <group>
            <mesh
              position={[0, 0, 0]}
              onClick={() => {
                onSelectPath('/');
                focusRef.current = '/';
              }}
            >
              <cylinderGeometry args={[1.2, 1.2, 0.4, 32]} />
              <meshStandardMaterial color="#0e0c0a" />
            </mesh>
            <Html position={[0, 1.2, 0]} center>
              <div className="three-label root">Root</div>
            </Html>
          </group>

          {layout.roots.map((node) => (
            <group
              key={node.path}
              position={node.position}
              onClick={() => {
                onSelectPath(node.path);
                focusRef.current = node.path;
              }}
              onPointerOver={() => setHovered(node.path)}
              onPointerOut={() => setHovered(null)}
            >
              <mesh>
                <boxGeometry args={[1.4, node.height, 1.4]} />
                <meshStandardMaterial
                  color={focused === node.path || hovered === node.path ? '#14524b' : '#202020'}
                />
              </mesh>
              <Html position={[0, node.height / 2 + 0.8, 0]} center>
                <div className="three-label">
                  <div className="label-name">{node.name}</div>
                  <div className="label-meta">dir</div>
                </div>
              </Html>
            </group>
          ))}

          {layout.leaves.map((node) => (
            <group
              key={node.path}
              position={node.position}
              onClick={() => {
                const fileNode = files.find(f => f.path === node.path);
                if (fileNode) {
                  setSelectedFile(fileNode);
                }
              }}
              onPointerOver={() => setHovered(node.path)}
              onPointerOut={() => setHovered(null)}
            >
              <mesh>
                <boxGeometry args={[1.1, node.height * 0.8, 1.1]} />
                <meshStandardMaterial
                  color={hovered === node.path ? '#e26d5c' : '#3b3b3b'}
                />
              </mesh>
              <Html position={[0, node.height * 0.4 + 0.7, 0]} center>
                <div className="three-label">
                  <div className="label-name">{node.name}</div>
                  <div className="label-meta">
                    {node.category || 'file'}
                  </div>
                </div>
              </Html>
            </group>
          ))}
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
