import { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { FileNode } from '../../types';
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

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setSupported(false);
      onFallback?.();
    }
  }, [onFallback]);

  const layout = useMemo(() => {
    const dirs = files.filter((f) => f.type === 'directory');
    const docs = files.filter((f) => f.type === 'file');
    const polar = (items: FileNode[], radius: number, yOffset = 0) =>
      items.map((item, idx) => {
        const angle = (idx / Math.max(items.length, 1)) * Math.PI * 2;
        return {
          ...item,
          position: [
            Math.cos(angle) * radius,
            yOffset + Math.sin(angle * 0.5) * 2,
            Math.sin(angle) * radius,
          ] as [number, number, number],
          height: Math.max(0.6, Math.log(item.size || 2)),
        };
      });
    return {
      roots: polar(dirs, 6, 0),
      leaves: polar(docs, 10, -1),
    };
  }, [files]);

  if (!supported) {
    return null;
  }

  return (
    <div className="three-wrapper">
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
              onClick={() => onOpenFile(node.path)}
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
                  <div className="label-meta">file</div>
                </div>
              </Html>
            </group>
          ))}
        </Suspense>
        <OrbitControls enablePan enableRotate enableZoom />
      </Canvas>
    </div>
  );
};
