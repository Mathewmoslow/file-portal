import { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { FileNode } from '../../types';
import { api } from '../../services/api';
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
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
    const runSearch = async () => {
      const term = search.trim().toLowerCase();
      if (term.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const matches: FileNode[] = [];
        const textFiles = files.filter((f) => f.type === 'file');
        for (const f of textFiles) {
          try {
            const data = await api.readFile(f.path);
            const content = data.isBinary ? '' : data.content.toLowerCase();
            if (f.name.toLowerCase().includes(term) || content.includes(term)) {
              matches.push(f);
            }
          } catch {
            // ignore read errors
          }
        }
        setSearchResults(matches);
      } finally {
        setSearchLoading(false);
      }
    };
    runSearch();
  }, [search, files]);

  const layout = useMemo(() => {
    const now = Date.now();
    const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
    const dirs = files.filter((f) => f.type === 'directory');
    const docs = files.filter((f) => f.type === 'file');

    const recent = docs
      .filter((f) => f.modified && now - new Date(f.modified).getTime() < sixMonthsMs)
      .slice(0, 12);
    const large = docs.filter((f) => (f.size || 0) > 300000).slice(0, 12);
    const unused = docs.filter((f) => f.modified && now - new Date(f.modified).getTime() >= sixMonthsMs).slice(0, 12);
    const byType = {
      Images: docs.filter((f) => /\.(png|jpe?g|gif|svg)$/i.test(f.name)).slice(0, 12),
      Documents: docs.filter((f) => /\.(md|txt|docx?|pdf)$/i.test(f.name)).slice(0, 12),
      Code: docs.filter((f) => /\.(ts|tsx|js|jsx|json|css|html)$/i.test(f.name)).slice(0, 12),
      Media: docs.filter((f) => /\.(mp3|wav|mp4|mov)$/i.test(f.name)).slice(0, 12),
    };
    const duplicates: FileNode[] = [];
    const nameMap = new Map<string, FileNode[]>();
    docs.forEach((f) => {
      const base = f.name.toLowerCase();
      nameMap.set(base, [...(nameMap.get(base) || []), f]);
    });
    nameMap.forEach((arr) => {
      if (arr.length > 1) duplicates.push(...arr);
    });

    const groups: { label: string; nodes: FileNode[]; offset: [number, number] }[] = [
      { label: 'Recent', nodes: recent, offset: [-12, 0] },
      { label: 'Large', nodes: large, offset: [12, 0] },
      { label: 'Unused', nodes: unused, offset: [0, 10] },
      { label: 'Duplicates', nodes: duplicates, offset: [0, -10] },
      { label: 'Images', nodes: byType.Images, offset: [-12, -10] },
      { label: 'Documents', nodes: byType.Documents, offset: [12, -10] },
      { label: 'Code', nodes: byType.Code, offset: [-12, 10] },
      { label: 'Media', nodes: byType.Media, offset: [12, 10] },
    ];

    const positionedGroups = groups.map((group, gi) => {
      const nodes = group.nodes.map((item, idx) => {
        const angle = (idx / Math.max(group.nodes.length, 1)) * Math.PI * 2;
        return {
          ...item,
          position: [
            group.offset[0] + Math.cos(angle) * 3,
            Math.sin(angle * 0.5),
            group.offset[1] + Math.sin(angle) * 3,
          ] as [number, number, number],
          height: Math.max(0.6, Math.log(item.size || 2)),
        };
      });
      return { ...group, nodes };
    });

    return { roots: dirs, groups: positionedGroups };
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
            {searchLoading && <div className="search-empty">Searching…</div>}
            {!searchLoading &&
              (searchResults.length > 0 ? searchResults : []).map((item) => (
                <div
                  key={item.path}
                  className="search-result-item"
                  onClick={() => {
                    setShowResults(false);
                    onOpenFile(item.path);
                  }}
                >
                  <div className="result-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    </svg>
                  </div>
                  <div className="result-info">
                    <div className="result-name">{item.name}</div>
                    <div className="result-meta">{item.type}</div>
                  </div>
                </div>
              ))}
            {!searchLoading && search && searchResults.length === 0 && (
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

          {layout.groups.map((group) => (
            <group key={group.label}>
              <Html position={[group.offset[0], 0.4, group.offset[1]]} center>
                <div className="three-label root">{group.label}</div>
              </Html>
              {group.nodes.map((node) => (
                <group
                  key={node.path}
                  position={node.position}
                  onClick={() =>
                    node.type === 'directory'
                      ? onSelectPath(node.path)
                      : onOpenFile(node.path)
                  }
                  onPointerOver={() => setHovered(node.path)}
                  onPointerOut={() => setHovered(null)}
                >
                  <mesh>
                    <boxGeometry args={[1.2, node.height, 1.2]} />
                    <meshStandardMaterial
                      color={
                        node.type === 'directory'
                          ? focused === node.path || hovered === node.path
                            ? '#14524b'
                            : '#202020'
                          : hovered === node.path
                          ? '#e26d5c'
                          : '#3b3b3b'
                      }
                    />
                  </mesh>
                  <Html position={[0, node.height / 2 + 0.7, 0]} center>
                    <div className="three-label">
                      <div className="label-name">{node.name}</div>
                      <div className="label-meta">{node.type}</div>
                    </div>
                  </Html>
                </group>
              ))}
            </group>
          ))}
        </Suspense>
        <OrbitControls enablePan enableRotate enableZoom />
      </Canvas>
    </div>
  );
};
